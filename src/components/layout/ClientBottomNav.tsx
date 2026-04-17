'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, memo, useCallback, useEffect, useRef } from 'react'

// Vier tabs — "Ik" staat als avatar in de top-bar, niet hier.
const tabs = [
  { href: '/client',          label: 'Home' },
  { href: '/client/workout',  label: 'Workouts' },
  { href: '/client/nutrition', label: 'Dieet' },
  { href: '/client/progress', label: 'Progress' },
]

function ClientBottomNavComponent() {
  const pathname = usePathname()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  const isActive = useCallback(
    (href: string) => (href === '/client' ? pathname === '/client' : pathname.startsWith(href)),
    [pathname],
  )

  // Close on outside click or Esc.
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const handlePillClick = useCallback((e: React.MouseEvent) => {
    // Click on the outer pill (the + icon area) — toggle.
    if ((e.target as HTMLElement).closest('.bnav-lbl')) return
    setOpen(o => !o)
  }, [])

  const handleLabelClick = useCallback(
    (href: string) => (e: React.MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setOpen(false)
      router.push(href)
    },
    [router],
  )

  return (
    <div
      ref={rootRef}
      className={`bnav-plus lg:hidden ${open ? 'open' : ''}`}
      role="navigation"
      aria-label="Navigatie"
      aria-expanded={open}
      onClick={handlePillClick}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <line x1="12" y1="5" x2="12" y2="19" />
        <line x1="5" y1="12" x2="19" y2="12" />
      </svg>
      <div className="bnav-labels">
        {tabs.map(tab => (
          <Link
            key={tab.href}
            href={tab.href}
            onClick={handleLabelClick(tab.href)}
            className={`bnav-lbl ${isActive(tab.href) ? 'on' : ''}`}
          >
            {tab.label}
          </Link>
        ))}
      </div>
    </div>
  )
}

export const ClientBottomNav = memo(ClientBottomNavComponent)
