const https = require('https');

const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyB8JoYzs3S77eL-lOjPVxZitk-V-oOYcGxTQTnCKtXET6ItlAbeT_m6-DiIjLSWW5HlQ/exec';
const SHEET_ID = '1zmaHID1ZQVe05KjnuJJUsGoDeEpoR9QMNHuCFUcYycg';

function getTabName(datum) {
  if (!datum) return 'Q1-2026';
  var parts = datum.split('-');
  if (parts.length < 3) return 'Q1-2026';
  var maand = parseInt(parts[1], 10);
  var jaar = parts[2];
  var kwartaal;
  if (maand <= 3) kwartaal = 'Q1';
  else if (maand <= 6) kwartaal = 'Q2';
  else if (maand <= 9) kwartaal = 'Q3';
  else kwartaal = 'Q4';
  return kwartaal + '-' + jaar.slice(2);
}

function postData(url, data) {
  return new Promise(function(resolve, reject) {
    var body = JSON.stringify(data);
    var options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
      }
    };
    var req = https.request(url, options, function(res) {
      var chunks = [];
      res.on('data', function(c) { chunks.push(c); });
      res.on('end', function() {
        try { resolve(JSON.parse(Buffer.concat(chunks).toString())); }
        catch(e) { resolve({}); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  try {
    var row = req.body.row;
    var datum = row[0];
    var tabName = getTabName(datum);
    var data = await postData(SCRIPT_URL, { row: row, sheetId: SHEET_ID, tabName: tabName });
    if (data.error) throw new Error(data.error);
    return res.status(200).json({ success: true, tabName: tabName });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
