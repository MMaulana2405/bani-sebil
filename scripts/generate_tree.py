#!/usr/bin/env python3
"""
Script untuk generate tree.js dari data silsilah + approved submissions.
Dijalankan otomatis oleh GitHub Actions.
"""

import json, os, sys

def load_json(path, default):
    if os.path.exists(path):
        with open(path, 'r', encoding='utf-8') as f:
            try:
                return json.load(f)
            except:
                return default
    return default

def save_tree_js(tree_data, output_path='tree.js'):
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write('const TREE=')
        json.dump(tree_data, f, ensure_ascii=False, separators=(',', ':'))
        f.write(';')
    print(f"tree.js saved ({os.path.getsize(output_path):,} bytes)")

def find_node_by_name(name, node, results=None):
    if results is None:
        results = []
    if node.get('n', '').lower() == name.lower():
        results.append(node)
    for c in node.get('c', []):
        find_node_by_name(name, c, results)
    return results

def find_in_tree(name, tree_data):
    results = []
    for anc in tree_data.get('ancestors', []):
        find_node_by_name(name, anc, results)
    find_node_by_name(name, tree_data['sebil'], results)
    return results

def get_max_id(node, current_max=0):
    current_max = max(current_max, node.get('id', 0))
    for c in node.get('c', []):
        current_max = get_max_id(c, current_max)
    return current_max

def main():
    print("Starting generate_tree.py...")
    
    # Load current tree.js
    if not os.path.exists('tree.js'):
        print("ERROR: tree.js not found!")
        sys.exit(1)
    
    with open('tree.js', 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Extract JSON from "const TREE=...;"
    json_str = content[len('const TREE='):-1]
    tree_data = json.loads(json_str)
    print(f"tree.js loaded successfully")
    
    # Load approved submissions
    approved = load_json('data/approved.json', [])
    print(f"Found {len(approved)} approved submissions")
    
    if not approved:
        print("No approved submissions to process. Done.")
        return
    
    # Get max ID for new nodes
    max_id = get_max_id(tree_data['sebil'])
    for anc in tree_data.get('ancestors', []):
        max_id = max(max_id, get_max_id(anc))
    
    applied = 0
    skipped = []
    
    for sub in approved:
        tipe = sub.get('tipe', '')
        nama = sub.get('nama', '').strip()
        
        if not nama:
            continue
        
        if tipe == 'TAMBAH_ANAK':
            nama_ortu = sub.get('namaOrangTua', '').split(' + ')[0].strip()
            if not nama_ortu:
                skipped.append(f"{nama}: no parent name")
                continue
            
            parents = find_in_tree(nama_ortu, tree_data)
            if not parents:
                skipped.append(f"{nama}: parent '{nama_ortu}' not found")
                continue
            
            parent = parents[0]
            max_id += 1
            new_node = {
                'id': max_id,
                'n': nama,
                's': sub.get('pasangan') or None,
                'g': parent.get('g', 5) + 1,
                'w': parent.get('w'),
                'note': sub.get('catatan') or None,
                'c': []
            }
            parent.setdefault('c', []).append(new_node)
            applied += 1
            print(f"Added: {nama} (child of {nama_ortu})")
        
        elif tipe == 'UPDATE':
            nama_asli = sub.get('namaAsli', '').strip()
            if not nama_asli:
                skipped.append(f"UPDATE: no original name")
                continue
            
            nodes = find_in_tree(nama_asli, tree_data)
            if not nodes:
                skipped.append(f"UPDATE: '{nama_asli}' not found")
                continue
            
            node = nodes[0]
            node['n'] = nama
            if sub.get('pasangan'):
                node['s'] = sub['pasangan']
            if sub.get('catatan'):
                node['note'] = sub['catatan']
            applied += 1
            print(f"Updated: {nama_asli} -> {nama}")
    
    print(f"\nResult: {applied} applied, {len(skipped)} skipped")
    if skipped:
        for s in skipped:
            print(f"  Skipped: {s}")
    
    if applied > 0:
        # Save new tree.js
        save_tree_js(tree_data)
        
        # Clear approved.json after processing
        with open('data/approved.json', 'w', encoding='utf-8') as f:
            json.dump([], f)
        print("approved.json cleared")
    
    print("Done!")

if __name__ == '__main__':
    main()