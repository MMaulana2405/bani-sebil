// Vercel API: Admin approve/reject submission → update Supabase langsung
// POST /api/approve
const { createClient } = require('@supabase/supabase-js');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-password');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  if (req.headers['x-admin-password'] !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
  const { action, item } = req.body;
  if (!action || !item) return res.status(400).json({ error: 'Missing action or item' });

  try {
    if (action === 'reject') {
      // Tandai sebagai rejected di Supabase
      await supabase.from('submissions').update({ status: 'rejected' }).eq('id', item.id);
      return res.status(200).json({ success: true, message: 'Permintaan ditolak.' });
    }

    if (action === 'approve') {
      const tipe = item.tipe;

      if (tipe === 'TAMBAH_ANAK' && item.namaOrangTua) {
        // Cari parent node
        const parentName = item.namaOrangTua.split(' + ')[0].trim();
        const { data: parents } = await supabase
          .from('nodes').select('id, generasi, wife_group')
          .ilike('nama', parentName).limit(1);

        if (!parents || parents.length === 0) {
          return res.status(404).json({ error: 'Orang tua "'+parentName+'" tidak ditemukan di database' });
        }

        const parent = parents[0];

        // Insert node baru
        const { data: newNode, error: insertErr } = await supabase
          .from('nodes').insert({
            parent_id: parent.id,
            nama: item.nama,
            pasangan: item.pasangan || null,
            generasi: parent.generasi + 1,
            wife_group: parent.wife_group,
            catatan: item.catatan || null,
            foto_url: item.fotoUrl || null,
            jk: item.jk || null,
            tgl_lahir: item.tglLahir || null,
            tmpt_lahir: item.tmptLahir || null,
            hp: item.hp || null,
            alamat: item.alamat || null
          }).select().single();

        if (insertErr) throw insertErr;

        // Tandai submission sebagai approved
        await supabase.from('submissions').update({ status: 'approved' }).eq('id', item.id);

        return res.status(200).json({
          success: true,
          message: item.nama + ' berhasil ditambahkan ke pohon silsilah!',
          newNodeId: newNode.id
        });

      } else if (tipe === 'UPDATE' && item.namaAsli) {
        // Cari node yang akan diupdate
        const { data: existing } = await supabase
          .from('nodes').select('id').ilike('nama', item.namaAsli).limit(1);

        if (!existing || existing.length === 0) {
          return res.status(404).json({ error: 'Node "'+item.namaAsli+'" tidak ditemukan' });
        }

        const updateData = { nama: item.nama };
        if (item.pasangan !== undefined) updateData.pasangan = item.pasangan || null;
        if (item.catatan) updateData.catatan = item.catatan;
        if (item.fotoUrl) updateData.foto_url = item.fotoUrl;
        if (item.jk) updateData.jk = item.jk;
        if (item.tglLahir) updateData.tgl_lahir = item.tglLahir;
        if (item.tmptLahir) updateData.tmpt_lahir = item.tmptLahir;
        if (item.hp) updateData.hp = item.hp;
        if (item.alamat) updateData.alamat = item.alamat;

        const { error: updateErr } = await supabase
          .from('nodes').update(updateData).eq('id', existing[0].id);

        if (updateErr) throw updateErr;

        await supabase.from('submissions').update({ status: 'approved' }).eq('id', item.id);

        return res.status(200).json({
          success: true,
          message: item.namaAsli + ' berhasil diupdate!'
        });

      } else if (tipe === 'HAPUS') {
        const namaHapus = item.namaAsli || item.nama;
        const { data: existing } = await supabase
          .from('nodes').select('id').ilike('nama', namaHapus).limit(1);

        if (!existing || existing.length === 0) {
          return res.status(404).json({ error: 'Node "'+namaHapus+'" tidak ditemukan' });
        }

        // Delete node (CASCADE akan hapus semua keturunan)
        const { error: deleteErr } = await supabase
          .from('nodes').delete().eq('id', existing[0].id);

        if (deleteErr) throw deleteErr;

        await supabase.from('submissions').update({ status: 'approved' }).eq('id', item.id);

        return res.status(200).json({
          success: true,
          message: '"'+namaHapus+'" berhasil dihapus dari database!'
        });
      }

      return res.status(400).json({ error: 'Tipe tidak dikenal: ' + tipe });
    }

    return res.status(400).json({ error: 'Action tidak valid: ' + action });

  } catch (err) {
    console.error('approve API error:', err);
    return res.status(500).json({ error: err.message });
  }
};
