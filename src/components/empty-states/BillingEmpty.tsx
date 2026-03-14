import { EmptyState } from '@/components/ui/EmptyState'
import { CreditCard } from 'lucide-react'

export function BillingEmpty() {
  return (
    <EmptyState
      icon={CreditCard}
      title="Geen factureringsgegevens"
      description="Voeg cliënten toe om hun factureringsgegevens hier te zien."
    />
  )
}
