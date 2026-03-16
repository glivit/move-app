'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'

interface SubPageHeaderProps {
  /** Small uppercase overline label */
  overline?: string
  /** Main page title */
  title: string
  /** Right-side action slot */
  action?: React.ReactNode
  /** Custom back URL (defaults to router.back()) */
  backHref?: string
}

export function SubPageHeader({ overline, title, action, backHref }: SubPageHeaderProps) {
  const router = useRouter()

  const handleBack = () => {
    if (backHref) {
      router.push(backHref)
    } else {
      router.back()
    }
  }

  return (
    <div className="pt-1 mb-6">
      <button
        onClick={handleBack}
        className="flex items-center gap-1.5 text-[13px] text-[#A09D96] hover:text-[#1A1917] transition-colors mb-3 -ml-1"
      >
        <ArrowLeft size={16} strokeWidth={1.5} />
        <span>Terug</span>
      </button>
      {overline && <p className="text-label mb-2">{overline}</p>}
      <div className="flex items-center justify-between">
        <h1 className="text-editorial-h2 text-[#1A1917]">{title}</h1>
        {action && action}
      </div>
    </div>
  )
}
