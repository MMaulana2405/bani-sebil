// Vercel API: Load data pohon silsilah dari Supabase
// GET /api/tree — dengan pagination untuk load semua data (>1000 rows)
const { createClient } = require('@supabase/supabase-js');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

  try {
    // Load semua nodes dengan pagination (Supabase default limit = 1000)
    const PAGE_SIZE = 1000;
    let allNodes = [];
    let page = 0;
    let hasMore = true;

    while (hasMore) {
      const from = page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      const { data, error } = await supabase
        .from('nodes')
        .select('*')
        .order('generasi', { ascending: true })
        .order('id', { ascending: true })
        .range(from, to);

      if (error) throw error;

      if (data && data.length > 0) {
        allNodes = allNodes.concat(data);
        // Jika data yang dikembalikan kurang dari PAGE_SIZE, berarti sudah halaman terakhir
        hasMore = data.length === PAGE_SIZE;
        page++;
      } else {
        hasMore = false;
      }
    }

    console.log(`Loaded ${allNodes.length} nodes from Supabase`);

    // Build tree structure dari flat list
    const nodeMap = {};
    allNodes.forEach(n => {
      nodeMap[n.id] = {
        id: n.id,
        n: n.nama,
        s: n.pasangan || null,
        g: n.generasi,
        w: n.wife_group !== null ? n.wife_group : null,
        note: n.catatan || null,
        foto: n.foto_url || null,
        jk: n.jk || null,
        tglLahir: n.tgl_lahir || null,
        tmptLahir: n.tmpt_lahir || null,
        hp: n.hp || null,
        alamat: n.alamat || null,
        c: []
      };
    });

    // Build parent-child relationships
    allNodes.forEach(n => {
      if (n.parent_id && nodeMap[n.parent_id]) {
        nodeMap[n.parent_id].c.push(nodeMap[n.id]);
      }
    });

    // Separate roots
    const roots = allNodes.filter(n => !n.parent_id).map(n => nodeMap[n.id]);
    const ancestors = roots.filter(n => n.g <= 3).sort((a, b) => a.g - b.g);
    const sebil = roots.find(n => n.g === 4);

    if (!sebil) {
      throw new Error('Bapak Sebil tidak ditemukan di database. Pastikan data sudah diimport.');
    }

    return res.status(200).json({
      success: true,
      data: {
        ancestors,
        sebil,
        wives: ['Ma Jangkung', 'Ma Hideung', 'Ma Aeni'],
        total: allNodes.length
      }
    });

  } catch (err) {
    console.error('tree API error:', err);
    return res.status(500).json({ error: err.message });
  }
};