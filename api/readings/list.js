const { sbGet, verifyJWT, getToken } = require('../_utils');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method !== 'GET') return res.status(405).end();

  let userId;
  try {
    ({ userId } = verifyJWT(getToken(req)));
  } catch {
    return res.status(401).json({ error: '未登录' });
  }

  const readings = await sbGet(
    `readings?user_id=eq.${userId}&order=created_at.desc&select=id,spread_type,question,cards_json,ai_reading,created_at`
  );

  res.status(200).json(readings || []);
};
