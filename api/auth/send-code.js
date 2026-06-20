const { sbPost, sbDelete, sendSMS } = require('../_utils');

function generateCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method !== 'POST') return res.status(405).end();

  const { phone } = req.body;
  if (!phone || !/^1[3-9]\d{9}$/.test(phone)) {
    return res.status(400).json({ error: '手机号格式不正确' });
  }

  const code = generateCode();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

  await sbDelete('sms_codes', `phone=eq.${phone}`);
  await sbPost('sms_codes', { phone, code, expires_at: expiresAt }, 'return=minimal');

  try {
    await sendSMS(phone, code);
  } catch (err) {
    return res.status(500).json({ error: '短信发送失败，请稍后重试' });
  }

  res.status(200).json({ success: true });
};
