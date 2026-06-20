const { sbGet, sbPost, sbPatch, verifyJWT, getToken } = require('../_utils');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method !== 'POST') return res.status(405).end();

  let userId;
  try {
    ({ userId } = verifyJWT(getToken(req)));
  } catch {
    return res.status(401).json({ error: '未登录' });
  }

  // 检查余额
  const users = await sbGet(`users?id=eq.${userId}&select=coin_balance`);
  const user = users?.[0];
  if (!user || user.coin_balance < 1) {
    return res.status(402).json({ error: '占卜币不足' });
  }

  const { spreadType, question, cardsJson, aiReading } = req.body;
  if (!spreadType || !cardsJson) return res.status(400).json({ error: '参数缺失' });

  // 扣除1币
  await sbPatch('users', `id=eq.${userId}`, { coin_balance: user.coin_balance - 1 });

  // 记录消费流水
  await sbPost('transactions', { user_id: userId, coins: -1, type: 'spend' }, 'return=minimal');

  // 保存解牌记录
  const reading = await sbPost('readings', {
    user_id: userId,
    spread_type: spreadType,
    question: question || '',
    cards_json: cardsJson,
    ai_reading: aiReading || ''
  });

  res.status(200).json({ success: true, coinBalance: user.coin_balance - 1, readingId: reading?.[0]?.id });
};
