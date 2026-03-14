import { MessageCircle } from 'lucide-react'
import { EmptyState } from '@/components/ui/EmptyState'

interface MessagesEmptyProps {
  variant?: 'client' | 'coach'
}

export function MessagesEmpty({ variant = 'client' }: MessagesEmptyProps) {
  return (
    <EmptyState
      icon={MessageCircle}
      title="Nog geen berichten"
      description={
        variant === 'client'
          ? 'Start een gesprek met je coach!'
          : 'Je hebt nog geen berichten ontvangen van clients.'
      }
    />
  )
}
