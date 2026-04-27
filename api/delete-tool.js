// Delete a tool evaluation. Admin-only.

import { createClient } from '@supabase/supabase-js';
import { requireAuth } from './_auth.js';

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
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!(await requireAuth(req, res))) return;

  const { id } = req.body || {};
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Tool id is required' });
  }

  try {
    const supabase = getServerSupabase();
    const { error } = await supabase.from('tools').delete().eq('id', id);
    if (error) throw error;
    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error('Delete failed:', e);
    return res.status(500).json({ error: e.message || 'Could not delete tool' });
  }
}
