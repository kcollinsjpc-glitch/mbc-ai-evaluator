// Login endpoint. Checks the password against ADMIN_PASSWORD env var (server-side only)
// and returns a signed session token if correct.

import { createSessionToken } from './_auth.js';

// Constant-time string comparison to prevent timing attacks
function safeCompare(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { password } = req.body || {};
  if (!password || typeof password !== 'string') {
    return res.status(400).json({ error: 'Password is required' });
  }

  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) {
    console.error('ADMIN_PASSWORD environment variable not set');
    return res.status(500).json({ error: 'Server is not configured for login' });
  }

  if (!safeCompare(password, expected)) {
    // Brief delay to slow brute-force attempts
    await new Promise(resolve => setTimeout(resolve, 500));
    return res.status(401).json({ error: 'Incorrect password' });
  }

  try {
    const { token, expiresInSeconds } = await createSessionToken();
    return res.status(200).json({ token, expiresInSeconds });
  } catch (e) {
    console.error('Token creation failed:', e);
    return res.status(500).json({ error: e.message || 'Could not create session' });
  }
}
