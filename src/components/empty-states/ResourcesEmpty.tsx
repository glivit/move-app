import { EmptyState } from '@/components/ui/EmptyState'
import { BookOpen } from 'lucide-react'

export function ResourcesEmpty() {
  return (
    <EmptyState
      icon={BookOpen}
      title="Nog geen resources"
      description="Voeg trainingsmaterialen en documenten toe voor je cliënten."
    />
  )
}
