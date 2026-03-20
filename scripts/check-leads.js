const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  "https://nyqkgorazkwcufkzxmhd.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im55cWtnb3Jhemt3Y3Vma3p4bWhkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTExMTQzNCwiZXhwIjoyMDg0Njg3NDM0fQ.wsZ81F9rnp2Emev-Pk3Zdk4879U913VKAJKgGWWafKg"
);

async function check() {
  const today = '2026-03-19';
  const yesterday = '2026-03-18';
  
  // Check for claimed profiles (recent activity)
  const { data: claims } = await supabase
    .from('consignatarias')
    .select('display_name, claimed_by_email, updated_at, verified')
    .not('claimed_by_email', 'is', null)
    .order('updated_at', { ascending: false })
    .limit(15);
  
  console.log('=== PERFILES RECLAMADOS (últimos) ===');
  if (claims && claims.length > 0) {
    claims.forEach(c => {
      const date = c.updated_at?.split('T')[0];
      const isRecent = date >= yesterday;
      const marker = isRecent ? '🆕' : '  ';
      console.log(marker, c.display_name, '|', c.claimed_by_email, '|', c.verified ? '✓' : '○', '|', date);
    });
  } else {
    console.log('Ninguno');
  }
  
  // Newsletter
  const { data: newsletter } = await supabase
    .from('newsletter_subscribers')
    .select('email, created_at, source')
    .order('created_at', { ascending: false })
    .limit(15);
  
  console.log('\n=== NEWSLETTER SIGNUPS (últimos) ===');
  if (newsletter && newsletter.length > 0) {
    newsletter.forEach(n => {
      const date = n.created_at?.split('T')[0];
      const isRecent = date >= yesterday;
      const marker = isRecent ? '🆕' : '  ';
      console.log(marker, n.email, '|', n.source || 'web', '|', date);
    });
  } else {
    console.log('Ninguno');
  }

  // Count totals
  const { count: totalClaims } = await supabase
    .from('consignatarias')
    .select('*', { count: 'exact', head: true })
    .not('claimed_by_email', 'is', null);
  
  const { count: totalNewsletter } = await supabase
    .from('newsletter_subscribers')
    .select('*', { count: 'exact', head: true });

  const { count: totalDTE } = await supabase
    .from('dte_records')
    .select('*', { count: 'exact', head: true });

  const { count: verifiedCount } = await supabase
    .from('consignatarias')
    .select('*', { count: 'exact', head: true })
    .eq('verified', true);
  
  console.log('\n=== TOTALES ===');
  console.log('Perfiles reclamados:', totalClaims || 0);
  console.log('Perfiles verificados:', verifiedCount || 0);
  console.log('Newsletter subs:', totalNewsletter || 0);
  console.log('DTE records:', totalDTE || 0);
  
  // Recent activity (last 48h)
  const { data: recentClaims } = await supabase
    .from('consignatarias')
    .select('*', { count: 'exact' })
    .not('claimed_by_email', 'is', null)
    .gte('updated_at', yesterday + 'T00:00:00');
    
  const { data: recentNewsletter } = await supabase
    .from('newsletter_subscribers')
    .select('*', { count: 'exact' })
    .gte('created_at', yesterday + 'T00:00:00');
  
  console.log('\n=== ÚLTIMAS 48H ===');
  console.log('Nuevos claims:', recentClaims?.length || 0);
  console.log('Nuevos newsletter:', recentNewsletter?.length || 0);
}

check().catch(e => console.error('Error:', e.message));
