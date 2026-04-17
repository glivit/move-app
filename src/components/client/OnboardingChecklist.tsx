'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { CheckCircle2, Circle, ChevronRight, Sparkles } from 'lucide-react'

interface ChecklistItem {
  id: string
  label: string
  href: string
  completed: boolean
}

export function OnboardingChecklist() {
  const [items, setItems] = useState<ChecklistItem[]>([])
  const [loading, setLoading] = useState(true)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    loadChecklist()
  }, [])

  async function loadChecklist() {
    try {
      const res = await fetch('/api/onboarding-status')
      if (res.ok) {
        const data = await res.json()
        setItems(data.items || [])
      }
    } catch {
      // Silently fail — don't show checklist
    } finally {
      setLoading(false)
    }
  }

  if (loading || dismissed) return null

  const completedCount = items.filter(i => i.completed).length
  const totalCount = items.length

  // All done or no items — don't show
  if (totalCount === 0 || completedCount === totalCount) return null

  const progress = (completedCount / totalCount) * 100

  return (
    <div
      className="card-elevated overflow-hidden animate-slide-up"
      style={{ animationDelay: '60ms', animationFillMode: 'both' }}
    >
      {/* Header */}
      <div className="px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{
            background: 'linear-gradient(135deg, rgba(26,25,23,0.12) 0%, rgba(26,25,23,0.05) 100%)'
          }}>
            <Sparkles strokeWidth={1.5} className="w-[18px] h-[18px] text-[#FDFDFE]" />
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-[rgba(253,253,254,0.30)]">Setup</span>
            <p className="text-[14px] font-semibold text-[#FDFDFE] tracking-[-0.01em]">
              Voltooi je profiel
            </p>
          </div>
        </div>
        <span className="text-[14px] font-bold tracking-[-0.01em]" style={{
          color: completedCount === totalCount ? '#2FA65A' : '#FDFDFE'
        }}>
          {completedCount}/{totalCount}
        </span>
      </div>

      {/* Progress bar */}
      <div className="px-6 pb-3">
        <div className="w-full h-1.5 bg-[#DDD9D0] rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-[600ms] ease-[cubic-bezier(0.16,1,0.3,1)]"
            style={{
              width: `${progress}%`,
              backgroundColor: '#FDFDFE',
            }}
          />
        </div>
      </div>

      {/* Items */}
      <div className="divide-y divide-[rgba(253,253,254,0.14)]">
        {items.filter(i => !i.completed).slice(0, 4).map((item) => (
          <Link
            key={item.id}
            href={item.href}
            className="flex items-center gap-3.5 px-6 py-3.5 hover:bg-[#E5E1D9] transition-all duration-[280ms]"
          >
            <Circle strokeWidth={1.5} className="w-5 h-5 text-[rgba(253,253,254,0.30)] shrink-0" />
            <span className="flex-1 text-[14px] font-medium text-[#FDFDFE] tracking-[-0.01em]">
              {item.label}
            </span>
            <ChevronRight strokeWidth={1.5} className="w-4 h-4 text-[rgba(253,253,254,0.30)] shrink-0" />
          </Link>
        ))}
        {items.filter(i => i.completed).length > 0 && (
          <div className="px-6 py-2.5">
            <p className="text-[12px] text-[rgba(253,253,254,0.30)] font-medium">
              {completedCount} stap{completedCount !== 1 ? 'pen' : ''} voltooid
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
