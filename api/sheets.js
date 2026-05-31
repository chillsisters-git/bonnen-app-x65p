export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyHaPuVYpXRx-8m_wwoeaubwRiI250j61n5hp4K2_eEhXEYh5hFSrELWNb2i1C1j-YgLg/exec';

  try {
    const { row, sheetId, tabName } = req.body;
    const response = await fetch(SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ row, sheetId, tabName })
    });

    if (!response.ok) throw new Error('Script fout ' + response.status);
    const data = await response.json();
    return res.status(200).json(data);

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
