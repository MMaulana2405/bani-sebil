// Vercel Serverless Function: Handle submission dari anggota
// Token GitHub aman di environment variable Vercel

export default async function handler(req, res) {
  // Allow CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const token = process.env.GITHUB_TOKEN;
  const owner = process.env.GITHUB_OWNER || 'MMaulana2405';
  const repo  = process.env.GITHUB_REPO  || 'bani-sebil';

  if (!token) return res.status(500).json({ error: 'Server not configured' });

  try {
    const payload = req.body;
    if (!payload.nama) return res.status(400).json({ error: 'Nama tidak boleh kosong' });

    // Add metadata
    payload.timestamp = new Date().toISOString();
    payload.id = 'sub_' + Date.now();

    // Get current submissions.json
    const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/data/submissions.json`;
    const getRes = await fetch(apiUrl, {
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });
    const fileData = await getRes.json();
    
    let current = [];
    try { current = JSON.parse(Buffer.from(fileData.content, 'base64').toString('utf-8')); } catch(e) {}
    current.push(payload);

    // Update submissions.json
    const putRes = await fetch(apiUrl, {
      method: 'PUT',
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: `Submission: ${payload.nama} [${new Date().toLocaleString('id-ID')}]`,
        content: Buffer.from(JSON.stringify(current, null, 2)).toString('base64'),
        sha: fileData.sha
      })
    });

    if (!putRes.ok) {
      const err = await putRes.json();
      return res.status(500).json({ error: err.message });
    }

    return res.status(200).json({ success: true, message: 'Permintaan berhasil dikirim!' });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}