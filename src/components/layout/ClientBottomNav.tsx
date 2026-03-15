'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { Home, LineChart, Plus, MessageCircle, User, X, ClipboardCheck, Send, Dumbbell, ShieldCheck } from 'lucide-react'

const navItems = [
  { href: '/client', label: 'Home', icon: Home },
  { href: '/client/journey', label: 'Reis', icon: LineChart },
  { href: '#add', label: '', icon: Plus, isCenter: true },
  { href: '/client/messages', label: 'Chat', icon: MessageCircle },
  { href: '/client/profile', label: 'Ik', icon: User },
]

const quickActions = [
  { href: '/client/check-in', label: 'Check-in', icon: ClipboardCheck, color: 'bg-[#3D8B5C]' },
  { href: '/client/accountability', label: 'Dag check', icon: ShieldCheck, color: 'bg-[#C47D15]' },
  { href: '/client/workout', label: 'Workout', icon: Dumbbell, color: 'bg-[#3068C4]' },
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
      {/* Quick Add Overlay */}
      {showQuickAdd && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/20 backdrop-blur-md animate-fade-in"
            onClick={() => setShowQuickAdd(false)}
          />
          <div className="absolute bottom-24 left-1/2 -translate-x-1/2 flex gap-5 animate-scale-in">
            {quickActions.map((action) => {
              const Icon = action.icon
              return (
                <Link
                  key={action.href}
                  href={action.href}
                  onClick={() => setShowQuickAdd(false)}
                  className="flex flex-col items-center gap-2.5"
                >
                  <div className={`w-14 h-14 rounded-2xl ${action.color} text-white flex items-center justify-center shadow-[0_8px_24px_rgba(0,0,0,0.15)] transition-transform duration-[280ms] hover:scale-105`}>
                    <Icon className="w-6 h-6" strokeWidth={1.5} />
                  </div>
                  <span className="text-[11px] font-semibold text-white tracking-[-0.01em]">{action.label}</span>
                </Link>
              )
            })}
          </div>
        </div>
      )}

      {/* Bottom Nav Bar */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 glass-warm border-t border-[#E6E2DC] pb-safe">
        <div className="max-w-lg mx-auto flex items-center justify-around h-16">
          {navItems.map((item) => {
            const Icon = item.icon
            const active = isActive(item.href)

            if (item.isCenter) {
              return (
                <button
                  key="center-add"
                  onClick={() => setShowQuickAdd(!showQuickAdd)}
                  className="relative -mt-5"
                >
                  <div className={`
                    w-[52px] h-[52px] rounded-2xl flex items-center justify-center
                    shadow-[0_4px_16px_rgba(26,25,23,0.12)]
                    transition-all duration-[280ms] ease-[cubic-bezier(0.4,0,0.2,1)]
                    ${showQuickAdd
                      ? 'bg-[#5C5A55] rotate-45 scale-95'
                      : 'bg-[#1A1917] scale-100 hover:bg-[#2A2A28]'
                    }
                  `}>
                    {showQuickAdd
                      ? <X className="w-5 h-5 text-white" strokeWidth={2.5} />
                      : <Plus className="w-5 h-5 text-white" strokeWidth={2.5} />
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
                  flex flex-col items-center justify-center gap-1 min-w-[56px] py-1
                  transition-all duration-[280ms] ease-[cubic-bezier(0.4,0,0.2,1)]
                  ${active ? 'text-[#9B7B2E]' : 'text-[#9C9A95]'}
                `}
              >
                <div className="relative">
                  <Icon className="w-[22px] h-[22px]" strokeWidth={active ? 1.8 : 1.5} />
                  {item.href === '/client/messages' && (
                    <span className="absolute -top-0.5 -right-1 w-2.5 h-2.5 rounded-full bg-[#C4372A] border-2 border-white hidden" id="chat-badge-mobile" />
                  )}
                </div>
                <span className="text-[10px] font-semibold tracking-[-0.01em]">{item.label}</span>
                {active && <div className="w-1 h-1 rounded-full bg-[#9B7B2E]" />}
              </Link>
            )
          })}
        </div>
      </nav>
    </>
  )
}
