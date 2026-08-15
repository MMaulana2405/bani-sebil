// Vercel API: Anggota submit permintaan → simpan ke Supabase
// POST /api/submit
const { createClient } = require('@supabase/supabase-js');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

  try {
    const body = req.body;
    if (!body || !body.nama) return res.status(400).json({ error: 'Nama tidak boleh kosong' });

    const { error } = await supabase.from('submissions').insert({
      tipe: body.tipe || 'TAMBAH_BARU',
      nama: body.nama,
      nama_asli: body.namaAsli || null,
      pasangan: body.pasangan || null,
      jk: body.jk || null,
      tgl_lahir: body.tglLahir || null,
      tmpt_lahir: body.tmptLahir || null,
      hp: body.hp || null,
      alamat: body.alamat || null,
      catatan: body.catatan || null,
      foto_url: body.fotoUrl || null,
      nama_ortu: body.namaOrangTua || null,
      status: 'pending'
    });

    if (error) throw error;
    return res.status(200).json({ success: true, message: 'Permintaan berhasil dikirim!' });
  } catch (err) {
    console.error('submit API error:', err);
    return res.status(500).json({ error: err.message });
  }
};