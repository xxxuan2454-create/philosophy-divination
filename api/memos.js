const { sbGet, sbPost, sbPatch, sbDelete } = require('./_utils');

const MEMOS_TABLE = 'public_memos';

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // GET — anyone can read memos
  if (req.method === 'GET') {
    try {
      const apiUrl = `${process.env.SUPABASE_URL}/rest/v1/${MEMOS_TABLE}?select=card_id,note,updated_at&order=card_id.asc`;
      const response = await fetch(apiUrl, {
        headers: {
          'apikey': process.env.SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_KEY}`
        }
      });
      if (!response.ok) throw new Error(`Supabase error ${response.status}: ${await response.text()}`);
      const rows = await response.json();
      res.status(200).json(rows || []);
    } catch (err) {
      res.status(500).json({ error: 'GET failed: ' + err.message });
    }
    return;
  }

  // PUT — requires editor password
  if (req.method === 'PUT') {
    const password = (req.headers.authorization || '').replace('Editor ', '');
    if (!password || password !== process.env.EDITOR_PASSWORD) {
      return res.status(401).json({ error: '密码错误，无编辑权限' });
    }

    const memos = req.body;
    if (!memos || typeof memos !== 'object') {
      return res.status(400).json({ error: '需要 memos 对象 {card_id: "note text", ...}' });
    }

    try {
      // Get existing card_ids
      const getUrl = `${process.env.SUPABASE_URL}/rest/v1/${MEMOS_TABLE}?select=card_id`;
      const getRes = await fetch(getUrl, {
        headers: {
          'apikey': process.env.SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_KEY}`
        }
      });
      const existing = getRes.ok ? await getRes.json() : [];
      const existingIds = new Set((existing || []).map(r => r.card_id));

      const entries = Object.entries(memos);
      const baseUrl = `${process.env.SUPABASE_URL}/rest/v1/${MEMOS_TABLE}`;
      const headers = {
        'Content-Type': 'application/json',
        'apikey': process.env.SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_KEY}`,
        'Prefer': 'return=representation'
      };

      for (const [card_id, note] of entries) {
        const cardId = parseInt(card_id);
        if (isNaN(cardId)) continue;

        if (note && note.trim()) {
          const data = { card_id: cardId, note: note.trim(), updated_at: new Date().toISOString() };
          if (existingIds.has(cardId)) {
            await fetch(`${baseUrl}?card_id=eq.${cardId}`, {
              method: 'PATCH', headers, body: JSON.stringify(data)
            });
          } else {
            await fetch(baseUrl, {
              method: 'POST', headers, body: JSON.stringify(data)
            });
          }
        } else {
          if (existingIds.has(cardId)) {
            await fetch(`${baseUrl}?card_id=eq.${cardId}`, {
              method: 'DELETE',
              headers: {
                'apikey': process.env.SUPABASE_SERVICE_KEY,
                'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_KEY}`
              }
            });
          }
        }
      }

      res.status(200).json({ success: true });
    } catch (err) {
      res.status(500).json({ error: 'PUT failed: ' + err.message });
    }
    return;
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
