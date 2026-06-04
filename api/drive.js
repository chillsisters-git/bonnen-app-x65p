import { google } from 'googleapis';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { image, mediaType, filename, jaar, kwartaal } = req.body;
    if (!image || !filename) return res.status(400).json({ error: 'Geen afbeelding meegegeven' });

    // Auth via service account
    const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT);
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/drive'],
    });

    const drive = google.drive({ version: 'v3', auth });

    // Root map: X65P (vaste map-ID in pennysahertian@gmail.com Drive)
    const rootId = '1WhN45acR-PUQTyI6l7xBeookXoBpq7X0';
    // Zoek of maak map: 2026
    const jaarId = await getOrCreateFolder(drive, jaar || '2026', rootId);
    // Zoek of maak map: Q2
    const kwartaalId = await getOrCreateFolder(drive, kwartaal || 'Q1', jaarId);

    // Upload bestand
    const buffer = Buffer.from(image, 'base64');
    const { Readable } = await import('stream');
    const stream = Readable.from(buffer);

    const uploaded = await drive.files.create({
      requestBody: {
        name: filename,
        parents: [kwartaalId],
      },
      media: {
        mimeType: mediaType || 'image/jpeg',
        body: stream,
      },
      fields: 'id, webViewLink',
    });

    res.status(200).json({ 
      success: true, 
      fileId: uploaded.data.id,
      link: uploaded.data.webViewLink 
    });

  } catch (err) {
    console.error('Drive upload fout:', err);
    res.status(500).json({ error: err.message });
  }
}

async function getOrCreateFolder(drive, name, parentId) {
  const q = parentId
    ? `name='${name}' and mimeType='application/vnd.google-apps.folder' and '${parentId}' in parents and trashed=false`
    : `name='${name}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;

  const res = await drive.files.list({ q, fields: 'files(id)' });
  if (res.data.files.length > 0) return res.data.files[0].id;

  const folder = await drive.files.create({
    requestBody: {
      name,
      mimeType: 'application/vnd.google-apps.folder',
      ...(parentId && { parents: [parentId] }),
    },
    fields: 'id',
  });
  return folder.data.id;
}
