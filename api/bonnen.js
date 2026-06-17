// Dit bestand zorgt voor permanente opslag:
// - de lijst met bonnen (gegevens zoals datum, bedrag, BTW)
// - losse foto's per bon (apart bewaard, zodat het geheel niet te groot wordt)

const REDIS_URL = process.env.KV_REST_API_URL;
const REDIS_TOKEN = process.env.KV_REST_API_TOKEN;
const KEY = 'bonnen-data';

async function redisGet(key) {
  const r = await fetch(`${REDIS_URL}/get/${key}`, {
    headers: { Authorization: `Bearer ${REDIS_TOKEN}` }
  });
  const data = await r.json();
  return data.result; // null als er nog niks is opgeslagen
}

async function redisSet(key, value) {
  await fetch(`${REDIS_URL}/set/${key}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${REDIS_TOKEN}` },
    body: value
  });
}

export default async function handler(req, res) {
  try {
    const type = req.query.type;

    // --- Eén losse foto opslaan of ophalen ---
    if (type === 'foto') {
      const id = req.query.id;
      if (!id) return res.status(400).json({ error: 'id ontbreekt' });
      const fotoKey = 'bon-foto-' + id;

      if (req.method === 'GET') {
        const raw = await redisGet(fotoKey);
        return res.status(200).json({ foto: raw || null });
      }
      if (req.method === 'POST') {
        const foto = req.body && req.body.foto;
        if (!foto) return res.status(400).json({ error: 'foto ontbreekt' });
        await redisSet(fotoKey, foto);
        return res.status(200).json({ ok: true });
      }
      return res.status(405).json({ error: 'Methode niet toegestaan' });
    }

    // --- De volledige lijst met bonnen (zonder foto's, die blijven klein) ---
    if (req.method === 'GET') {
      const raw = await redisGet(KEY);
      const bonnen = raw ? JSON.parse(raw) : [];
      return res.status(200).json({ bonnen });
    }

    if (req.method === 'POST') {
      const bonnen = req.body && req.body.bonnen;
      if (!Array.isArray(bonnen)) {
        return res.status(400).json({ error: 'bonnen moet een lijst zijn' });
      }
      await redisSet(KEY, JSON.stringify(bonnen));
      return res.status(200).json({ ok: true });
    }

    res.status(405).json({ error: 'Methode niet toegestaan' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
