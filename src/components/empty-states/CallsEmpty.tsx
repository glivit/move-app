import { EmptyState } from '@/components/ui/EmptyState'
import { Video } from 'lucide-react'

export function CallsEmpty() {
  return (
    <EmptyState
      icon={Video}
      title="Geen geplande gesprekken"
      description="Plan een videogesprek met je coach."
    />
  )
}
