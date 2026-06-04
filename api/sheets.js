const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyB8JoYzs3S77eL-lOjPVxZitk-V-oOYcGxTQTnCKtXET6ItlAbeT_m6-DiIjLSWW5HlQ/exec';
const SHEET_ID = '1zmaHID1ZQVe05KjnuJJUsGoDeEpoR9QMNHuCFUcYycg';

function getTabName(datum) {
  // datum formaat: DD-MM-JJJJ
  if (!datum) return "Q1'26";
  var parts = datum.split('-');
  if (parts.length < 3) return "Q1'26";
  var maand = parseInt(parts[1], 10);
  var jaar = parts[2];
  var jaarShort = jaar.slice(2); // "2026" → "26"

  var kwartaal;
  if (maand <= 3) kwartaal = 'Q1';
  else if (maand <= 6) kwartaal = 'Q2';
  else if (maand <= 9) kwartaal = 'Q3';
  else kwartaal = 'Q4';

  return kwartaal + "'" + jaarShort; // bijv. "Q2'26"
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { row } = req.body;
    const datum = row[0]; // eerste kolom is datum
    const tabName = getTabName(datum);

    const response = await fetch(SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ row, sheetId: SHEET_ID, tabName }),
      redirect: 'follow'
    });

    if (!response.ok) throw new Error('Script fout ' + response.status);
    const data = await response.json();
    if (data.error) throw new Error(data.error);

    return res.status(200).json({ success: true, tabName });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
