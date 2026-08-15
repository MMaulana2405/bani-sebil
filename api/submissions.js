// Vercel API: Admin load daftar submissions pending dari Supabase
// GET /api/submissions
const { createClient } = require('@supabase/supabase-js');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-password');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  if (req.headers['x-admin-password'] !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

  try {
    const { data, error } = await supabase
      .from('submissions')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true });

    if (error) throw error;

    // Map to frontend format
    const mapped = (data || []).map(s => ({
      id: s.id,
      tipe: s.tipe,
      nama: s.nama,
      namaAsli: s.nama_asli,
      pasangan: s.pasangan,
      jk: s.jk,
      tglLahir: s.tgl_lahir,
      tmptLahir: s.tmpt_lahir,
      hp: s.hp,
      alamat: s.alamat,
      catatan: s.catatan,
      fotoUrl: s.foto_url,
      namaOrangTua: s.nama_ortu,
      timestamp: s.created_at
    }));

    return res.status(200).json({ success: true, data: mapped });
  } catch (err) {
    console.error('submissions API error:', err);
    return res.status(500).json({ error: err.message });
  }
};