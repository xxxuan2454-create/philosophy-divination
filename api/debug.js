module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const info = {
    hasSupabaseUrl: !!process.env.SUPABASE_URL,
    supabaseUrlPrefix: (process.env.SUPABASE_URL || '').substring(0, 20) + '...',
    hasSupabaseKey: !!process.env.SUPABASE_SERVICE_KEY,
    supabaseKeyPrefix: (process.env.SUPABASE_SERVICE_KEY || '').substring(0, 10) + '...',
    hasEditorPassword: !!process.env.EDITOR_PASSWORD,
    nodeVersion: process.version,
    // Test fetch to Supabase
    fetchTest: null,
  };

  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY) {
    try {
      const testUrl = `${process.env.SUPABASE_URL}/rest/v1/users?select=id&limit=1`;
      const response = await fetch(testUrl, {
        headers: {
          'apikey': process.env.SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_KEY}`
        }
      });
      info.fetchTest = {
        status: response.status,
        ok: response.ok,
        body: await response.text().catch(e => e.message),
      };
    } catch (err) {
      info.fetchTest = { error: err.message, stack: err.stack };
    }
  }

  res.status(200).json(info);
};
