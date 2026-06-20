const { sbGet, verifyJWT, getToken } = require('../_utils');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method !== 'GET') return res.status(405).end();

  try {
    const { userId } = verifyJWT(getToken(req));
    const rows = await sbGet(`users?id=eq.${userId}&select=id,phone,coin_balance`);
    if (!rows || rows.length === 0) return res.status(404).json({ error: '用户不存在' });
    res.status(200).json(rows[0]);
  } catch {
    res.status(401).json({ error: '未登录' });
  }
};
