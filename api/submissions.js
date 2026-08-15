// Vercel Serverless Function: Load submissions untuk admin panel

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  // Verify admin password
  const adminPw = req.headers['x-admin-password'];
  if (adminPw !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const token = process.env.GITHUB_TOKEN;
  const owner = process.env.GITHUB_OWNER || 'MMaulana2405';
  const repo  = process.env.GITHUB_REPO  || 'bani-sebil';

  try {
    const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/data/submissions.json`;
    const getRes = await fetch(apiUrl, {
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Cache-Control': 'no-cache'
      }
    });
    const fileData = await getRes.json();
    let submissions = [];
    try { submissions = JSON.parse(Buffer.from(fileData.content, 'base64').toString('utf-8')); } catch(e) {}
    
    return res.status(200).json({ success: true, data: submissions });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}