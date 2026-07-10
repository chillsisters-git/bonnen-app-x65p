// api/transacties.js
//
// Permanente opslag van bankafschrift-transacties (Upstash Redis REST API).
// Gebruikt DEZELFDE environment variables als api/bonnen.js:
//   UPSTASH_REDIS_REST_URL
//   UPSTASH_REDIS_REST_TOKEN
//
// BELANGRIJK: controleer of api/bonnen.js deze exacte REST-aanpak gebruikt
// (directe fetch-calls naar Upstash) of het @upstash/redis package. Gebruikt
// bonnen.js het package, pas dit bestand dan in dezelfde stijl aan zodat
// beide bestanden consistent blijven.
//
// Slaat op: { transacties: [...], handmatig: {...}, genegeerd: {...} }

const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
const KEY = 'bankmatching:transacties';

async function upstashGet(key) {
  const res = await fetch(`${UPSTASH_URL}/get/${key}`, {
    headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` }
  });
  if (!res.ok) throw new Error('Upstash GET fout: ' + res.status);
  const data = await res.json();
  return data.result; // null als de key nog niet bestaat
}

async function upstashSet(key, valueAsString) {
  const res = await fetch(`${UPSTASH_URL}/set/${encodeURIComponent(key)}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${UPSTASH_TOKEN}`,
      'Content-Type': 'text/plain'
    },
    body: valueAsString
  });
  if (!res.ok) throw new Error('Upstash SET fout: ' + res.status);
  return res.json();
}

module.exports = async function handler(req, res) {
  if (!UPSTASH_URL || !UPSTASH_TOKEN) {
    return res.status(500).json({
      error: 'UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN ontbreken. Controleer je Vercel environment variables.'
    });
  }

  try {
    if (req.method === 'GET') {
      const raw = await upstashGet(KEY);
      const data = raw
        ? JSON.parse(raw)
        : { transacties: [], handmatig: {}, genegeerd: {} };
      return res.status(200).json(data);
    }

    if (req.method === 'POST') {
      const body = req.body || {};
      const data = {
        transacties: Array.isArray(body.transacties) ? body.transacties : [],
        handmatig: body.handmatig && typeof body.handmatig === 'object' ? body.handmatig : {},
        genegeerd: body.genegeerd && typeof body.genegeerd === 'object' ? body.genegeerd : {}
      };
      await upstashSet(KEY, JSON.stringify(data));
      return res.status(200).json({ ok: true });
    }

    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).end('Method Not Allowed');
  } catch (e) {
    console.error('api/transacties.js fout:', e);
    return res.status(500).json({ error: e.message });
  }
};
