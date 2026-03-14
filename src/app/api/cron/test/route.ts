import { createAdminClient } from '@/lib/supabase-admin'
import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

interface CronJobStatus {
  name: string
  endpoint: string
  lastRun: string | null
  status: 'pending' | 'running' | 'success' | 'failed'
}

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('Authorization')
    const cronSecret = process.env.CRON_SECRET

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const admin = createAdminClient()

    // List of cron jobs in the system
    const cronJobs: CronJobStatus[] = [
      {
        name: 'Send Prompts',
        endpoint: '/api/cron/send-prompts',
        lastRun: null,
        status: 'pending',
      },
      {
        name: 'Check-in Reminders',
        endpoint: '/api/cron/check-in-reminders',
        lastRun: null,
        status: 'pending',
      },
    ]

    // Try to fetch cron job status from database if available
    const { data: cronLogs, error: logsError } = await admin
      .from('cron_logs')
      .select('job_name, last_run, status')
      .order('last_run', { ascending: false })
      .limit(20)

    // Build status map from logs if table exists
    const statusMap: Record<string, { lastRun: string; status: string }> = {}
    if (!logsError && cronLogs) {
      for (const log of cronLogs) {
        if (!statusMap[log.job_name]) {
          statusMap[log.job_name] = {
            lastRun: log.last_run,
            status: log.status,
          }
        }
      }
    }

    // Update cronJobs with status information
    const jobsWithStatus = cronJobs.map((job) => ({
      ...job,
      lastRun: statusMap[job.name]?.lastRun || null,
      status: (statusMap[job.name]?.status || 'pending') as any,
    }))

    return NextResponse.json({
      success: true,
      message: 'Cron jobs health check',
      timestamp: new Date().toISOString(),
      cronJobs: jobsWithStatus,
      totalJobs: jobsWithStatus.length,
      databaseConnected: !logsError,
      databaseError: logsError?.message || null,
    })
  } catch (error) {
    console.error('Unexpected error in cron test:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
