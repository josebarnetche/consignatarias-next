/**
 * Apply RLS fix via Supabase Database API
 */

const SUPABASE_URL = 'https://nyqkgorazkwcufkzxmhd.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im55cWtnb3Jhemt3Y3Vma3p4bWhkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTExMTQzNCwiZXhwIjoyMDg0Njg3NDM0fQ.wsZ81F9rnp2Emev-Pk3Zdk4879U913VKAJKgGWWafKg';

const SQL = `
-- Enable RLS on ALL tables
ALTER TABLE IF EXISTS consignatarias ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS consignataria_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS consignataria_auctions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS consignataria_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS user_dtes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS user_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS alertas ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS alerta_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS frigorifico_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS frigorifico_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS profile_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS outreach_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS point_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS newsletter_subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS remitente_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS market_price_snapshots ENABLE ROW LEVEL SECURITY;

-- Add public read policies where needed
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'consignatarias' AND policyname = 'consignatarias_public_read') THEN
    CREATE POLICY consignatarias_public_read ON consignatarias FOR SELECT USING (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'consignataria_auctions' AND policyname = 'auctions_public_read') THEN
    CREATE POLICY auctions_public_read ON consignataria_auctions FOR SELECT USING (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'consignataria_videos' AND policyname = 'videos_public_read') THEN
    CREATE POLICY videos_public_read ON consignataria_videos FOR SELECT USING (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'frigorifico_profiles' AND policyname = 'frigorificos_public_read') THEN
    CREATE POLICY frigorificos_public_read ON frigorifico_profiles FOR SELECT USING (true);
  END IF;
END $$;
`;

async function applyRLS() {
  console.log('🔒 Attempting to apply RLS fix...\n');

  // Try the pg_query endpoint (some Supabase instances have this)
  const endpoints = [
    '/pg/query',
    '/rest/v1/rpc/query', 
    '/query'
  ];

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(`${SUPABASE_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'apikey': SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: SQL })
      });

      if (response.ok) {
        const result = await response.json();
        console.log(`✅ Success via ${endpoint}:`, result);
        return;
      }
      
      console.log(`❌ ${endpoint}: ${response.status}`);
    } catch (e) {
      console.log(`❌ ${endpoint}: ${e.message}`);
    }
  }

  console.log('\n⚠️ Cannot execute SQL directly via API.');
  console.log('\n📋 MANUAL FIX REQUIRED:');
  console.log('');
  console.log('1. Open: https://supabase.com/dashboard/project/nyqkgorazkwcufkzxmhd/sql/new');
  console.log('');
  console.log('2. Paste this SQL and click RUN:\n');
  console.log('─'.repeat(60));
  console.log(SQL);
  console.log('─'.repeat(60));
}

applyRLS();
