/**
 * Consignatarias Outreach Script
 * 
 * Sends emails to unclaimed consignatarias inviting them to claim their free profile.
 * 
 * Usage:
 *   npx ts-node scripts/outreach-unclaimed.ts --dry-run
 *   npx ts-node scripts/outreach-unclaimed.ts --send --limit 5
 */

import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

// Config
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const RESEND_API_KEY = process.env.RESEND_API_KEY!

// Only `consignatarias.com` is verified in Resend. memola.media + memola.com.ar
// would silently fail. Match the FROM_PERSONAL convention in src/lib/email.ts.
const FROM_EMAIL = 'José Barnetche <hola@consignatarias.com>'
const APP_URL = 'https://www.consignatarias.com.ar'

// Email template
function buildEmail(displayName: string, slug: string) {
  const subject = `${displayName} - Reclamá tu perfil gratis en Consignatarias.com.ar`
  
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #1d1d1f; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { border-bottom: 2px solid #22c55e; padding-bottom: 16px; margin-bottom: 24px; }
    .cta { display: inline-block; background: #22c55e; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 16px 0; }
    .footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid #e5e5e5; color: #6e6e73; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <strong>Consignatarias.com.ar</strong> — Directorio Ganadero
    </div>
    
    <p>Hola,</p>
    
    <p>Soy José Barnetche de Consignatarias.com.ar, el directorio de remates ganaderos más completo de Argentina.</p>
    
    <p>Vi que <strong>${displayName}</strong> ya aparece en nuestro directorio, pero su perfil todavía no está reclamado.</p>
    
    <p><strong>Podés reclamar tu perfil GRATIS</strong> y completar tus datos para:</p>
    <ul>
      <li>Aparecer destacado en las búsquedas de tu zona</li>
      <li>Mostrar tus datos de contacto (teléfono, WhatsApp, email)</li>
      <li>Publicar descripción y logo de tu consignataria</li>
      <li>Recibir consultas directas de productores</li>
    </ul>
    
    <p>Miles de productores usan Consignatarias.com.ar para encontrar remates en su zona. Tu perfil completo = más visibilidad.</p>
    
    <a href="${APP_URL}/consignatarias/${slug}" class="cta">Ver mi perfil →</a>
    
    <p>Para reclamar tu perfil, entrá al link de arriba y hacé clic en "Reclamar este perfil". Es gratis y tarda 2 minutos.</p>
    
    <p>¿Dudas? Respondé este email directamente.</p>
    
    <p>Saludos,<br>
    <strong>José Barnetche</strong><br>
    Consignatarias.com.ar</p>
    
    <div class="footer">
      Este email fue enviado porque ${displayName} aparece listado en consignatarias.com.ar<br>
      Si no querés recibir más emails, respondé con "BAJA" y te quitamos de la lista.
    </div>
  </div>
</body>
</html>
  `
  
  return { subject, html }
}

async function main() {
  const args = process.argv.slice(2)
  const dryRun = args.includes('--dry-run')
  const limitArg = args.find(a => a.startsWith('--limit='))
  const limit = limitArg ? parseInt(limitArg.split('=')[1]) : 10
  
  console.log(`\n[CONSIGNATARIAS OUTREACH]`)
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'LIVE SEND'}`)
  console.log(`Limit: ${limit}`)
  console.log('-'.repeat(50))
  
  // Init clients
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
  const resend = new Resend(RESEND_API_KEY)
  
  // Get unclaimed consignatarias with email
  const { data: unclaimed, error } = await supabase
    .from('consignatarias')
    .select('canonical_slug, display_name, email')
    .is('claimed_at', null)
    .not('email', 'is', null)
    .limit(limit)
  
  if (error) {
    console.error('Supabase error:', error)
    return
  }
  
  if (!unclaimed || unclaimed.length === 0) {
    console.log('No unclaimed consignatarias with email found.')
    return
  }
  
  console.log(`Found ${unclaimed.length} unclaimed consignatarias with email\n`)
  
  let sent = 0
  let failed = 0
  
  for (const consig of unclaimed) {
    const { subject, html } = buildEmail(consig.display_name, consig.canonical_slug)
    
    console.log(`TO: ${consig.email}`)
    console.log(`SUBJECT: ${subject}`)
    
    if (dryRun) {
      console.log('[DRY RUN] Would send\n')
      sent++
      continue
    }
    
    try {
      const result = await resend.emails.send({
        from: FROM_EMAIL,
        to: consig.email,
        subject,
        html,
        tags: [
          { name: 'campaign', value: 'consig-claim-outreach' },
          { name: 'consignataria', value: consig.canonical_slug }
        ]
      })
      
      console.log(`[OK] Sent: ${result.data?.id}\n`)
      sent++
      
      // Log to outreach_log table (ignore errors if table doesn't exist)
      try {
        await supabase.from('outreach_log').insert({
          consignataria_slug: consig.canonical_slug,
          email: consig.email,
          campaign: 'claim-outreach',
          sent_at: new Date().toISOString(),
          resend_id: result.data?.id
        })
      } catch { /* ignore */ }
      
    } catch (err) {
      console.log(`[X] Failed: ${err}\n`)
      failed++
    }
    
    // Rate limit
    await new Promise(r => setTimeout(r, 500))
  }
  
  console.log('-'.repeat(50))
  console.log(`DONE: Sent ${sent}, Failed ${failed}`)
}

main().catch(console.error)
