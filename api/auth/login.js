const { sbGet, verifyPassword, signJWT } = require('../_utils');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method !== 'POST') return res.status(405).end();

  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: '请填写邮箱和密码' });

  const rows = await sbGet(`users?email=eq.${encodeURIComponent(email)}&select=id,email,password_hash,coin_balance`);
  const user = rows?.[0];
  if (!user) return res.status(401).json({ error: '邮箱或密码错误' });

  const ok = await verifyPassword(password, user.password_hash);
  if (!ok) return res.status(401).json({ error: '邮箱或密码错误' });

  const token = signJWT({ userId: user.id, email: user.email });
  res.status(200).json({ token, coinBalance: user.coin_balance });
};
