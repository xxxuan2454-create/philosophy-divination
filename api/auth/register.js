const { sbGet, sbPost, hashPassword, signJWT } = require('../_utils');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method !== 'POST') return res.status(405).end();

  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: '请填写邮箱和密码' });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: '邮箱格式不正确' });
  if (password.length < 6) return res.status(400).json({ error: '密码至少 6 位' });

  const existing = await sbGet(`users?email=eq.${encodeURIComponent(email)}&select=id`);
  if (existing && existing.length > 0) return res.status(400).json({ error: '该邮箱已注册' });

  const password_hash = await hashPassword(password);
  const created = await sbPost('users', { email, password_hash, coin_balance: 0 });
  const user = Array.isArray(created) ? created[0] : created;
  if (!user?.id) return res.status(500).json({ error: '注册失败，请重试' });

  const token = signJWT({ userId: user.id, email });
  res.status(200).json({ token, coinBalance: 0 });
};
