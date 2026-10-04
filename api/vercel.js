export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });

  const { name, html } = req.body || {};
  if (!name || !html) return res.status(400).json({ message: 'name dan html wajib diisi' });
  if (!/^[a-z0-9-]{3,50}$/.test(name)) return res.status(400).json({ message: 'Nama tidak valid' });
  if (html.length > 500000) return res.status(400).json({ message: 'HTML terlalu besar (maks 500KB)' });

  const token = process.env.VERCEL_TOKEN;
  if (!token) return res.status(500).json({ message: 'VERCEL_TOKEN belum di-set' });

  const reserved = ['www','api','admin','app','mail','ftp','root','login','panel','dashboard','static','assets','cdn','docs'];
  if (reserved.includes(name)) return res.status(400).json({ message: 'Nama "' + name + '" tidak bisa dipakai' });

  try {
    const payload = {
      name: name,
      files: [{ file: 'index.html', data: html }],
      projectSettings: { framework: null },
      target: 'production'
    };

    const response = await fetch(
      'https://api.vercel.com/v13/deployments?forceNew=1&skipAutoDetectionConfirmation=1',
      {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + token,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      }
    );

    const data = await response.json();

    if (!response.ok) {
      const msg = (data && data.error && data.error.message) || 'Vercel error';
      return res.status(response.status).json({ message: 'Vercel: ' + msg });
    }

    return res.status(200).json({
      ok: true,
      url: 'https://' + name + '.vercel.app',
      provider: 'vercel',
      deploymentId: data.id || null
    });
  } catch (err) {
    return res.status(500).json({ message: 'Server error: ' + (err.message || 'unknown') });
  }
}
