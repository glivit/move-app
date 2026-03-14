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
} from 'lucide-react'

const mainNavItems = [
  { href: '/client', label: 'Home', icon: Home },
  { href: '/client/journey', label: 'Mijn Reis', icon: LineChart },
  { href: '/client/program', label: 'Training', icon: Dumbbell },
  { href: '/client/meal-plan', label: 'Voeding', icon: UtensilsCrossed },
  { href: '/client/messages', label: 'Berichten', icon: MessageCircle },
  { href: '/client/community', label: 'Community', icon: UsersRound },
  { href: '/client/progress', label: 'Voortgang', icon: TrendingUp },
]

const secondaryNavItems = [
  { href: '/client/check-in', label: 'Check-in', icon: ClipboardCheck },
  { href: '/client/health', label: 'Gezondheid', icon: Heart },
  { href: '/client/video', label: 'Video Calls', icon: Video },
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
    <aside className="hidden lg:flex lg:fixed lg:inset-y-0 lg:left-0 lg:w-[280px] lg:flex-col bg-white border-r border-[#ECEAE5] z-40">
      {/* Logo — generous spacing, editorial feel */}
      <div className="px-7 pt-8 pb-6">
        <h1
          className="text-[26px] font-semibold tracking-[-0.03em] text-[#1A1A18]"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          MŌVE
        </h1>
        <p className="text-[11px] font-medium text-[#AEAEB2] mt-1 uppercase tracking-[0.12em]">
          Personal Coaching
        </p>
      </div>

      {/* Thin separator */}
      <div className="mx-5 h-px bg-gradient-to-r from-transparent via-[#ECEAE5] to-transparent" />

      {/* Main navigation */}
      <nav className="flex-1 px-4 py-5 space-y-0.5">
        {mainNavItems.map((item) => {
          const Icon = item.icon
          const active = isActive(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`
                group flex items-center gap-3.5 px-4 py-2.5 rounded-xl text-[14px] font-medium
                transition-all duration-[280ms] ease-[cubic-bezier(0.4,0,0.2,1)]
                ${active
                  ? 'bg-[#F8F5ED] text-[#8B6914]'
                  : 'text-[#6E6E73] hover:bg-[#F4F3F0] hover:text-[#1A1A18]'
                }
              `}
            >
              <Icon
                className={`w-[18px] h-[18px] shrink-0 transition-colors duration-[280ms] ${
                  active ? 'text-[#8B6914]' : 'text-[#AEAEB2] group-hover:text-[#6E6E73]'
                }`}
                strokeWidth={1.5}
              />
              <span className="tracking-[-0.01em]">{item.label}</span>
              {item.href === '/client/messages' && (
                <span className="ml-auto w-2 h-2 rounded-full bg-[#D93025] hidden" id="msg-badge" />
              )}
              {active && !item.href.includes('messages') && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-[#8B6914]" />
              )}
            </Link>
          )
        })}

        {/* Thin separator */}
        <div className="!my-4 mx-1 h-px bg-gradient-to-r from-transparent via-[#ECEAE5] to-transparent" />

        <p className="px-4 pb-2 text-[10px] font-semibold text-[#AEAEB2] uppercase tracking-[0.1em]">
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
                group flex items-center gap-3.5 px-4 py-2.5 rounded-xl text-[14px] font-medium
                transition-all duration-[280ms] ease-[cubic-bezier(0.4,0,0.2,1)]
                ${active
                  ? 'bg-[#F8F5ED] text-[#8B6914]'
                  : 'text-[#6E6E73] hover:bg-[#F4F3F0] hover:text-[#1A1A18]'
                }
              `}
            >
              <Icon
                className={`w-[18px] h-[18px] shrink-0 transition-colors duration-[280ms] ${
                  active ? 'text-[#8B6914]' : 'text-[#AEAEB2] group-hover:text-[#6E6E73]'
                }`}
                strokeWidth={1.5}
              />
              <span className="tracking-[-0.01em]">{item.label}</span>
              {active && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-[#8B6914]" />
              )}
            </Link>
          )
        })}
      </nav>

      {/* Dark mode + Logout */}
      <div className="px-4 py-4 border-t border-[#ECEAE5] space-y-0.5">
        <DarkModeToggle />
        <button
          onClick={handleLogout}
          className="flex items-center gap-3.5 w-full px-4 py-2.5 rounded-xl text-[14px] font-medium text-[#D93025] hover:bg-[#D93025]/5 transition-all duration-[280ms]"
        >
          <LogOut className="w-[18px] h-[18px] shrink-0" strokeWidth={1.5} />
          <span>Uitloggen</span>
        </button>
      </div>
    </aside>
  )
}
