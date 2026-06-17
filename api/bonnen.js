// Dit bestand zorgt ervoor dat de bonnen permanent worden opgeslagen
// in de Upstash-opslag die net aan het project is gekoppeld.

const REDIS_URL = process.env.KV_REST_API_URL;
const REDIS_TOKEN = process.env.KV_REST_API_TOKEN;
const KEY = 'bonnen-data';

async function redisGet() {
  const r = await fetch(`${REDIS_URL}/get/${KEY}`, {
    headers: { Authorization: `Bearer ${REDIS_TOKEN}` }
  });
  const data = await r.json();
  return data.result; // null als er nog niks is opgeslagen
}

async function redisSet(value) {
  await fetch(`${REDIS_URL}/set/${KEY}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${REDIS_TOKEN}` },
    body: value
  });
}

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const raw = await redisGet();
      const bonnen = raw ? JSON.parse(raw) : [];
      return res.status(200).json({ bonnen });
    }

    if (req.method === 'POST') {
      const bonnen = req.body && req.body.bonnen;
      if (!Array.isArray(bonnen)) {
        return res.status(400).json({ error: 'bonnen moet een lijst zijn' });
      }
      await redisSet(JSON.stringify(bonnen));
      return res.status(200).json({ ok: true });
    }

    res.status(405).json({ error: 'Methode niet toegestaan' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
