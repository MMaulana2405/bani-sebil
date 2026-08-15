// Vercel Serverless Function: Admin approve/reject submission

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Verify admin password
  const adminPw = req.headers['x-admin-password'];
  if (adminPw !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const token = process.env.GITHUB_TOKEN;
  const owner = process.env.GITHUB_OWNER || 'MMaulana2405';
  const repo  = process.env.GITHUB_REPO  || 'bani-sebil';

  const { action, item } = req.body; // action: 'approve' | 'reject'
  if (!action || !item) return res.status(400).json({ error: 'Missing action or item' });

  try {
    const baseUrl = `https://api.github.com/repos/${owner}/${repo}/contents/data`;
    const headers = {
      'Authorization': `token ${token}`,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json'
    };

    // Helper: get file with SHA
    async function getFile(filename) {
      const r = await fetch(`${baseUrl}/${filename}?t=${Date.now()}`, { headers });
      const d = await r.json();
      const content = JSON.parse(Buffer.from(d.content, 'base64').toString('utf-8'));
      return { content, sha: d.sha };
    }

    // Helper: update file
    async function updateFile(filename, content, sha, message) {
      const r = await fetch(`${baseUrl}/${filename}`, {
        method: 'PUT', headers,
        body: JSON.stringify({
          message,
          content: Buffer.from(JSON.stringify(content, null, 2)).toString('base64'),
          sha
        })
      });
      if (!r.ok) { const e = await r.json(); throw new Error(e.message); }
      return r.json();
    }

    // 1. Remove from submissions.json
    const { content: subs, sha: subsSha } = await getFile('submissions.json');
    const newSubs = subs.filter(s => (s.id || s.timestamp) !== (item.id || item.timestamp));
    await updateFile('submissions.json', newSubs, subsSha, `Remove processed: ${item.nama}`);

    if (action === 'approve') {
      // 2. Add to approved.json (triggers GitHub Actions)
      const { content: approved, sha: approvedSha } = await getFile('approved.json');
      approved.push(item);
      await updateFile('approved.json', approved, approvedSha, `Approved: ${item.nama} [${new Date().toLocaleString('id-ID')}]`);
      
      return res.status(200).json({ 
        success: true, 
        message: `${item.nama} disetujui! Pohon akan update dalam ~2 menit.` 
      });
    } else {
      return res.status(200).json({ success: true, message: 'Permintaan ditolak.' });
    }

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
