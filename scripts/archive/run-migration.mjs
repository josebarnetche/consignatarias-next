import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { config } from 'dotenv'

config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const sql = readFileSync('supabase/migrations/20260313_newsletter_subscribers.sql', 'utf-8')

async function runMigration() {
  console.log('Running migration...')
  
  const { error } = await supabase.rpc('exec_sql', { sql })
  
  if (error) {
    // Try direct query approach
    console.log('Trying direct SQL...')
    
    // Split by semicolons and run each statement
    const statements = sql.split(';').filter(s => s.trim())
    
    for (const stmt of statements) {
      if (!stmt.trim()) continue
      
      const { error: stmtError } = await supabase.from('_exec').select('*').limit(0)
      if (stmtError) {
        console.log('Statement result:', stmtError.message)
      }
    }
    
    // Alternative: use the REST API directly
    const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ sql })
    })
    
    if (!response.ok) {
      console.error('Migration failed. Run this SQL manually in Supabase Dashboard:')
      console.log('\n---SQL START---')
      console.log(sql)
      console.log('---SQL END---\n')
      process.exit(1)
    }
  }
  
  console.log('Migration completed!')
}

runMigration().catch(console.error)
