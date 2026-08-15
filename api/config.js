// Vercel API: Return Supabase public config untuk Realtime di browser
// GET /api/config
// Hanya return ANON key (public) - aman untuk browser
// Service key TIDAK pernah dikirim ke browser

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'public, s-maxage=3600');
  if (req.method !== 'GET') return res.status(405).end();

  // SUPABASE_ANON_KEY = publishable/anon key (aman untuk browser)
  // Berbeda dengan SUPABASE_SERVICE_KEY yang hanya untuk server
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;

  if (!url || !key) {
    return res.status(500).json({ error: 'Supabase config not set. Add SUPABASE_ANON_KEY to Vercel env vars.' });
  }

  return res.status(200).json({ url, key });
};