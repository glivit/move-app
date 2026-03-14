'use client'

import { useState, useEffect } from 'react'
import { Moon, Sun } from 'lucide-react'

export function DarkModeToggle() {
  const [dark, setDark] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('move-dark-mode')
    if (saved === 'true') {
      setDark(true)
      document.documentElement.classList.add('dark')
    }
  }, [])

  const toggle = () => {
    const next = !dark
    setDark(next)
    if (next) {
      document.documentElement.classList.add('dark')
      localStorage.setItem('move-dark-mode', 'true')
    } else {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('move-dark-mode', 'false')
    }
  }

  return (
    <button
      onClick={toggle}
      className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-[15px] font-medium text-client-text-secondary hover:bg-client-surface-muted hover:text-text-primary transition-colors duration-150"
      title={dark ? 'Licht modus' : 'Donker modus'}
    >
      {dark ? (
        <Sun className="w-5 h-5 shrink-0" strokeWidth={1.5} />
      ) : (
        <Moon className="w-5 h-5 shrink-0" strokeWidth={1.5} />
      )}
      <span>{dark ? 'Licht modus' : 'Donker modus'}</span>
    </button>
  )
}
