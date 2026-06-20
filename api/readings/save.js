const { sbPost, verifyJWT, getToken } = require('../_utils');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method !== 'POST') return res.status(405).end();

  let userId;
  try {
    ({ userId } = verifyJWT(getToken(req)));
  } catch {
    return res.status(401).json({ error: '未登录' });
  }

  const { spreadType, question, cardsJson, aiReading } = req.body;
  if (!spreadType || !cardsJson) return res.status(400).json({ error: '参数缺失' });

  const reading = await sbPost('readings', {
    user_id: userId,
    spread_type: spreadType,
    question: question || '',
    cards_json: cardsJson,
    ai_reading: aiReading || ''
  });

  res.status(200).json({ success: true, readingId: reading?.[0]?.id });
};
