import { NextRequest, NextResponse } from 'next/server'
import { requireServiceClient } from '@/lib/supabase'
import { sendDteUploadReminder, sendFirstDteSuccess, sendDteRetentionReminder } from '@/lib/email'

/**
 * POST /api/cron/onboarding-emails
 * 
 * Sends onboarding emails based on user activation status:
 * 1. Welcome email - immediately after signup (via auth webhook)
 * 2. DT-e reminder - 24-72h after signup if no DT-e uploaded (this cron)
 * 3. First DT-e success - after first upload (this cron)
 * 
 * Run daily via Vercel Cron at 10:00 AM (good time for farmers).
 */

const CRON_SECRET = process.env.CRON_SECRET

export async function POST(request: NextRequest) {
  // Auth check
  const authHeader = request.headers.get('authorization')
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = requireServiceClient()
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

  const reminderSent = results.filter(r => r.status === 'sent').length
  const reminderSkipped = results.filter(r => r.status === 'skipped').length
  const reminderErrors = results.filter(r => r.status === 'error').length

  // ============================================================
  // PART 2: First DT-e Success Emails
  // Find users who uploaded their first DT-e and haven't received
  // the success email yet.
  // ============================================================

  const successResults: Array<{
    userId: string
    email: string
    status: 'sent' | 'skipped' | 'error'
    reason?: string
    dteCount?: number
  }> = []

  // Find users with DT-e uploads who haven't been sent the success email
  const { data: usersWithDteUploads } = await supabase
    .from('user_dtes')
    .select('user_id')
    .order('created_at', { ascending: false })
    .limit(100)

  if (usersWithDteUploads && usersWithDteUploads.length > 0) {
    // Get unique user IDs
    const uniqueUserIds = [...new Set(usersWithDteUploads.map(d => d.user_id))]
    
    // Check who already received success email
    const { data: alreadySentSuccess } = await supabase
      .from('outreach_log')
      .select('user_id')
      .eq('type', 'first_dte_success')
      .in('user_id', uniqueUserIds)

    const successSentSet = new Set(alreadySentSuccess?.map(r => r.user_id) || [])

    // Get user details for those who need the email
    const needSuccessEmail = uniqueUserIds.filter(id => !successSentSet.has(id))

    if (needSuccessEmail.length > 0) {
      const { data: usersNeedingSuccess } = await supabase
        .from('users')
        .select('id, email, display_name')
        .in('id', needSuccessEmail)

      for (const user of usersNeedingSuccess || []) {
        if (!user.email) {
          successResults.push({
            userId: user.id,
            email: '',
            status: 'skipped',
            reason: 'No email'
          })
          continue
        }

        // Get their DT-e count
        const { count } = await supabase
          .from('user_dtes')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)

        const dteCount = count || 1

        const result = await sendFirstDteSuccess({
          to: user.email,
          userName: user.display_name || undefined,
          dteCount
        })

        if (result.success) {
          try {
            await supabase.from('outreach_log').insert({
              type: 'first_dte_success',
              user_id: user.id,
              email_sent_to: user.email,
            })
          } catch {
            // Don't fail if logging fails
          }

          successResults.push({
            userId: user.id,
            email: user.email,
            status: 'sent',
            dteCount
          })
        } else {
          successResults.push({
            userId: user.id,
            email: user.email,
            status: 'error',
            reason: result.error
          })
        }
      }
    }
  }

  const successSent = successResults.filter(r => r.status === 'sent').length
  const successSkipped = successResults.filter(r => r.status === 'skipped').length
  const successErrors = successResults.filter(r => r.status === 'error').length

  // ============================================================
  // PART 3: DT-e Retention Emails (Insight #101)
  // Re-engage users who uploaded DTEs but stopped (7+ days inactive).
  // Sent weekly (every 7 days per user) to avoid spam.
  // ============================================================

  const retentionResults: Array<{
    userId: string
    email: string
    status: 'sent' | 'skipped' | 'error'
    reason?: string
    daysSinceLastUpload?: number
    totalDtes?: number
  }> = []

  // Find users who have uploaded DTEs and last upload was 7+ days ago
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

  // Get users with DTEs, ordered by most recent upload
  const { data: inactiveUsers } = await supabase
    .from('user_dtes')
    .select('user_id, created_at')
    .lte('created_at', sevenDaysAgo.toISOString())
    .order('created_at', { ascending: false })

  if (inactiveUsers && inactiveUsers.length > 0) {
    // Group by user_id to find last upload date
    const userLastUpload: Record<string, Date> = {}
    const userDteCounts: Record<string, number> = {}
    
    for (const dte of inactiveUsers) {
      const userId = dte.user_id
      const uploadDate = new Date(dte.created_at)
      
      if (!userLastUpload[userId] || uploadDate > userLastUpload[userId]) {
        userLastUpload[userId] = uploadDate
      }
      userDteCounts[userId] = (userDteCounts[userId] || 0) + 1
    }

    // Filter to users whose MOST RECENT upload was 7+ days ago
    const eligibleUserIds = Object.entries(userLastUpload)
      .filter(([, lastDate]) => lastDate <= sevenDaysAgo)
      .map(([userId]) => userId)

    if (eligibleUserIds.length > 0) {
      // Check who already received a retention email in the last 7 days
      const sevenDaysAgoStr = sevenDaysAgo.toISOString()
      const { data: recentRetention } = await supabase
        .from('outreach_log')
        .select('user_id')
        .eq('type', 'dte_retention_reminder')
        .gte('created_at', sevenDaysAgoStr)
        .in('user_id', eligibleUserIds)

      const recentRetentionSet = new Set(recentRetention?.map(r => r.user_id) || [])

      // Get user details
      const { data: usersForRetention } = await supabase
        .from('users')
        .select('id, email, display_name')
        .in('id', eligibleUserIds.filter(id => !recentRetentionSet.has(id)))
        .limit(20) // Limit to 20 per day to avoid overwhelming

      // Get total cabezas for each user
      const userCabezas: Record<string, number> = {}
      if (usersForRetention && usersForRetention.length > 0) {
        const { data: dteStats } = await supabase
          .from('user_dtes')
          .select('user_id, cabezas')
          .in('user_id', usersForRetention.map(u => u.id))

        for (const dte of dteStats || []) {
          userCabezas[dte.user_id] = (userCabezas[dte.user_id] || 0) + (dte.cabezas || 0)
        }
      }

      for (const user of usersForRetention || []) {
        if (!user.email) {
          retentionResults.push({
            userId: user.id,
            email: '',
            status: 'skipped',
            reason: 'No email'
          })
          continue
        }

        const lastUpload = userLastUpload[user.id]
        const daysSince = Math.floor((now.getTime() - lastUpload.getTime()) / (24 * 60 * 60 * 1000))
        const totalDtes = userDteCounts[user.id] || 0
        const totalCabezas = userCabezas[user.id] || 0

        const result = await sendDteRetentionReminder({
          to: user.email,
          userName: user.display_name || undefined,
          daysSinceLastUpload: daysSince,
          totalDtes,
          totalCabezas
        })

        if (result.success) {
          try {
            await supabase.from('outreach_log').insert({
              type: 'dte_retention_reminder',
              user_id: user.id,
              email_sent_to: user.email,
            })
          } catch {
            // Don't fail if logging fails
          }

          retentionResults.push({
            userId: user.id,
            email: user.email,
            status: 'sent',
            daysSinceLastUpload: daysSince,
            totalDtes
          })
        } else {
          retentionResults.push({
            userId: user.id,
            email: user.email,
            status: 'error',
            reason: result.error
          })
        }
      }
    }
  }

  const retentionSent = retentionResults.filter(r => r.status === 'sent').length
  const retentionSkipped = retentionResults.filter(r => r.status === 'skipped').length
  const retentionErrors = retentionResults.filter(r => r.status === 'error').length

  return NextResponse.json({
    reminders: {
      window: { from: threeDaysAgo.toISOString(), to: oneDayAgo.toISOString() },
      totalUsers: recentUsers.length,
      sent: reminderSent,
      skipped: reminderSkipped,
      errors: reminderErrors,
      results
    },
    successEmails: {
      sent: successSent,
      skipped: successSkipped,
      errors: successErrors,
      results: successResults
    },
    retentionEmails: {
      sent: retentionSent,
      skipped: retentionSkipped,
      errors: retentionErrors,
      results: retentionResults
    },
    totalSent: reminderSent + successSent + retentionSent
  })
}

// Allow GET for manual testing
export async function GET(request: NextRequest) {
  return POST(request)
}
