#!/usr/bin/env python3
"""
Script untuk generate tree.js dari data silsilah.
Dijalankan otomatis oleh GitHub Actions setiap ada perubahan data.
"""

import json
import os
import sys

def load_json(path, default):
    if os.path.exists(path):
        with open(path, 'r', encoding='utf-8') as f:
            return json.load(f)
    return default

def save_js(tree_data, output_path='tree.js'):
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write('const TREE=')
        json.dump(tree_data, f, ensure_ascii=False, separators=(',', ':'))
        f.write(';')
    print(f"✅ tree.js berhasil digenerate ({os.path.getsize(output_path):,} bytes)")

def apply_approved_submissions(tree_data, approved):
    """Terapkan semua submission yang sudah diapprove ke tree data."""
    
    # Build flat index
    node_map = {}
    def index_nodes(node):
        node_map[node['id']] = node
        for c in node.get('c', []):
            index_nodes(c)
    
    for anc in tree_data.get('ancestors', []):
        index_nodes(anc)
    index_nodes(tree_data['sebil'])
    
    # Find node by name
    def find_by_name(name, node=None, results=None):
        if results is None:
            results = []
        if node is None:
            for anc in tree_data.get('ancestors', []):
                find_by_name(name, anc, results)
            find_by_name(name, tree_data['sebil'], results)
            return results
        if node.get('n', '').lower() == name.lower():
            results.append(node)
        for c in node.get('c', []):
            find_by_name(name, c, results)
        return results
    
    # Get next ID
    all_ids = list(node_map.keys())
    next_id = max(all_ids) + 1 if all_ids else 10000
    
    applied = 0
    skipped = 0
    
    for sub in approved:
        tipe = sub.get('tipe', '')
        nama = sub.get('nama', '').strip()
        
        if not nama:
            skipped += 1
            continue
        
        if tipe == 'TAMBAH_ANAK':
            # Cari orang tua
            nama_ortu = sub.get('namaOrangTua', '').split(' + ')[0].strip()
            parents = find_by_name(nama_ortu)
            if not parents:
                print(f"⚠️  Orang tua '{nama_ortu}' tidak ditemukan untuk '{nama}'")
                skipped += 1
                continue
            parent = parents[0]
            
            # Buat node baru
            new_node = {
                'id': next_id,
                'n': nama,
                's': sub.get('pasangan') or None,
                'g': parent.get('g', 5) + 1,
                'w': parent.get('w'),
                'note': sub.get('catatan') or None,
                'c': []
            }
            parent.setdefault('c', []).append(new_node)
            node_map[next_id] = new_node
            next_id += 1
            applied += 1
            print(f"✅ Ditambahkan: {nama} (anak dari {nama_ortu})")
        
        elif tipe == 'UPDATE':
            nama_asli = sub.get('namaAsli', '').strip()
            nodes = find_by_name(nama_asli)
            if not nodes:
                print(f"⚠️  Node '{nama_asli}' tidak ditemukan untuk update")
                skipped += 1
                continue
            node = nodes[0]
            node['n'] = nama
            if sub.get('pasangan'):
                node['s'] = sub['pasangan']
            if sub.get('catatan'):
                node['note'] = sub['catatan']
            applied += 1
            print(f"✅ Diupdate: {nama_asli} → {nama}")
        
        elif tipe == 'HAPUS':
            nama_hapus = sub.get('namaAsli', nama).strip()
            nodes = find_by_name(nama_hapus)
            if not nodes:
                print(f"⚠️  Node '{nama_hapus}' tidak ditemukan untuk dihapus")
                skipped += 1
                continue
            node = nodes[0]
            # Remove from parent
            def remove_from_parent(target_id, parent_node):
                if 'c' in parent_node:
                    parent_node['c'] = [c for c in parent_node['c'] if c['id'] != target_id]
                    for c in parent_node['c']:
                        remove_from_parent(target_id, c)
            for anc in tree_data.get('ancestors', []):
                remove_from_parent(node['id'], anc)
            remove_from_parent(node['id'], tree_data['sebil'])
            applied += 1
            print(f"✅ Dihapus: {nama_hapus}")
    
    print(f"\n📊 Hasil: {applied} diterapkan, {skipped} dilewati")
    return tree_data

def main():
    print("🌳 Memulai generate tree.js...")
    
    # Load base tree data (dari tree.js yang ada)
    # Kita baca tree.js dan extract JSON-nya
    if not os.path.exists('tree.js'):
        print("❌ tree.js tidak ditemukan!")
        sys.exit(1)
    
    with open('tree.js', 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Extract JSON dari "const TREE=...;"
    json_str = content[len('const TREE='):-1]
    tree_data = json.loads(json_str)
    print(f"✅ tree.js dimuat ({len(json_str):,} chars)")
    
    # Load approved submissions
    approved = load_json('data/approved.json', [])
    print(f"📋 Ditemukan {len(approved)} submission yang diapprove")
    
    if approved:
        tree_data = apply_approved_submissions(tree_data, approved)
        
        # Clear approved after applying (move to archive)
        archive = load_json('data/archive.json', [])
        archive.extend(approved)
        os.makedirs('data', exist_ok=True)
        with open('data/archive.json', 'w', encoding='utf-8') as f:
            json.dump(archive, f, ensure_ascii=False, indent=2)
        with open('data/approved.json', 'w', encoding='utf-8') as f:
            json.dump([], f)
        print(f"📦 {len(approved)} submission diarsipkan")
    
    # Count nodes
    def count_nodes(node):
        return 1 + sum(count_nodes(c) for c in node.get('c', []))
    
    total = sum(count_nodes(a) for a in tree_data.get('ancestors', []))
    total += count_nodes(tree_data['sebil'])
    print(f"👥 Total anggota: {total:,}")
    
    # Save tree.js
    save_js(tree_data)
    print("🎉 Selesai!")

if __name__ == '__main__':
    main()
