// api/transacties.js
//
// Permanente opslag van bankafschrift-transacties (Upstash Redis REST API).
//
// Gebruikt dezelfde database als api/bonnen.js (KV_REST_API_URL / KV_REST_API_TOKEN).
// De oude namen UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN werken ook nog,
// mochten die ooit (weer) ingesteld worden; die krijgen dan voorrang.
//
// Slaat op: { transacties: [...], handmatig: {...}, genegeerd: {...}, txGematcht: {...} }

const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
const KEY = 'bankmatching:transacties';

async function redisGet(key) {
  const res = await fetch(`${REDIS_URL}/get/${key}`, {
    headers: { Authorization: `Bearer ${REDIS_TOKEN}` }
  });
  if (!res.ok) throw new Error('Opslag GET fout: ' + res.status);
  const data = await res.json();
  return data.result; // null als er nog niks is opgeslagen
}

async function redisSet(key, valueAsString) {
  const res = await fetch(`${REDIS_URL}/set/${encodeURIComponent(key)}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${REDIS_TOKEN}`,
      'Content-Type': 'text/plain'
    },
    body: valueAsString
  });
  if (!res.ok) throw new Error('Opslag SET fout: ' + res.status);
  return res.json();
}

function isObject(x) {
  return x && typeof x === 'object' && !Array.isArray(x);
}

module.exports = async function handler(req, res) {
  if (!REDIS_URL || !REDIS_TOKEN) {
    console.error('api/transacties.js: geen database-gegevens gevonden (KV_REST_API_URL / KV_REST_API_TOKEN)');
    return res.status(500).json({
      error: 'KV_REST_API_URL / KV_REST_API_TOKEN ontbreken. Controleer je Vercel environment variables.'
    });
  }

  try {
    if (req.method === 'GET') {
      const raw = await redisGet(KEY);
      const data = raw
        ? JSON.parse(raw)
        : { transacties: [], handmatig: {}, genegeerd: {}, txGematcht: {} };
      return res.status(200).json(data);
    }

    if (req.method === 'POST') {
      const body = req.body || {};
      const data = {
        transacties: Array.isArray(body.transacties) ? body.transacties : [],
        handmatig: isObject(body.handmatig) ? body.handmatig : {},
        genegeerd: isObject(body.genegeerd) ? body.genegeerd : {},
        // "Handmatig als gematcht gemarkeerd" bij transacties — werd eerder niet bewaard.
        txGematcht: isObject(body.txGematcht) ? body.txGematcht : {}
      };
      await redisSet(KEY, JSON.stringify(data));
      return res.status(200).json({ ok: true });
    }

    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).end('Method Not Allowed');
  } catch (e) {
    console.error('api/transacties.js fout:', e);
    return res.status(500).json({ error: e.message });
  }
};
