const crypto = require('crypto');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
const JWT_SECRET   = process.env.JWT_SECRET || 'dev-secret';

/* ── Supabase REST helpers ── */
async function sbGet(path) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: {
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'apikey': SUPABASE_KEY,
    }
  });
  return res.json();
}

async function sbPost(table, data, prefer = 'return=representation') {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'apikey': SUPABASE_KEY,
      'Prefer': prefer,
    },
    body: JSON.stringify(data)
  });
  return res.json();
}

async function sbPatch(table, filter, data) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${filter}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'apikey': SUPABASE_KEY,
      'Prefer': 'return=representation',
    },
    body: JSON.stringify(data)
  });
  return res.json();
}

async function sbDelete(table, filter) {
  await fetch(`${SUPABASE_URL}/rest/v1/${table}?${filter}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'apikey': SUPABASE_KEY,
    }
  });
}

/* ── JWT (HS256, no dependencies) ── */
function b64url(str) {
  return Buffer.from(str).toString('base64url');
}

function signJWT(payload) {
  const header = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body   = b64url(JSON.stringify({ ...payload, iat: Math.floor(Date.now() / 1000) }));
  const sig    = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${sig}`;
}

function verifyJWT(token) {
  if (!token) throw new Error('No token');
  const [header, body, sig] = token.split('.');
  const expected = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${body}`).digest('base64url');
  if (expected !== sig) throw new Error('Invalid token');
  return JSON.parse(Buffer.from(body, 'base64url').toString());
}

function getToken(req) {
  const auth = req.headers.authorization || '';
  return auth.replace('Bearer ', '');
}

/* ── 阿里云短信 ── */
function encodeRFC3986(str) {
  return encodeURIComponent(String(str)).replace(/[!'()*]/g, c => '%' + c.charCodeAt(0).toString(16).toUpperCase());
}

async function sendSMS(phone, code) {
  if (!process.env.ALIYUN_SMS_ACCESS_KEY) {
    console.log(`[DEV] 验证码 ${phone}: ${code}`);
    return;
  }
  const params = {
    AccessKeyId:      process.env.ALIYUN_SMS_ACCESS_KEY,
    Action:           'SendSms',
    Format:           'JSON',
    PhoneNumbers:     phone,
    SignName:         process.env.ALIYUN_SMS_SIGN,
    SignatureMethod:  'HMAC-SHA1',
    SignatureNonce:   crypto.randomUUID(),
    SignatureVersion: '1.0',
    TemplateCode:     process.env.ALIYUN_SMS_TEMPLATE,
    TemplateParam:    JSON.stringify({ code }),
    Timestamp:        new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
    Version:          '2017-05-25',
  };
  const qs = Object.keys(params).sort().map(k => `${encodeRFC3986(k)}=${encodeRFC3986(params[k])}`).join('&');
  const str = `POST&${encodeRFC3986('/')}&${encodeRFC3986(qs)}`;
  params.Signature = crypto.createHmac('sha1', process.env.ALIYUN_SMS_SECRET + '&').update(str).digest('base64');
  const body = new URLSearchParams(params).toString();
  const res = await fetch('https://dysmsapi.aliyuncs.com/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body
  });
  const result = await res.json();
  if (result.Code !== 'OK') throw new Error(`SMS: ${result.Message}`);
}

module.exports = { sbGet, sbPost, sbPatch, sbDelete, signJWT, verifyJWT, getToken, sendSMS };
