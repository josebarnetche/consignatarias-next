/**
 * Apply RLS fix to Supabase database
 * Executes the migration SQL via Supabase REST API
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const SUPABASE_URL = 'https://nyqkgorazkwcufkzxmhd.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im55cWtnb3Jhemt3Y3Vma3p4bWhkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTExMTQzNCwiZXhwIjoyMDg0Njg3NDM0fQ.wsZ81F9rnp2Emev-Pk3Zdk4879U913VKAJKgGWWafKg';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

// Split SQL into individual statements for execution
const sqlStatements = [
  // Enable RLS on all tables
  `ALTER TABLE IF EXISTS consignatarias ENABLE ROW LEVEL SECURITY`,
  `ALTER TABLE IF EXISTS consignataria_claims ENABLE ROW LEVEL SECURITY`,
  `ALTER TABLE IF EXISTS consignataria_auctions ENABLE ROW LEVEL SECURITY`,
  `ALTER TABLE IF EXISTS consignataria_videos ENABLE ROW LEVEL SECURITY`,
  `ALTER TABLE IF EXISTS user_roles ENABLE ROW LEVEL SECURITY`,
  `ALTER TABLE IF EXISTS user_dtes ENABLE ROW LEVEL SECURITY`,
  `ALTER TABLE IF EXISTS user_favorites ENABLE ROW LEVEL SECURITY`,
  `ALTER TABLE IF EXISTS subscriptions ENABLE ROW LEVEL SECURITY`,
  `ALTER TABLE IF EXISTS alertas ENABLE ROW LEVEL SECURITY`,
  `ALTER TABLE IF EXISTS alerta_logs ENABLE ROW LEVEL SECURITY`,
  `ALTER TABLE IF EXISTS frigorifico_claims ENABLE ROW LEVEL SECURITY`,
  `ALTER TABLE IF EXISTS frigorifico_profiles ENABLE ROW LEVEL SECURITY`,
  `ALTER TABLE IF EXISTS profile_views ENABLE ROW LEVEL SECURITY`,
  `ALTER TABLE IF EXISTS outreach_log ENABLE ROW LEVEL SECURITY`,
  `ALTER TABLE IF EXISTS point_transactions ENABLE ROW LEVEL SECURITY`,
  `ALTER TABLE IF EXISTS newsletter_subscribers ENABLE ROW LEVEL SECURITY`,
  `ALTER TABLE IF EXISTS webhooks ENABLE ROW LEVEL SECURITY`,
  `ALTER TABLE IF EXISTS remitente_entries ENABLE ROW LEVEL SECURITY`,
  `ALTER TABLE IF EXISTS market_price_snapshots ENABLE ROW LEVEL SECURITY`,
];

async function applyRLSFix() {
  console.log('🔒 Applying RLS fix to Supabase...\n');
  
  // First, check current RLS status
  console.log('📋 Checking current RLS status...');
  const { data: tables, error: checkError } = await supabase.rpc('check_rls_status');
  
  if (checkError) {
    console.log('Note: check_rls_status function not found, proceeding with fix anyway\n');
  } else {
    console.log('Current status:', tables);
  }
  
  // Use the SQL endpoint via fetch since supabase-js doesn't support raw SQL
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: sqlStatements.join('; ')
    })
  });

  if (!response.ok) {
    // exec_sql function doesn't exist, try alternative
    console.log('Note: exec_sql RPC not available, using alternative method...\n');
    
    // We'll need to create the policies via the dashboard or use pg directly
    // For now, let's verify what we can via the client
    
    console.log('✅ RLS statements prepared. Apply via Supabase Dashboard:\n');
    console.log('1. Go to: https://supabase.com/dashboard/project/nyqkgorazkwcufkzxmhd/sql/new');
    console.log('2. Paste and run the migration file:\n');
    console.log('   supabase/migrations/20260323_rls_audit_fix.sql\n');
    
    // Try to at least verify table existence
    console.log('📊 Verifying tables exist...');
    
    const tablesToCheck = [
      'consignatarias', 'consignataria_claims', 'user_roles', 'subscriptions',
      'alertas', 'profile_views', 'newsletter_subscribers'
    ];
    
    for (const table of tablesToCheck) {
      const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true });
      if (error) {
        console.log(`  ❌ ${table}: ${error.message}`);
      } else {
        console.log(`  ✅ ${table}: exists (${count} rows)`);
      }
    }
    
    return;
  }

  console.log('✅ RLS fix applied successfully!');
}

applyRLSFix().catch(console.error);
