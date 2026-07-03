// api/transacties.js
// Permanente opslag van ingelezen bankafschrift-transacties + handmatige koppelingen,
// via de Upstash Redis REST API. Bewust dezelfde stijl/aanpak als api/bonnen.js:
// simpele GET (ophalen) en POST (opslaan) op één sleutel.
//
// LET OP: dit bestand gaat ervan uit dat dezelfde environment variables als
// api/bonnen.js gebruikt worden: UPSTASH_REDIS_REST_URL en UPSTASH_REDIS_REST_TOKEN.
// Als api/bonnen.js een andere aanpak gebruikt (bijv. het @upstash/redis package
// in plaats van directe REST-calls), pas dit bestand daarop aan zodat de stijl
// consistent blijft — de functionaliteit is identiek.

const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
const SLEUTEL = 'transacties_data';

async function redisGet(key) {
  const res = await fetch(`${REDIS_URL}/get/${key}`, {
    headers: { Authorization: `Bearer ${REDIS_TOKEN}` }
  });
  const data = await res.json();
  return data.result ? JSON.parse(data.result) : null;
}

async function redisSet(key, value) {
  await fetch(`${REDIS_URL}/set/${key}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${REDIS_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(value)
  });
}

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const data = await redisGet(SLEUTEL);
      res.status(200).json(data || { transacties: [], handmatig: {} });
      return;
    }

    if (req.method === 'POST') {
      const { transacties, handmatig } = req.body;
      await redisSet(SLEUTEL, {
        transacties: transacties || [],
        handmatig: handmatig || {}
      });
      res.status(200).json({ ok: true });
      return;
    }

    res.status(405).json({ error: 'Methode niet toegestaan' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
