import { EmptyState } from '@/components/ui/EmptyState'
import { Users } from 'lucide-react'

interface ClientsEmptyProps {
  onAddClick?: () => void
}

export function ClientsEmpty({ onAddClick }: ClientsEmptyProps) {
  return (
    <EmptyState
      icon={Users}
      title="Nog geen cliënten"
      description="Voeg je eerste cliënt toe om te beginnen met coaching."
      action={
        onAddClick
          ? {
              label: 'Cliënt toevoegen',
              onClick: onAddClick,
            }
          : undefined
      }
    />
  )
}
