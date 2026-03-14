'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Users, ClipboardCheck, MessageSquare,
  BookOpen, Radio, CreditCard, FileText, Dumbbell, ClipboardList,
  Menu, X, LogOut, MoreVertical, Calendar, Apple, UsersRound
} from 'lucide-react'
import { useState } from 'react'
import { signOut } from '@/lib/auth'

// Main navigation items
const mainNavItems = [
  { href: '/coach', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/coach/clients', label: 'Cliënten', icon: Users },
  { href: '/coach/exercises', label: 'Oefeningen', icon: Dumbbell },
  { href: '/coach/programs', label: "Programma's", icon: ClipboardList },
  { href: '/coach/nutrition', label: 'Voeding', icon: Apple },
  { href: '/coach/check-ins', label: 'Check-ins', icon: ClipboardCheck },
  { href: '/coach/messages', label: 'Berichten', icon: MessageSquare },
  { href: '/coach/community', label: 'Community', icon: UsersRound },
]

// Secondary navigation items
const secondaryNavItems = [
  { href: '/coach/prompts', label: 'Prompts', icon: FileText },
  { href: '/coach/broadcasts', label: 'Broadcasts', icon: Radio },
  { href: '/coach/resources', label: 'Kennisbank', icon: BookOpen },
  { href: '/coach/schedule', label: 'Planning', icon: Calendar },
  { href: '/coach/billing', label: 'Facturatie', icon: CreditCard },
]

// Mobile bottom nav items
const mobileBottomItems = [
  { href: '/coach', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/coach/clients', label: 'Cliënten', icon: Users },
  { href: '/coach/check-ins', label: 'Check-ins', icon: ClipboardCheck },
  { href: '/coach/messages', label: 'Berichten', icon: MessageSquare },
]

// Additional items for mobile menu
const mobileMenuItems = [
  { href: '/coach/prompts', label: 'Prompts', icon: FileText },
  { href: '/coach/broadcasts', label: 'Broadcasts', icon: Radio },
  { href: '/coach/resources', label: 'Kennisbank', icon: BookOpen },
  { href: '/coach/schedule', label: 'Planning', icon: Calendar },
  { href: '/coach/billing', label: 'Facturatie', icon: CreditCard },
]

export function CoachSidebar() {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const handleSignOut = async () => {
    await signOut()
    window.location.href = '/'
  }

  const isActive = (href: string) => {
    if (href === '/coach') return pathname === '/coach'
    return pathname.startsWith(href)
  }

  const NavItem = ({ item, onClick }: { item: any; onClick?: () => void }) => {
    const Icon = item.icon
    const active = isActive(item.href)

    return (
      <Link
        href={item.href}
        onClick={onClick}
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
          className={`h-[18px] w-[18px] shrink-0 transition-colors duration-[280ms] ${
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
  }

  // Desktop Sidebar Content
  const DesktopSidebarContent = () => (
    <>
      {/* Logo — generous spacing, editorial feel */}
      <div className="px-7 pt-8 pb-6">
        <h1
          className="text-[26px] font-semibold tracking-[-0.03em] text-[#1A1A18]"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          MŌVE
        </h1>
        <p className="text-[11px] font-medium text-[#AEAEB2] mt-1 uppercase tracking-[0.12em]">
          Coach
        </p>
      </div>

      {/* Thin separator */}
      <div className="mx-5 h-px bg-gradient-to-r from-transparent via-[#ECEAE5] to-transparent" />

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-5 px-4 space-y-0.5">
        {mainNavItems.map((item) => (
          <NavItem key={item.href} item={item} />
        ))}
      </nav>

      {/* Thin separator */}
      <div className="mx-5 h-px bg-gradient-to-r from-transparent via-[#ECEAE5] to-transparent" />

      {/* Secondary Navigation */}
      <nav className="px-4 py-4 space-y-0.5">
        <p className="px-4 pb-2 text-[10px] font-semibold text-[#AEAEB2] uppercase tracking-[0.1em]">
          Beheer
        </p>
        {secondaryNavItems.map((item) => (
          <NavItem key={item.href} item={item} />
        ))}
      </nav>

      {/* Logout button */}
      <div className="border-t border-[#ECEAE5] px-4 py-4">
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-3.5 px-4 py-2.5 rounded-xl text-[14px] font-medium text-[#D93025] hover:bg-[#D93025]/5 transition-all duration-[280ms]"
          title="Uitloggen"
        >
          <LogOut className="h-[18px] w-[18px] shrink-0" strokeWidth={1.5} />
          <span>Uitloggen</span>
        </button>
      </div>
    </>
  )

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:fixed lg:inset-y-0 lg:left-0 lg:w-[280px] lg:flex-col bg-white border-r border-[#ECEAE5] z-40">
        <DesktopSidebarContent />
      </aside>

      {/* Mobile Top Bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-2xl border-b border-[#ECEAE5] px-5 py-3.5 flex items-center justify-between">
        <h1
          className="text-xl font-semibold text-[#1A1A18] tracking-[-0.03em]"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          MŌVE
        </h1>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-2 rounded-xl hover:bg-[#F4F3F0] text-[#1A1A18] transition-all duration-[280ms]"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-30 bg-black/15 backdrop-blur-sm animate-fade-in"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile drawer menu */}
      <div
        className={`lg:hidden fixed inset-y-0 left-0 z-30 w-[280px] bg-white border-r border-[#ECEAE5] flex flex-col transform transition-transform duration-[400ms] ease-[cubic-bezier(0.16,1,0.3,1)] ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="pt-20 pb-6 px-4 flex-1 overflow-y-auto space-y-0.5">
          {mainNavItems.map((item) => (
            <NavItem
              key={item.href}
              item={item}
              onClick={() => setMobileOpen(false)}
            />
          ))}

          <div className="my-4 mx-1 h-px bg-gradient-to-r from-transparent via-[#ECEAE5] to-transparent" />

          <p className="px-4 pb-2 pt-1 text-[10px] font-semibold text-[#AEAEB2] uppercase tracking-[0.1em]">
            Beheer
          </p>
          {secondaryNavItems.map((item) => (
            <NavItem
              key={item.href}
              item={item}
              onClick={() => setMobileOpen(false)}
            />
          ))}
        </div>

        {/* Mobile logout section */}
        <div className="border-t border-[#ECEAE5] p-4">
          <button
            onClick={() => {
              handleSignOut()
              setMobileOpen(false)
            }}
            className="w-full flex items-center gap-3.5 px-4 py-2.5 rounded-xl text-[14px] font-medium text-[#D93025] hover:bg-[#D93025]/5 transition-all duration-[280ms]"
          >
            <LogOut className="h-[18px] w-[18px] shrink-0" strokeWidth={1.5} />
            Uitloggen
          </button>
        </div>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-2xl border-t border-[#ECEAE5] pb-safe">
        <div className="flex items-center justify-between">
          {mobileBottomItems.map((item) => {
            const Icon = item.icon
            const active = isActive(item.href)

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex-1 flex flex-col items-center justify-center gap-1 py-3 text-xs transition-all duration-[280ms] ${
                  active
                    ? 'text-[#8B6914]'
                    : 'text-[#AEAEB2] hover:text-[#6E6E73]'
                }`}
              >
                <Icon className="h-[22px] w-[22px]" strokeWidth={active ? 1.8 : 1.5} />
                <span className="text-[10px] font-semibold tracking-[-0.01em] line-clamp-1">{item.label}</span>
                {active && <div className="w-1 h-1 rounded-full bg-[#8B6914] mt-0.5" />}
              </Link>
            )
          })}

          {/* More menu button */}
          <div className="relative flex-1 flex flex-col items-center justify-center">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="flex flex-col items-center justify-center gap-1 py-3 text-xs text-[#AEAEB2] hover:text-[#6E6E73] transition-all duration-[280ms]"
            >
              <MoreVertical className="h-[22px] w-[22px]" strokeWidth={1.5} />
              <span className="text-[10px] font-semibold">Meer</span>
            </button>

            {/* More menu dropdown */}
            {mobileMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setMobileMenuOpen(false)}
                />
                <div className="absolute bottom-full right-0 mb-2 w-56 bg-white rounded-2xl shadow-[0_8px_24px_rgba(26,26,24,0.1)] border border-[#ECEAE5] z-50 py-2 animate-scale-in">
                  {mobileMenuItems.map((item) => {
                    const Icon = item.icon
                    const active = isActive(item.href)

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => {
                          setMobileMenuOpen(false)
                          setMobileOpen(false)
                        }}
                        className={`flex items-center gap-3 px-4 py-3 text-[14px] transition-all duration-[280ms] ${
                          active
                            ? 'bg-[#F8F5ED] text-[#8B6914]'
                            : 'text-[#6E6E73] hover:text-[#1A1A18] hover:bg-[#F4F3F0]'
                        }`}
                      >
                        <Icon className="h-4 w-4 shrink-0" strokeWidth={1.5} />
                        {item.label}
                      </Link>
                    )
                  })}
                  <div className="mx-3 my-1 h-px bg-[#ECEAE5]" />
                  <button
                    onClick={() => {
                      handleSignOut()
                      setMobileMenuOpen(false)
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-[14px] text-[#D93025] hover:bg-[#D93025]/5 transition-all duration-[280ms]"
                  >
                    <LogOut className="h-4 w-4 shrink-0" strokeWidth={1.5} />
                    Uitloggen
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Spacer for mobile top bar */}
      <div className="lg:hidden h-14" />

      {/* Bottom spacer for mobile bottom nav */}
      <div className="lg:hidden h-20" />
    </>
  )
}
