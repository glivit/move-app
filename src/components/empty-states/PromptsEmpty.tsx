import { EmptyState } from '@/components/ui/EmptyState'
import { MessageSquare } from 'lucide-react'

export function PromptsEmpty() {
  return (
    <EmptyState
      icon={MessageSquare}
      title="Nog geen prompts"
      description="Maak vragen en prompts voor je cliënten."
    />
  )
}
