import { EmptyState } from '@/components/ui/EmptyState'
import { ClipboardCheck } from 'lucide-react'

interface CheckInsEmptyProps {
  variant?: 'pending' | 'all'
}

export function CheckInsEmpty({ variant = 'all' }: CheckInsEmptyProps) {
  return (
    <EmptyState
      icon={ClipboardCheck}
      title={variant === 'pending' ? 'Alle check-ins reviewed' : 'Nog geen check-ins'}
      description={
        variant === 'pending'
          ? 'Goed bezig! Alle check-ins van je cliënten zijn reviewed.'
          : 'Je cliënten kunnen hun check-ins indienen.'
      }
    />
  )
}
