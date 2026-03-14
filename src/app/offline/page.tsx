'use client'

import { WifiOff } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'

export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-bg flex flex-col items-center justify-center px-4 py-8">
      <div className="w-full max-w-md text-center space-y-6">
        <div className="flex justify-center">
          <div className="bg-surface rounded-full p-6">
            <WifiOff className="h-12 w-12 text-warning" />
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-display font-semibold">Je bent offline</h1>
          <p className="text-text-secondary">
            Je hebt geen internetverbinding. Probeer je verbinding te controleren en herlaad de pagina.
          </p>
        </div>

        <Card padding="md" variant="muted">
          <p className="text-sm text-text-secondary">
            Je kunt nog wel gedownloade inhoud bekijken. Zorg ervoor dat je verbonden bent voor nieuwe functies.
          </p>
        </Card>

        <Button onClick={() => window.location.reload()} fullWidth>
          Pagina verversen
        </Button>
      </div>
    </div>
  )
}
