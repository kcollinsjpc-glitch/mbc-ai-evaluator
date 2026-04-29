// Admin-only endpoint to list pending evaluation requests.

import { createClient } from '@supabase/supabase-js';
import { requireAuth } from './_auth.js';

function getServerSupabase() {
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error('Supabase environment variables not configured');
  }
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!(await requireAuth(req, res))) return;

  try {
    const supabase = getServerSupabase();
    const { data, error } = await supabase
      .from('requests')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({ requests: data || [] });
  } catch (e) {
    console.error('List requests failed:', e);
    return res.status(500).json({ error: e.message || 'Could not load requests' });
  }
}
