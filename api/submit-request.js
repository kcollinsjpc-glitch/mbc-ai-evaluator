// Public endpoint for staff to request a tool evaluation.
// Saves to the database AND emails the admin via Resend.

import { createClient } from '@supabase/supabase-js';

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

// Basic input cleanup. Strips control characters, caps length.
function sanitiseString(value, maxLen = 500) {
  if (typeof value !== 'string') return '';
  return value.replace(/[\x00-\x1F\x7F]/g, '').trim().slice(0, maxLen);
}

function escapeHtml(s) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

async function sendNotificationEmail(request) {
  const apiKey = process.env.RESEND_API_KEY;
  const fromAddress = process.env.RESEND_FROM_ADDRESS;
  const toAddress = process.env.NOTIFICATION_EMAIL;

  if (!apiKey || !fromAddress || !toAddress) {
    console.warn('Email env vars missing, skipping notification');
    return { sent: false, reason: 'not configured' };
  }

  const safe = {
    name: escapeHtml(request.requesterName || 'Anonymous'),
    email: escapeHtml(request.requesterEmail || ''),
    url: escapeHtml(request.toolUrl || ''),
    yearLevel: escapeHtml(request.yearLevel || 'Not specified'),
    intendedUse: escapeHtml(request.intendedUse || ''),
    urgency: escapeHtml(request.urgency || 'Standard'),
    notes: escapeHtml(request.notes || '')
  };

  const html = `
    <h2 style="color:#A6174A;font-family:system-ui,sans-serif;">New AI Tool Evaluation Request</h2>
    <table style="font-family:system-ui,sans-serif;border-collapse:collapse;">
      <tr><td style="padding:6px 12px 6px 0;color:#666;"><strong>From:</strong></td><td>${safe.name}${safe.email ? ` &lt;<a href="mailto:${safe.email}">${safe.email}</a>&gt;` : ''}</td></tr>
      <tr><td style="padding:6px 12px 6px 0;color:#666;"><strong>Tool URL:</strong></td><td><a href="${safe.url}">${safe.url}</a></td></tr>
      <tr><td style="padding:6px 12px 6px 0;color:#666;"><strong>Year Level:</strong></td><td>${safe.yearLevel}</td></tr>
      <tr><td style="padding:6px 12px 6px 0;color:#666;"><strong>Urgency:</strong></td><td>${safe.urgency}</td></tr>
    </table>
    <h3 style="color:#A6174A;font-family:system-ui,sans-serif;margin-top:20px;">Intended Use</h3>
    <p style="font-family:system-ui,sans-serif;white-space:pre-wrap;">${safe.intendedUse}</p>
    ${safe.notes ? `<h3 style="color:#A6174A;font-family:system-ui,sans-serif;margin-top:20px;">Additional Notes</h3><p style="font-family:system-ui,sans-serif;white-space:pre-wrap;">${safe.notes}</p>` : ''}
    <hr style="margin-top:30px;border:none;border-top:1px solid #eee;" />
    <p style="font-family:system-ui,sans-serif;color:#999;font-size:12px;">View this request in your evaluator at <a href="https://mbc-ai-evaluator.com">mbc-ai-evaluator.com</a></p>
  `;

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: fromAddress,
        to: [toAddress],
        subject: `New AI tool request: ${safe.url || 'no URL'}`,
        html
      })
    });
    if (!response.ok) {
      const text = await response.text();
      console.error('Resend error:', response.status, text);
      return { sent: false, reason: `Resend ${response.status}` };
    }
    return { sent: true };
  } catch (e) {
    console.error('Resend exception:', e);
    return { sent: false, reason: e.message };
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const body = req.body || {};
  const toolUrl = sanitiseString(body.toolUrl, 500);
  const requesterName = sanitiseString(body.requesterName, 100);
  const requesterEmail = sanitiseString(body.requesterEmail, 200).toLowerCase();
  const yearLevel = sanitiseString(body.yearLevel, 50);
  const intendedUse = sanitiseString(body.intendedUse, 2000);
  const urgency = sanitiseString(body.urgency, 50);
  const notes = sanitiseString(body.notes, 2000);

  if (!toolUrl) return res.status(400).json({ error: 'Tool URL is required' });
  if (!requesterName) return res.status(400).json({ error: 'Your name is required' });
  if (!requesterEmail) return res.status(400).json({ error: 'Your MBC email address is required' });

  // Email format check
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(requesterEmail)) {
    return res.status(400).json({ error: 'Please enter a valid email address' });
  }

  // Domain restriction: only accept MBC staff emails
  if (!requesterEmail.endsWith('@mbc.qld.edu.au')) {
    return res.status(403).json({ error: 'Only MBC staff email addresses (@mbc.qld.edu.au) can submit requests.' });
  }

  if (!intendedUse) return res.status(400).json({ error: 'Intended use is required' });

  const id = `req-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const createdAt = Date.now();
  const requestData = { toolUrl, requesterName, requesterEmail, yearLevel, intendedUse, urgency, notes, status: 'pending' };

  try {
    const supabase = getServerSupabase();
    const { error } = await supabase
      .from('requests')
      .insert({ id, data: requestData, created_at: createdAt });
    if (error) throw error;

    // Email is best-effort, do not fail the request if email fails
    const emailResult = await sendNotificationEmail(requestData);

    return res.status(200).json({ ok: true, id, emailSent: emailResult.sent });
  } catch (e) {
    console.error('Submit request failed:', e);
    return res.status(500).json({ error: e.message || 'Could not submit request' });
  }
}
