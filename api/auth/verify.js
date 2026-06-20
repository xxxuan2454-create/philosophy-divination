const { sbGet, sbPost, sbDelete, signJWT } = require('../_utils');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method !== 'POST') return res.status(405).end();

  const { phone, code } = req.body;
  if (!phone || !code) return res.status(400).json({ error: '参数缺失' });

  const now = new Date().toISOString();
  const rows = await sbGet(`sms_codes?phone=eq.${phone}&code=eq.${code}&expires_at=gt.${now}&select=id`);

  if (!rows || rows.length === 0) {
    return res.status(400).json({ error: '验证码错误或已过期' });
  }

  await sbDelete('sms_codes', `phone=eq.${phone}`);

  // upsert user
  const existing = await sbGet(`users?phone=eq.${phone}&select=id,coin_balance`);
  let user;
  if (existing && existing.length > 0) {
    user = existing[0];
  } else {
    const created = await sbPost('users', { phone, coin_balance: 0 });
    user = Array.isArray(created) ? created[0] : created;
  }

  const token = signJWT({ userId: user.id, phone });
  res.status(200).json({ token, coinBalance: user.coin_balance });
};
