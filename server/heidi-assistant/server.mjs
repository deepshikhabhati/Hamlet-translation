// Heidi assistant backend — keeps the model API key on the server. No dependencies (Node 18+).
//   ANTHROPIC_API_KEY=... ALLOWED_ORIGIN=https://deepshikhabhati.github.io node server.mjs
// Then set "endpoint" in src/assets/config/heidi-assistant.json to https://<your-host>/heidi-assistant
import http from 'node:http';

const KEY = process.env.ANTHROPIC_API_KEY;
const MODEL = process.env.HEIDI_ASSISTANT_MODEL || 'claude-sonnet-4-5';
const ORIGIN = process.env.ALLOWED_ORIGIN || 'https://deepshikhabhati.github.io';
const PORT = Number(process.env.PORT || 8787);

const SYSTEM = `You assist literary scholars comparing Johanna Spyri's German original of "Heidi" (authoritative source)
with Elisabeth P. Stork's English translation (1915). Answer the scholar's question about the given passage, dimension and selection.
Be precise and concise; quote the texts exactly. When asked for a better rendering, propose ONE English translation that aims to preserve
the selected literary feature more closely. Never claim the proposal is 100% faithful or guaranteed. Never alter or re-attribute the
German original. Reply ONLY with JSON: {"answer": string, "proposed_translation": string|null, "caveats": string|null}.`;

function send(res, status, body) {
  res.writeHead(status, { 'content-type': 'application/json', 'access-control-allow-origin': ORIGIN,
    'access-control-allow-headers': 'content-type', 'access-control-allow-methods': 'POST, OPTIONS' });
  res.end(JSON.stringify(body));
}

http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') { return send(res, 204, {}); }
  if (req.method !== 'POST' || !req.url.startsWith('/heidi-assistant')) { return send(res, 404, { error: 'Not found' }); }
  if (!KEY) { return send(res, 503, { error: 'Assistant backend has no API key configured.' }); }
  let raw = '';
  for await (const chunk of req) { raw += chunk; if (raw.length > 200_000) { return send(res, 413, { error: 'Request too large' }); } }
  let body;
  try { body = JSON.parse(raw); } catch { return send(res, 400, { error: 'Invalid JSON' }); }
  if (body?.project !== 'heidi' || !body.context || typeof body.question !== 'string') { return send(res, 400, { error: 'Bad request' }); }
  const user = `Context:\n${JSON.stringify(body.context, null, 1)}\n\n` +
    (body.previous_proposal ? `Previous proposal (produce a different one):\n${body.previous_proposal}\n\n` : '') +
    `Question: ${body.question}`;
  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({ model: MODEL, max_tokens: 1200, system: SYSTEM, messages: [{ role: 'user', content: user }] }),
    });
    const j = await r.json();
    if (!r.ok) { return send(res, 502, { error: j?.error?.message || 'Model request failed' }); }
    const text = (j.content || []).map(c => c.text || '').join('');
    const m = text.match(/\{[\s\S]*\}/);
    const out = m ? JSON.parse(m[0]) : { answer: text, proposed_translation: null, caveats: null };
    send(res, 200, { answer: String(out.answer || ''), proposed_translation: out.proposed_translation || null,
      caveats: out.caveats || null, model: MODEL });
  } catch (e) {
    send(res, 502, { error: String(e.message || e) });
  }
}).listen(PORT, () => console.log(`heidi-assistant on :${PORT} (origin ${ORIGIN})`));
