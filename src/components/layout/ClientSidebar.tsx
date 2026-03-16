'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { DarkModeToggle } from '@/components/client/DarkModeToggle'
import {
  Home,
  LineChart,
  Dumbbell,
  UtensilsCrossed,
  MessageCircle,
  TrendingUp,
  ClipboardCheck,
  Video,
  BookOpen,
  Settings,
  LogOut,
  Heart,
  UsersRound,
  ShieldCheck,
  Pill,
  Calendar,
} from 'lucide-react'

const mainNavItems = [
  { href: '/client', label: 'Home', icon: Home },
  { href: '/client/journey', label: 'Mijn Reis', icon: LineChart },
  { href: '/client/workout', label: 'Training', icon: Dumbbell },
  { href: '/client/nutrition', label: 'Voeding', icon: UtensilsCrossed },
  { href: '/client/messages', label: 'Berichten', icon: MessageCircle },
  { href: '/client/community', label: 'Community', icon: UsersRound },
  { href: '/client/progress', label: 'Voortgang', icon: TrendingUp },
]

const secondaryNavItems = [
  { href: '/client/accountability', label: 'Dagelijkse check', icon: ShieldCheck },
  { href: '/client/check-in', label: 'Check-in', icon: ClipboardCheck },
  { href: '/client/supplements', label: 'Supplementen', icon: Pill },
  { href: '/client/health', label: 'Gezondheid', icon: Heart },
  { href: '/client/video', label: 'Video Calls', icon: Video },
  { href: '/client/booking', label: 'Sessie boeken', icon: Calendar },
  { href: '/client/resources', label: 'Kennisbank', icon: BookOpen },
  { href: '/client/profile', label: 'Instellingen', icon: Settings },
]

export function ClientSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  const isActive = (href: string) => {
    if (href === '/client') return pathname === '/client'
    return pathname.startsWith(href)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.replace('/')
  }

  return (
    <aside
      className="hidden lg:flex lg:fixed lg:inset-y-0 lg:left-0 lg:w-[280px] lg:flex-col bg-[#FAF8F5] border-r border-[#DDD9D0] z-40"
      style={{ boxShadow: 'inset -1px 0 0 rgba(255,255,255,0.5), 1px 0 8px rgba(26,25,23,0.03)' }}
    >
      {/* Logo — generous spacing, editorial feel */}
      <div className="px-7 pt-9 pb-7">
        <h1
          className="text-[28px] font-semibold tracking-[-0.03em] text-[#1A1917]"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          MŌVE
        </h1>
        <p className="text-[10px] font-semibold text-[#A09D96] mt-1.5 uppercase tracking-[0.14em]">
          Personal Coaching
        </p>
      </div>

      {/* Separator */}
      <div className="mx-6 h-px bg-gradient-to-r from-transparent via-[#DDD9D0] to-transparent" />

      {/* Main navigation */}
      <nav className="flex-1 px-4 py-5 space-y-0.5 overflow-y-auto">
        {mainNavItems.map((item) => {
          const Icon = item.icon
          const active = isActive(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`
                group flex items-center gap-3.5 px-4 py-2.5 rounded-xl text-[14px] font-medium relative
                transition-all duration-[350ms] ease-[cubic-bezier(0.16,1,0.3,1)]
                ${active
                  ? 'bg-gradient-to-r from-[#EDEAE4] to-[#F5F2ED] text-[#111110] shadow-[inset_0_1px_0_rgba(255,255,255,0.5),0_1px_2px_rgba(26,25,23,0.06)]'
                  : 'text-[#6B6862] hover:bg-[#E5E1D9] hover:text-[#1A1917]'
                }
              `}
            >
              <Icon
                className={`w-[18px] h-[18px] shrink-0 transition-colors duration-[350ms] ${
                  active ? 'text-[#1A1917]' : 'text-[#A09D96] group-hover:text-[#6B6862]'
                }`}
                strokeWidth={active ? 1.7 : 1.5}
              />
              <span className="tracking-[-0.01em]">{item.label}</span>
              {item.href === '/client/messages' && (
                <span className="ml-auto w-2 h-2 rounded-full bg-[#C4372A] hidden" id="msg-badge" />
              )}
              {active && !item.href.includes('messages') && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-[#1A1917] shadow-[0_0_4px_rgba(26,25,23,0.4)]" />
              )}
            </Link>
          )
        })}

        {/* Separator */}
        <div className="!my-4 mx-1 h-px bg-gradient-to-r from-transparent via-[#DDD9D0] to-transparent" />

        <p className="px-4 pb-2 text-[10px] font-bold text-[#C5C2BC] uppercase tracking-[0.12em]">
          Meer
        </p>

        {secondaryNavItems.map((item) => {
          const Icon = item.icon
          const active = isActive(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`
                group flex items-center gap-3.5 px-4 py-2.5 rounded-xl text-[14px] font-medium relative
                transition-all duration-[350ms] ease-[cubic-bezier(0.16,1,0.3,1)]
                ${active
                  ? 'bg-gradient-to-r from-[#EDEAE4] to-[#F5F2ED] text-[#111110] shadow-[inset_0_1px_0_rgba(255,255,255,0.5),0_1px_2px_rgba(26,25,23,0.06)]'
                  : 'text-[#6B6862] hover:bg-[#E5E1D9] hover:text-[#1A1917]'
                }
              `}
            >
              <Icon
                className={`w-[18px] h-[18px] shrink-0 transition-colors duration-[350ms] ${
                  active ? 'text-[#1A1917]' : 'text-[#A09D96] group-hover:text-[#6B6862]'
                }`}
                strokeWidth={active ? 1.7 : 1.5}
              />
              <span className="tracking-[-0.01em]">{item.label}</span>
              {active && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-[#1A1917] shadow-[0_0_4px_rgba(26,25,23,0.4)]" />
              )}
            </Link>
          )
        })}
      </nav>

      {/* Dark mode + Logout */}
      <div className="px-4 py-4 border-t border-[#DDD9D0] space-y-0.5">
        <DarkModeToggle />
        <button
          onClick={handleLogout}
          className="flex items-center gap-3.5 w-full px-4 py-2.5 rounded-xl text-[14px] font-medium text-[#C4372A] hover:bg-[#C4372A]/5 transition-all duration-[280ms]"
        >
          <LogOut className="w-[18px] h-[18px] shrink-0" strokeWidth={1.5} />
          <span>Uitloggen</span>
        </button>
      </div>
    </aside>
  )
}
