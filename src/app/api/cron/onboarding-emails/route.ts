import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { sendWelcomeEmail, sendDteUploadReminder, sendFirstDteSuccess } from '@/lib/email'

/**
 * POST /api/cron/onboarding-emails
 * 
 * Sends onboarding emails based on user activation status:
 * 1. Welcome email - immediately after signup (via auth webhook, not this cron)
 * 2. DT-e reminder - 24-48h after signup if no DT-e uploaded
 * 3. First DT-e success - after first upload (via upload handler, not this cron)
 * 
 * This cron handles step 2: activation reminders.
 * Run daily via Vercel Cron at 10:00 AM (good time for farmers).
 */

const CRON_SECRET = process.env.CRON_SECRET

export async function POST(request: NextRequest) {
  // Auth check
  const authHeader = request.headers.get('authorization')
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()
  const now = new Date()
  
  // Find users who:
  // 1. Signed up 24-72h ago (window for reminder)
  // 2. Have NOT uploaded any DT-e
  // 3. Have NOT been sent a reminder yet
  
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)
  const threeDaysAgo = new Date(now.getTime() - 72 * 60 * 60 * 1000)

  // Get users who signed up in the reminder window
  const { data: recentUsers, error: userError } = await supabase
    .from('users')
    .select('id, email, display_name, created_at')
    .gte('created_at', threeDaysAgo.toISOString())
    .lte('created_at', oneDayAgo.toISOString())

  if (userError) {
    return NextResponse.json({ error: 'Failed to fetch users', details: userError }, { status: 500 })
  }

  if (!recentUsers || recentUsers.length === 0) {
    return NextResponse.json({
      message: 'No users in reminder window',
      window: { from: threeDaysAgo.toISOString(), to: oneDayAgo.toISOString() },
      sent: 0
    })
  }

  const results: Array<{
    userId: string
    email: string
    status: 'sent' | 'skipped' | 'error'
    reason?: string
  }> = []

  // Check which users have already been sent a reminder
  const { data: alreadyReminded } = await supabase
    .from('outreach_log')
    .select('user_id')
    .eq('type', 'dte_upload_reminder')
    .in('user_id', recentUsers.map(u => u.id))

  const remindedSet = new Set(alreadyReminded?.map(r => r.user_id) || [])

  // Check which users have uploaded DTEs
  const { data: usersWithDtes } = await supabase
    .from('user_dtes')
    .select('user_id')
    .in('user_id', recentUsers.map(u => u.id))

  const hasUploadedSet = new Set(usersWithDtes?.map(d => d.user_id) || [])

  for (const user of recentUsers) {
    // Skip if already reminded
    if (remindedSet.has(user.id)) {
      results.push({
        userId: user.id,
        email: user.email || '',
        status: 'skipped',
        reason: 'Already sent reminder'
      })
      continue
    }

    // Skip if already uploaded DT-e (they're activated!)
    if (hasUploadedSet.has(user.id)) {
      results.push({
        userId: user.id,
        email: user.email || '',
        status: 'skipped',
        reason: 'Already uploaded DT-e'
      })
      continue
    }

    // Skip if no email
    if (!user.email) {
      results.push({
        userId: user.id,
        email: '',
        status: 'skipped',
        reason: 'No email'
      })
      continue
    }

    // Calculate days since signup
    const signupDate = new Date(user.created_at)
    const daysSince = Math.floor((now.getTime() - signupDate.getTime()) / (24 * 60 * 60 * 1000))

    // Send reminder
    const result = await sendDteUploadReminder({
      to: user.email,
      userName: user.display_name || undefined,
      daysSinceSignup: daysSince
    })

    if (result.success) {
      // Log the send
      try {
        await supabase.from('outreach_log').insert({
          type: 'dte_upload_reminder',
          user_id: user.id,
          email_sent_to: user.email,
        })
      } catch {
        // Don't fail if logging fails
      }

      results.push({
        userId: user.id,
        email: user.email,
        status: 'sent'
      })
    } else {
      results.push({
        userId: user.id,
        email: user.email,
        status: 'error',
        reason: result.error
      })
    }
  }

  const sent = results.filter(r => r.status === 'sent').length
  const skipped = results.filter(r => r.status === 'skipped').length
  const errors = results.filter(r => r.status === 'error').length

  return NextResponse.json({
    window: { from: threeDaysAgo.toISOString(), to: oneDayAgo.toISOString() },
    totalUsers: recentUsers.length,
    sent,
    skipped,
    errors,
    results
  })
}

// Allow GET for manual testing
export async function GET(request: NextRequest) {
  return POST(request)
}

// Export email functions for use in other handlers (e.g., auth webhook, DT-e upload)
export { sendWelcomeEmail, sendFirstDteSuccess }
