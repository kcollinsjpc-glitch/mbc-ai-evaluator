// Save (insert or update) a tool evaluation. Admin-only.

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

  const { id, data, updatedAt } = req.body || {};
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Tool id is required' });
  }
  if (!data || typeof data !== 'object') {
    return res.status(400).json({ error: 'Tool data is required' });
  }
  if (typeof updatedAt !== 'number') {
    return res.status(400).json({ error: 'updatedAt is required' });
  }

  try {
    const supabase = getServerSupabase();
    const { error } = await supabase
      .from('tools')
      .upsert({ id, data, updated_at: updatedAt });
    if (error) throw error;
    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error('Save failed:', e);
    return res.status(500).json({ error: e.message || 'Could not save tool' });
  }
}
