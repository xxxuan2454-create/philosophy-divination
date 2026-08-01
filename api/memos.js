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
      const rows = await sbGet(`${MEMOS_TABLE}?select=card_id,note,updated_at&order=card_id.asc`);
      res.status(200).json(rows || []);
    } catch (err) {
      res.status(500).json({ error: err.message });
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
      const existing = await sbGet(`${MEMOS_TABLE}?select=card_id`);
      const existingIds = new Set((existing || []).map(r => r.card_id));

      const entries = Object.entries(memos);

      for (const [card_id, note] of entries) {
        const cardId = parseInt(card_id);
        if (isNaN(cardId)) continue;

        if (note && note.trim()) {
          // Upsert: update if exists, insert if not
          const data = { card_id: cardId, note: note.trim(), updated_at: new Date().toISOString() };
          if (existingIds.has(cardId)) {
            await sbPatch(MEMOS_TABLE, `card_id=eq.${cardId}`, data);
          } else {
            await sbPost(MEMOS_TABLE, data);
          }
        } else {
          // Delete if note is empty
          if (existingIds.has(cardId)) {
            await sbDelete(MEMOS_TABLE, `card_id=eq.${cardId}`);
          }
        }
      }

      res.status(200).json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
    return;
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
