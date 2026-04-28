// Public read endpoint. No auth required (matches the previous behaviour
// where anyone with the URL could view evaluations).
// Routes through Vercel so school networks that strip CORS headers
// from third-party API responses still work.

import { createClient } from '@supabase/supabase-js';

function getServerSupabase() {
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error('Supabase environment variables not configured on the server');
  }
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const supabase = getServerSupabase();
    const { data, error } = await supabase
      .from('tools')
      .select('*')
      .order('updated_at', { ascending: false });
    if (error) throw error;

    // Don't cache so updates appear immediately
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({ tools: data || [] });
  } catch (e) {
    console.error('List failed:', e);
    return res.status(500).json({ error: e.message || 'Could not load tools' });
  }
}
