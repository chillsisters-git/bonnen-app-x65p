const Anthropic = require("@anthropic-ai/sdk");
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MAX_SIZE = 1.2 * 1024 * 1024; // 1.2MB
// Bekende rekeningen van de opdrachtgever
const REKENINGEN = [
  { cijfers: "7361", naam: "BUNQ Zakelijk" },
  { cijfers: "5749", naam: "VISA" },
  { cijfers: "4183", naam: "BUNQ Privé" },
  { cijfers: "4178", naam: "ABN Privé" },
];
const REKENINGEN_PROMPT = REKENINGEN.map(
  (r) => `- Laatste 4 cijfers ${r.cijfers} = ${r.naam}`
).join("\n");

// Categorieën zoals gebruikt in MoneyMonk
const CATEGORIEEN = [
  "Accountants- en administratiekosten","Advertenties","Aflossing langlopende lening","Algemene kosten",
  "Autokosten","Automatiseringkosten","Bankkosten","Betalingsverschillen","Beurskosten","Brandstof",
  "Commissie","Commissie verkoop","Contributies en abonnementen","Crowdfundingkosten",
  "Drukwerk, porti en vrachten","Eten & drinken op kantoor","Fiscale advieskosten","Gas, water en licht",
  "Huur bedrijfspand","Huur panden en terreinen","Inventaris","Kantoorbenodigdheden","Kilometervergoeding",
  "Marketingkosten","Motorrijtuigenbelasting","Niet aftrekbare kosten","Niet aftrekbare representatiekosten",
  "Opleidings- en studiekosten","Provisie aan derden","Reclamekosten","Regeling Corona",
  "Reis- en verblijfkosten","Reiskosten OV","Relatiegeschenken","Rentekosten","Representatiekosten",
  "Sponsorkosten","Telefoon en internet","Uitbesteed werk","Vakliteratuur","Verzekeringen",
  "Zakenlunch of diner in horeca","Buitenlandse software binnen EU","Buitenlandse software buiten EU",
  "Buitenlandse freelancers binnen EU","Buitenlandse freelancers buiten EU","Buitenlandse hotelkosten",
  "Buitenlandse horeca","Buitenlandse btw op bon","Declaraties aan opdrachtgever",
  "Doorbelaste kosten aan opdrachtgever"
];
const CATEGORIEEN_PROMPT = CATEGORIEEN.join(", ");

async function resizeIfNeeded(base64, mediaType) {
  if (Buffer.from(base64, "base64").length <= MAX_SIZE) return { base64, mediaType };
  // Verklein via sharp indien beschikbaar, anders geef terug wat er is
  try {
    const sharp = require("sharp");
    const buf = Buffer.from(base64, "base64");
    const out = await sharp(buf).resize({ width: 1200, withoutEnlargement: true }).jpeg({ quality: 75 }).toBuffer();
    return { base64: out.toString("base64"), mediaType: "image/jpeg" };
  } catch {
    return { base64, mediaType };
  }
}
module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const { image, mediaType } = req.body;
  if (!image) return res.status(400).json({ error: "Geen afbeelding ontvangen" });
  const { base64: img, mediaType: mt } = await resizeIfNeeded(image, mediaType || "image/jpeg");
  const prompt = `Je bent een assistent die bonnen en facturen uitleest voor een Nederlandse ZZP-er.
Lees de volgende gegevens uit de bon/factuur en geef ze terug als JSON:
1. datum — in formaat DD-MM-JJJJ
2. omschrijving — naam van winkel/leverancier + korte omschrijving wat het is
3. bedrag_incl — totaalbedrag inclusief BTW als getal (bijv. 24.95)
4. btw_bedrag — BTW bedrag als getal (bijv. 4.33). Als het niet op de bon staat, bereken het dan op basis van 21%.
5. categorie — kies de meest passende uit deze lijst (gebruik exact dezelfde schrijfwijze): ${CATEGORIEEN_PROMPT}. Als niets goed past, gebruik "Algemene kosten".
6. rekening_cijfers — zoek op de bon naar een rekeningnummer of IBAN. Geef de laatste 4 cijfers terug als tekst (bijv. "7361"). 
   De bekende rekeningen zijn:
${REKENINGEN_PROMPT}
   Als er geen rekeningnummer op de bon staat, geef dan null terug.
7. opmerking — eventuele relevante opmerking, anders leeg
Geef ALLEEN een JSON object terug, geen uitleg of markdown. Formaat:
{
  "datum": "DD-MM-JJJJ",
  "omschrijving": "...",
  "bedrag_incl": 0.00,
  "btw_bedrag": 0.00,
  "categorie": "...",
  "rekening_cijfers": "7361",
  "opmerking": ""
}`;
  try {
    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1000,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: { type: "base64", media_type: mt, data: img },
            },
            { type: "text", text: prompt },
          ],
        },
      ],
    });
    const text = response.content[0].text.trim();
    const clean = text.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean);
    return res.status(200).json({ result: parsed });
  } catch (err) {
    console.error("Scan fout:", err);
    return res.status(500).json({ error: err.message });
  }
};
