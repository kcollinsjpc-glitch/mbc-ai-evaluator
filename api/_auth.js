// Shared auth helpers used by the serverless functions.
// Session tokens are signed JWTs that prove the user logged in successfully.

import { SignJWT, jwtVerify } from 'jose';

const SESSION_HOURS = 4;

function getSecret() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error('SESSION_SECRET environment variable is missing or too short (needs 32+ characters)');
  }
  return new TextEncoder().encode(secret);
}

export async function createSessionToken() {
  const token = await new SignJWT({ role: 'admin' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_HOURS}h`)
    .sign(getSecret());
  return { token, expiresInSeconds: SESSION_HOURS * 60 * 60 };
}

export async function verifySessionToken(token) {
  if (!token || typeof token !== 'string') return false;
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return payload.role === 'admin';
  } catch (e) {
    return false;
  }
}

export function getTokenFromRequest(req) {
  const authHeader = req.headers.authorization || req.headers.Authorization;
  if (!authHeader || typeof authHeader !== 'string') return null;
  if (!authHeader.startsWith('Bearer ')) return null;
  return authHeader.slice(7);
}

export async function requireAuth(req, res) {
  const token = getTokenFromRequest(req);
  const valid = await verifySessionToken(token);
  if (!valid) {
    res.status(401).json({ error: 'Unauthorised. Please log in again.' });
    return false;
  }
  return true;
}
