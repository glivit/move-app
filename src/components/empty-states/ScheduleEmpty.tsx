import { EmptyState } from '@/components/ui/EmptyState'
import { Calendar } from 'lucide-react'

export function ScheduleEmpty() {
  return (
    <EmptyState
      icon={Calendar}
      title="Geen geplande gesprekken"
      description="Plan een videogesprek met je cliënten."
    />
  )
}
