'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { Home, TrendingUp, Plus, MessageCircle, User, X, ClipboardCheck, Send, Dumbbell, ShieldCheck, Calendar } from 'lucide-react'

const navItems = [
  { href: '/client', label: 'Home', icon: Home },
  { href: '/client/progress', label: 'Progress', icon: TrendingUp },
  { href: '#add', label: '', icon: Plus, isCenter: true },
  { href: '/client/messages', label: 'Chat', icon: MessageCircle },
  { href: '/client/profile', label: 'Ik', icon: User },
]

const quickActions = [
  { href: '/client/check-in', label: 'Check-in', icon: ClipboardCheck },
  { href: '/client/accountability', label: 'Dag check', icon: ShieldCheck },
  { href: '/client/workout', label: 'Workout', icon: Dumbbell },
  { href: '/client/booking', label: 'Sessie', icon: Calendar },
]

export function ClientBottomNav() {
  const pathname = usePathname()
  const [showQuickAdd, setShowQuickAdd] = useState(false)

  const isActive = (href: string) => {
    if (href === '/client') return pathname === '/client'
    if (href === '#add') return false
    return pathname.startsWith(href)
  }

  return (
    <>
      {/* Quick Add Overlay — editorial, clean */}
      {showQuickAdd && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-[#1A1917]/30 backdrop-blur-sm animate-fade-in"
            onClick={() => setShowQuickAdd(false)}
          />
          <div className="absolute bottom-28 left-0 right-0 px-6 animate-slide-up">
            <div className="bg-white p-2 max-w-sm mx-auto">
              {quickActions.map((action, i) => {
                const Icon = action.icon
                return (
                  <Link
                    key={action.href}
                    href={action.href}
                    onClick={() => setShowQuickAdd(false)}
                    className="flex items-center gap-3 px-4 py-3.5 hover:bg-[#F5F2EC] transition-colors"
                  >
                    <Icon className="w-5 h-5 text-[#1A1917]" strokeWidth={1.5} />
                    <span className="text-[14px] font-medium text-[#1A1917]">{action.label}</span>
                  </Link>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Bottom Nav Bar — minimal, editorial */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#EEEBE3]/90 backdrop-blur-lg border-t border-[#E8E4DC] pb-safe">
        <div className="max-w-lg mx-auto flex items-center justify-around h-14">
          {navItems.map((item) => {
            const Icon = item.icon
            const active = isActive(item.href)

            if (item.isCenter) {
              return (
                <button
                  key="center-add"
                  onClick={() => setShowQuickAdd(!showQuickAdd)}
                  className="relative"
                >
                  <div className={`
                    w-10 h-10 flex items-center justify-center
                    transition-all duration-250
                    ${showQuickAdd
                      ? 'bg-[#6B6862] rotate-45'
                      : 'bg-[#1A1917] hover:bg-[#333330]'
                    }
                  `}>
                    {showQuickAdd
                      ? <X className="w-4 h-4 text-white" strokeWidth={2} />
                      : <Plus className="w-4 h-4 text-white" strokeWidth={2} />
                    }
                  </div>
                </button>
              )
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`
                  flex flex-col items-center justify-center gap-0.5 min-w-[48px] py-1
                  transition-all duration-250
                  ${active ? 'text-[#1A1917]' : 'text-[#C5C2BC]'}
                `}
              >
                <Icon className="w-[20px] h-[20px]" strokeWidth={active ? 2 : 1.5} />
                <span className="text-[10px] font-semibold tracking-[0.02em]">{item.label}</span>
              </Link>
            )
          })}
        </div>
      </nav>
    </>
  )
}
