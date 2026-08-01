module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const info = {
    hasSupabaseUrl: !!process.env.SUPABASE_URL,
    supabaseUrl: process.env.SUPABASE_URL,
    supabaseUrlTrimmed: (process.env.SUPABASE_URL || '').trim(),
    hasSupabaseKey: !!process.env.SUPABASE_SERVICE_KEY,
    nodeVersion: process.version,
    tests: {},
  };

  const url = (process.env.SUPABASE_URL || '').trim();
  const key = process.env.SUPABASE_SERVICE_KEY || '';

  // Test 1: Simple HTTPS fetch to any site
  try {
    const r = await fetch('https://httpbin.org/get');
    info.tests.httpbin = { status: r.status, ok: r.ok };
  } catch (err) {
    info.tests.httpbin = { error: err.message, cause: err.cause?.message };
  }

  // Test 2: Fetch Supabase health/root
  try {
    const r = await fetch(url);
    info.tests.supabaseRoot = { status: r.status, ok: r.ok, text: (await r.text()).substring(0, 200) };
  } catch (err) {
    info.tests.supabaseRoot = { error: err.message, cause: err.cause?.message };
  }

  // Test 3: Fetch Supabase REST with apikey header
  try {
    const r = await fetch(`${url}/rest/v1/users?select=id&limit=1`, {
      headers: { 'apikey': key, 'Authorization': `Bearer ${key}` }
    });
    info.tests.supabaseREST = { status: r.status, ok: r.ok, text: (await r.text()).substring(0, 200) };
  } catch (err) {
    info.tests.supabaseREST = { error: err.message, cause: err.cause?.message };
  }

  res.status(200).json(info);
};
