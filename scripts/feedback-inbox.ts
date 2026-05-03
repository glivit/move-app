/**
 * feedback-inbox.ts — Claude-side leesinterface voor de DevFeedbackWidget.
 *
 * Usage:
 *   npx tsx scripts/feedback-inbox.ts                  # alle open items
 *   npx tsx scripts/feedback-inbox.ts --status=resolved # opgeloste items
 *   npx tsx scripts/feedback-inbox.ts --resolve=<id>   # markeer 1 item resolved
 *   npx tsx scripts/feedback-inbox.ts --commit=<sha> --resolve=<id>
 *
 * Output: markdown briefing per item, klaar om door te geven aan
 * Claude Code voor implementatie.
 */

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { resolve } from 'path'

config({ path: resolve(process.cwd(), '.env.local') })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

interface FeedbackItem {
  id: string
  created_at: string
  user_id: string
  url: string
  viewport_width: number | null
  viewport_height: number | null
  user_agent: string | null
  element_selector: string | null
  element_html: string | null
  element_text: string | null
  element_bbox: { x: number; y: number; width: number; height: number } | null
  element_styles: Record<string, string> | null
  comment: string
  severity: 'blocker' | 'major' | 'minor' | 'nit'
  category: string | null
  screenshot_url: string | null
  status: string
  resolved_at: string | null
  resolved_commit: string | null
  resolved_notes: string | null
}

function severityIcon(s: string): string {
  return { blocker: '🔴', major: '🟠', minor: '🟡', nit: '⚪' }[s] || '⚫'
}

function formatItem(it: FeedbackItem): string {
  const lines: string[] = []
  lines.push(`## ${severityIcon(it.severity)} [${it.severity.toUpperCase()}] ${it.id.slice(0, 8)}`)
  lines.push('')
  lines.push(`**Wanneer:** ${new Date(it.created_at).toLocaleString('nl-BE')}`)
  lines.push(`**Pagina:** \`${it.url}\``)
  if (it.category) lines.push(`**Categorie:** ${it.category}`)
  if (it.viewport_width && it.viewport_height) {
    lines.push(`**Viewport:** ${it.viewport_width}×${it.viewport_height}`)
  }
  lines.push('')
  lines.push(`**User feedback:**`)
  lines.push(`> ${it.comment.split('\n').join('\n> ')}`)
  lines.push('')

  if (it.element_selector) {
    lines.push(`**Element:**`)
    lines.push('```css')
    lines.push(it.element_selector)
    lines.push('```')
    if (it.element_text) {
      lines.push(`Text: \`${it.element_text.slice(0, 120)}${it.element_text.length > 120 ? '…' : ''}\``)
    }
    if (it.element_styles) {
      const interesting = ['color', 'backgroundColor', 'fontSize', 'fontWeight']
        .map(k => it.element_styles?.[k] ? `${k}: ${it.element_styles[k]}` : null)
        .filter(Boolean)
        .join(', ')
      if (interesting) lines.push(`Computed: \`${interesting}\``)
    }
    if (it.element_bbox) {
      lines.push(`Bounding box: x=${it.element_bbox.x} y=${it.element_bbox.y} w=${it.element_bbox.width} h=${it.element_bbox.height}`)
    }
    lines.push('')
  }

  if (it.element_html) {
    lines.push(`<details><summary>Element HTML snippet</summary>`)
    lines.push('')
    lines.push('```html')
    lines.push(it.element_html.slice(0, 600))
    lines.push('```')
    lines.push('')
    lines.push(`</details>`)
    lines.push('')
  }

  lines.push(`**Resolve command:**`)
  lines.push('```bash')
  lines.push(`npx tsx scripts/feedback-inbox.ts --resolve=${it.id} --commit=$(git rev-parse HEAD) --notes="…"`)
  lines.push('```')
  lines.push('')
  lines.push('---')
  lines.push('')
  return lines.join('\n')
}

async function listItems(status: string) {
  const { data, error } = await admin
    .from('dev_feedback')
    .select('*')
    .eq('status', status)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Query failed:', error.message)
    process.exit(1)
  }
  if (!data?.length) {
    console.log(`# Geen ${status} feedback items.`)
    return
  }

  const grouped = {
    blocker: [] as FeedbackItem[],
    major: [] as FeedbackItem[],
    minor: [] as FeedbackItem[],
    nit: [] as FeedbackItem[],
  }
  for (const it of data as FeedbackItem[]) {
    grouped[it.severity].push(it)
  }

  console.log(`# Feedback Inbox · ${status} · ${data.length} item${data.length === 1 ? '' : 's'}`)
  console.log('')
  console.log(`Generated: ${new Date().toLocaleString('nl-BE')}`)
  console.log('')
  console.log(`Severity breakdown: ${grouped.blocker.length} blocker · ${grouped.major.length} major · ${grouped.minor.length} minor · ${grouped.nit.length} nit`)
  console.log('')
  console.log('---')
  console.log('')

  for (const sev of ['blocker', 'major', 'minor', 'nit'] as const) {
    for (const item of grouped[sev]) {
      console.log(formatItem(item))
    }
  }
}

async function resolveItem(id: string, commit?: string, notes?: string) {
  const { data, error } = await admin
    .from('dev_feedback')
    .update({
      status: 'resolved',
      resolved_at: new Date().toISOString(),
      resolved_commit: commit ?? null,
      resolved_notes: notes ?? null,
    })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Update failed:', error.message)
    process.exit(1)
  }
  console.log(`✅ Resolved: ${data.id}`)
  if (commit) console.log(`   commit: ${commit}`)
  if (notes) console.log(`   notes: ${notes}`)
}

// CLI args parsing
const args = process.argv.slice(2)
const argMap: Record<string, string> = {}
for (const a of args) {
  const m = a.match(/^--(\w+)=(.*)$/)
  if (m) argMap[m[1]] = m[2]
  else if (a.startsWith('--')) argMap[a.slice(2)] = 'true'
}

if (argMap.resolve) {
  resolveItem(argMap.resolve, argMap.commit, argMap.notes)
} else {
  listItems(argMap.status || 'open')
}
