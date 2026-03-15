'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Users, ClipboardCheck, MessageSquare,
  BookOpen, Radio, CreditCard, FileText, Dumbbell, ClipboardList,
  Menu, X, LogOut, MoreVertical, Calendar, Apple, UsersRound, ShieldCheck
} from 'lucide-react'
import { useState } from 'react'
import { signOut } from '@/lib/auth'

const mainNavItems = [
  { href: '/coach', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/coach/clients', label: 'Cliënten', icon: Users },
  { href: '/coach/exercises', label: 'Oefeningen', icon: Dumbbell },
  { href: '/coach/programs', label: "Programma's", icon: ClipboardList },
  { href: '/coach/nutrition', label: 'Voeding', icon: Apple },
  { href: '/coach/check-ins', label: 'Check-ins', icon: ClipboardCheck },
  { href: '/coach/accountability', label: 'Accountability', icon: ShieldCheck },
  { href: '/coach/messages', label: 'Berichten', icon: MessageSquare },
  { href: '/coach/community', label: 'Community', icon: UsersRound },
]

const secondaryNavItems = [
  { href: '/coach/prompts', label: 'Prompts', icon: FileText },
  { href: '/coach/broadcasts', label: 'Broadcasts', icon: Radio },
  { href: '/coach/resources', label: 'Kennisbank', icon: BookOpen },
  { href: '/coach/schedule', label: 'Planning', icon: Calendar },
  { href: '/coach/billing', label: 'Facturatie', icon: CreditCard },
]

const mobileBottomItems = [
  { href: '/coach', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/coach/clients', label: 'Cliënten', icon: Users },
  { href: '/coach/check-ins', label: 'Check-ins', icon: ClipboardCheck },
  { href: '/coach/messages', label: 'Berichten', icon: MessageSquare },
]

const mobileMenuItems = [
  { href: '/coach/exercises', label: 'Oefeningen', icon: Dumbbell },
  { href: '/coach/programs', label: "Programma's", icon: ClipboardList },
  { href: '/coach/nutrition', label: 'Voeding', icon: Apple },
  { href: '/coach/accountability', label: 'Accountability', icon: ShieldCheck },
  { href: '/coach/community', label: 'Community', icon: UsersRound },
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
          group flex items-center gap-3.5 px-4 py-2.5 rounded-xl text-[14px] font-medium relative
          transition-all duration-[350ms] ease-[cubic-bezier(0.16,1,0.3,1)]
          ${active
            ? 'bg-gradient-to-r from-[#F7F3EA] to-[#F5F2ED] text-[#7A6124] shadow-[inset_0_1px_0_rgba(255,255,255,0.5),0_1px_2px_rgba(155,123,46,0.06)]'
            : 'text-[#5C5A55] hover:bg-[#F0EDE8] hover:text-[#1A1917]'
          }
        `}
      >
        <Icon
          className={`h-[18px] w-[18px] shrink-0 transition-colors duration-[350ms] ${
            active ? 'text-[#9B7B2E]' : 'text-[#9C9A95] group-hover:text-[#5C5A55]'
          }`}
          strokeWidth={active ? 1.7 : 1.5}
        />
        <span className="tracking-[-0.01em]">{item.label}</span>
        {active && (
          <div className="ml-auto w-1.5 h-1.5 rounded-full bg-[#9B7B2E] shadow-[0_0_4px_rgba(155,123,46,0.4)]" />
        )}
      </Link>
    )
  }

  const DesktopSidebarContent = () => (
    <>
      {/* Logo */}
      <div className="px-7 pt-9 pb-7">
        <h1
          className="text-[28px] font-semibold tracking-[-0.03em] text-[#1A1917]"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          MŌVE
        </h1>
        <p className="text-[10px] font-semibold text-[#9C9A95] mt-1.5 uppercase tracking-[0.14em]">
          Coach Studio
        </p>
      </div>

      {/* Separator */}
      <div className="mx-6 h-px bg-gradient-to-r from-transparent via-[#E6E2DC] to-transparent" />

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-5 px-4 space-y-0.5">
        {mainNavItems.map((item) => (
          <NavItem key={item.href} item={item} />
        ))}
      </nav>

      {/* Separator */}
      <div className="mx-6 h-px bg-gradient-to-r from-transparent via-[#E6E2DC] to-transparent" />

      {/* Secondary Navigation */}
      <nav className="px-4 py-4 space-y-0.5">
        <p className="px-4 pb-2 text-[10px] font-bold text-[#BAB8B3] uppercase tracking-[0.12em]">
          Beheer
        </p>
        {secondaryNavItems.map((item) => (
          <NavItem key={item.href} item={item} />
        ))}
      </nav>

      {/* Logout */}
      <div className="border-t border-[#E6E2DC] px-4 py-4">
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-3.5 px-4 py-2.5 rounded-xl text-[14px] font-medium text-[#C4372A] hover:bg-[#C4372A]/5 transition-all duration-[280ms]"
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
      {/* Desktop Sidebar — warm tinted background with inner glow */}
      <aside className="hidden lg:flex lg:fixed lg:inset-y-0 lg:left-0 lg:w-[280px] lg:flex-col bg-[#FAF8F5] border-r border-[#E6E2DC] z-40"
        style={{ boxShadow: 'inset -1px 0 0 rgba(255,255,255,0.5), 1px 0 8px rgba(26,25,23,0.03)' }}
      >
        <DesktopSidebarContent />
      </aside>

      {/* Mobile Top Bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 glass-warm border-b border-[#E6E2DC] px-5 py-3.5 flex items-center justify-between">
        <h1
          className="text-xl font-semibold text-[#1A1917] tracking-[-0.03em]"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          MŌVE
        </h1>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-2 rounded-xl hover:bg-[#F0EDE8] text-[#1A1917] transition-all duration-[280ms]"
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

      {/* Mobile drawer */}
      <div
        className={`lg:hidden fixed inset-y-0 left-0 z-30 w-[280px] bg-[#FAF8F5] border-r border-[#E6E2DC] flex flex-col transform transition-transform duration-[400ms] ease-[cubic-bezier(0.16,1,0.3,1)] ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="pt-20 pb-6 px-4 flex-1 overflow-y-auto space-y-0.5">
          {mainNavItems.map((item) => (
            <NavItem key={item.href} item={item} onClick={() => setMobileOpen(false)} />
          ))}

          <div className="my-4 mx-1 h-px bg-gradient-to-r from-transparent via-[#E6E2DC] to-transparent" />

          <p className="px-4 pb-2 pt-1 text-[10px] font-bold text-[#BAB8B3] uppercase tracking-[0.12em]">
            Beheer
          </p>
          {secondaryNavItems.map((item) => (
            <NavItem key={item.href} item={item} onClick={() => setMobileOpen(false)} />
          ))}
        </div>

        <div className="border-t border-[#E6E2DC] p-4">
          <button
            onClick={() => { handleSignOut(); setMobileOpen(false) }}
            className="w-full flex items-center gap-3.5 px-4 py-2.5 rounded-xl text-[14px] font-medium text-[#C4372A] hover:bg-[#C4372A]/5 transition-all duration-[280ms]"
          >
            <LogOut className="h-[18px] w-[18px] shrink-0" strokeWidth={1.5} />
            Uitloggen
          </button>
        </div>
      </div>

      {/* Mobile Bottom Nav */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 glass-warm border-t border-[#E6E2DC] pb-safe">
        <div className="flex items-center justify-between">
          {mobileBottomItems.map((item) => {
            const Icon = item.icon
            const active = isActive(item.href)

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex-1 flex flex-col items-center justify-center gap-1 py-3 text-xs transition-all duration-[280ms] ${
                  active ? 'text-[#9B7B2E]' : 'text-[#9C9A95] hover:text-[#5C5A55]'
                }`}
              >
                <Icon className="h-[22px] w-[22px]" strokeWidth={active ? 1.8 : 1.5} />
                <span className="text-[10px] font-semibold tracking-[-0.01em] line-clamp-1">{item.label}</span>
                {active && <div className="w-1 h-1 rounded-full bg-[#9B7B2E]" />}
              </Link>
            )
          })}

          <div className="relative flex-1 flex flex-col items-center justify-center">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="flex flex-col items-center justify-center gap-1 py-3 text-xs text-[#9C9A95] hover:text-[#5C5A55] transition-all duration-[280ms]"
            >
              <MoreVertical className="h-[22px] w-[22px]" strokeWidth={1.5} />
              <span className="text-[10px] font-semibold">Meer</span>
            </button>

            {mobileMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setMobileMenuOpen(false)}
                />
                <div className="absolute bottom-full right-0 mb-2 w-56 bg-white rounded-2xl shadow-[0_8px_32px_rgba(26,25,23,0.12)] border border-[#E6E2DC] z-50 py-2 animate-scale-in">
                  {mobileMenuItems.map((item) => {
                    const Icon = item.icon
                    const active = isActive(item.href)

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => { setMobileMenuOpen(false); setMobileOpen(false) }}
                        className={`flex items-center gap-3 px-4 py-3 text-[14px] transition-all duration-[280ms] ${
                          active
                            ? 'bg-[#F7F3EA] text-[#9B7B2E]'
                            : 'text-[#5C5A55] hover:text-[#1A1917] hover:bg-[#F0EDE8]'
                        }`}
                      >
                        <Icon className="h-4 w-4 shrink-0" strokeWidth={1.5} />
                        {item.label}
                      </Link>
                    )
                  })}
                  <div className="mx-3 my-1 h-px bg-[#E6E2DC]" />
                  <button
                    onClick={() => { handleSignOut(); setMobileMenuOpen(false) }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-[14px] text-[#C4372A] hover:bg-[#C4372A]/5 transition-all duration-[280ms]"
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

      <div className="lg:hidden h-14" />
      <div className="lg:hidden h-20" />
    </>
  )
}
