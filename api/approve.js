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

  // Helper: get field value - returns null if empty string
  function val(v) { return (v === '' || v === undefined) ? null : v; }

  try {
    // ── REJECT ────────────────────────────────────────────
    if (action === 'reject') {
      await supabase.from('submissions').update({ status: 'rejected' }).eq('id', item.id);
      return res.status(200).json({ success: true, message: 'Permintaan ditolak.' });
    }

    // ── APPROVE ───────────────────────────────────────────
    if (action === 'approve') {
      const tipe = item.tipe;

      // ── TAMBAH ANAK ──────────────────────────────────────
      if (tipe === 'TAMBAH_ANAK' && item.namaOrangTua) {
        const parentName = item.namaOrangTua ? item.namaOrangTua.split(' + ')[0].trim() : '';
        console.log('Looking for parent - ID:', item.parentNodeId, 'Name:', parentName);

        let parents = null;

        // Prioritas 1: Cari by ID (paling akurat, tidak ada duplikat)
        if (item.parentNodeId) {
          const resId = await supabase.from('nodes')
            .select('id, generasi, wife_group, nama')
            .eq('id', item.parentNodeId)
            .limit(1);
          if (resId.data && resId.data.length > 0) {
            parents = resId.data;
            console.log('Found parent by ID:', parents[0].nama);
          }
        }

        // Prioritas 2: Cari by nama jika ID tidak ada/tidak ketemu
        if (!parents || parents.length === 0) {
          const resName = await supabase.from('nodes')
            .select('id, generasi, wife_group, nama')
            .eq('nama', parentName)
            .limit(1);
          if (resName.data && resName.data.length > 0) {
            parents = resName.data;
            console.log('Found parent by exact name:', parents[0].nama);
          }
        }

        // Prioritas 3: Case-insensitive search
        if (!parents || parents.length === 0) {
          const resIlike = await supabase.from('nodes')
            .select('id, generasi, wife_group, nama')
            .ilike('nama', parentName)
            .limit(1);
          parents = resIlike.data;
        }

        if (!parents || parents.length === 0) {
          return res.status(404).json({
            error: 'Orang tua "' + parentName + '" tidak ditemukan di database. Pastikan nama orang tua sudah benar.'
          });
        }
        console.log('Using parent:', parents[0]);

        const parent = parents[0];
        const newId = Date.now() + Math.floor(Math.random() * 1000);

        const { data: newNode, error: insertErr } = await supabase
          .from('nodes')
          .insert({
            id:         newId,
            parent_id:  parent.id,
            nama:       item.nama,
            pasangan:   val(item.pasangan),
            generasi:   parent.generasi + 1,
            wife_group: parent.wife_group,
            catatan:    val(item.catatan),
            foto_url:   val(item.fotoUrl),
            jk:         val(item.jk),
            tgl_lahir:  val(item.tglLahir),
            tmpt_lahir: val(item.tmptLahir),
            hp:         val(item.hp),
            alamat:     val(item.alamat)
          })
          .select()
          .single();

        if (insertErr) throw insertErr;

        await supabase.from('submissions').update({ status: 'approved' }).eq('id', item.id);

        return res.status(200).json({
          success: true,
          message: '✅ ' + item.nama + ' berhasil ditambahkan ke pohon silsilah!',
          newNodeId: newNode.id
        });

      // ── UPDATE ────────────────────────────────────────────
      } else if (tipe === 'UPDATE' && item.namaAsli) {
        let existing = null;

        // Prioritas 1: Cari by ID (paling akurat)
        if (item.nodeId) {
          const resId = await supabase.from('nodes').select('id').eq('id', item.nodeId).limit(1);
          if (resId.data && resId.data.length > 0) existing = resId.data;
        }

        // Prioritas 2: Cari by nama asli
        if (!existing || existing.length === 0) {
          const resName = await supabase.from('nodes').select('id').eq('nama', item.namaAsli).limit(1);
          if (resName.data && resName.data.length > 0) existing = resName.data;
        }

        // Prioritas 3: Case-insensitive
        if (!existing || existing.length === 0) {
          const resIlike = await supabase.from('nodes').select('id').ilike('nama', item.namaAsli).limit(1);
          existing = resIlike.data;
        }

        if (!existing || existing.length === 0) {
          return res.status(404).json({ error: 'Node "' + item.namaAsli + '" tidak ditemukan' });
        }

        // Selalu update semua field yang dikirim
        // Gunakan 'field' in item untuk bedakan "tidak dikirim" vs "sengaja dikosongkan/dihapus"
        const updateData = { nama: item.nama };
        if ('pasangan'   in item) updateData.pasangan   = val(item.pasangan);
        if ('catatan'    in item) updateData.catatan     = val(item.catatan);
        if ('fotoUrl'    in item) updateData.foto_url    = val(item.fotoUrl);
        if ('jk'         in item) updateData.jk          = val(item.jk);
        if ('tglLahir'   in item) updateData.tgl_lahir   = val(item.tglLahir);
        if ('tmptLahir'  in item) updateData.tmpt_lahir  = val(item.tmptLahir);
        if ('hp'         in item) updateData.hp          = val(item.hp);
        if ('alamat'     in item) updateData.alamat      = val(item.alamat);

        const { error: updateErr } = await supabase
          .from('nodes')
          .update(updateData)
          .eq('id', existing[0].id);

        if (updateErr) throw updateErr;

        await supabase.from('submissions').update({ status: 'approved' }).eq('id', item.id);

        return res.status(200).json({
          success: true,
          message: '✅ ' + item.namaAsli + ' berhasil diupdate!'
        });

      // ── HAPUS ─────────────────────────────────────────────
      } else if (tipe === 'HAPUS') {
        const namaHapus = item.namaAsli || item.nama;
        let existing = null;

        // Prioritas 1: Cari by ID
        if (item.nodeId) {
          const resId = await supabase.from('nodes').select('id, nama').eq('id', item.nodeId).limit(1);
          if (resId.data && resId.data.length > 0) existing = resId.data;
        }

        // Prioritas 2: Cari by nama
        if (!existing || existing.length === 0) {
          const resName = await supabase.from('nodes').select('id, nama').eq('nama', namaHapus).limit(1);
          if (resName.data && resName.data.length > 0) existing = resName.data;
        }

        // Prioritas 3: Case-insensitive
        if (!existing || existing.length === 0) {
          const resIlike = await supabase.from('nodes').select('id, nama').ilike('nama', namaHapus).limit(1);
          existing = resIlike.data;
        }

        if (!existing || existing.length === 0) {
          return res.status(404).json({ error: 'Node "' + namaHapus + '" tidak ditemukan' });
        }

        // Delete node — CASCADE di schema akan hapus semua keturunan
        const { error: deleteErr } = await supabase
          .from('nodes')
          .delete()
          .eq('id', existing[0].id);

        if (deleteErr) throw deleteErr;

        await supabase.from('submissions').update({ status: 'approved' }).eq('id', item.id);

        return res.status(200).json({
          success: true,
          message: '✅ "' + namaHapus + '" berhasil dihapus dari database!'
        });

      // ── TAMBAH BARU (tanpa orang tua) ─────────────────────
      } else if (tipe === 'TAMBAH_BARU') {
        return res.status(400).json({
          error: 'TAMBAH_BARU memerlukan penempatan manual. Gunakan TAMBAH_ANAK dengan nama orang tua.'
        });

      } else {
        return res.status(400).json({ error: 'Tipe tidak dikenal atau data tidak lengkap: ' + tipe });
      }
    }

    return res.status(400).json({ error: 'Action tidak valid: ' + action });

  } catch (err) {
    console.error('approve API error:', err);
    return res.status(500).json({ error: err.message });
  }
};