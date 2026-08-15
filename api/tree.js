// Vercel API: Load data pohon silsilah dari Supabase
// GET /api/tree
const { createClient } = require('@supabase/supabase-js');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

  try {
    const { data: nodes, error } = await supabase
      .from('nodes').select('*')
      .order('generasi', { ascending: true })
      .order('id', { ascending: true });
    if (error) throw error;

    // Build tree from flat list
    const nodeMap = {};
    nodes.forEach(n => {
      nodeMap[n.id] = {
        id: n.id, n: n.nama, s: n.pasangan||null, g: n.generasi,
        w: n.wife_group!==null ? n.wife_group : null,
        note: n.catatan||null, foto: n.foto_url||null,
        jk: n.jk||null, tglLahir: n.tgl_lahir||null,
        tmptLahir: n.tmpt_lahir||null, hp: n.hp||null, alamat: n.alamat||null,
        c: []
      };
    });
    nodes.forEach(n => {
      if (n.parent_id && nodeMap[n.parent_id]) nodeMap[n.parent_id].c.push(nodeMap[n.id]);
    });

    const roots = nodes.filter(n => !n.parent_id).map(n => nodeMap[n.id]);
    const ancestors = roots.filter(n => n.g <= 3).sort((a,b) => a.g - b.g);
    const sebil = roots.find(n => n.g === 4);

    return res.status(200).json({
      success: true,
      data: { ancestors, sebil, wives: ['Ma Jangkung','Ma Hideung','Ma Aeni'], total: nodes.length }
    });
  } catch (err) {
    console.error('tree API error:', err);
    return res.status(500).json({ error: err.message });
  }
};