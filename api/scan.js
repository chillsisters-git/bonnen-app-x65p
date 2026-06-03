export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const { image, mediaType } = req.body;
  if (!image) {
    return res.status(400).json({ error: 'Geen afbeelding meegestuurd' });
  }
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'API sleutel niet geconfigureerd' });
  }
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1024,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: mediaType || 'image/jpeg',
                  data: image,
                },
              },
              {
                type: 'text',
                text: `Lees deze bon/factuur uit en geef de volgende gegevens terug als JSON (alleen JSON, geen uitleg):
{
  "datum": "DD-MM-JJJJ",
  "omschrijving": "naam winkel of leverancier + korte omschrijving",
  "bedrag_incl": 0.00,
  "btw_bedrag": 0.00,
  "categorie": "een van: Software / Marketing / Opleidingen / Reiskosten / Telefoon en Internet / Kantoor / Bankkosten / Overige kosten",
  "opmerking": null
}
Regels:
- bedrag_incl is het totaalbedrag inclusief BTW
- btw_bedrag is het BTW bedrag (zoek naar BTW, tax, VAT op de bon)
- Als BTW niet vermeld staat, bereken dan 21% van het excl. bedrag
- datum altijd in DD-MM-JJJJ formaat
- Als een veld niet leesbaar is, gebruik dan null`,
              },
            ],
          },
        ],
      }),
    });
    if (!response.ok) {
      const errorBody = await response.text();
      console.error('Anthropic API fout:', errorBody);
      return res.status(response.status).json({ error: 'Fout bij AI verwerking', details: errorBody });
    }
    const data = await response.json();
    const rawText = data.content?.[0]?.text || '';
    let parsed = null;
    try {
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      console.error('JSON parse fout:', e);
    }
    return res.status(200).json({ result: parsed, raw: rawText });
  } catch (err) {
    console.error('Server fout:', err);
    return res.status(500).json({ error: 'Interne serverfout', details: err.message });
  }
}
