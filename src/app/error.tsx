'use client'

import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { AlertCircle } from 'lucide-react'

interface ErrorPageProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  return (
    <div className="min-h-screen bg-bg text-text-primary flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <Card padding="lg" className="space-y-6">
          <div className="flex justify-center">
            <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center">
              <AlertCircle className="h-6 w-6 text-red-600" />
            </div>
          </div>

          <div className="text-center space-y-2">
            <h1 className="text-2xl font-display font-semibold">Er ging iets mis</h1>
            <p className="text-text-muted">
              {error.message || 'Er is een onverwachte fout opgetreden. Probeer het alstublieft opnieuw.'}
            </p>
          </div>

          <div className="space-y-3">
            <Button onClick={reset} fullWidth>
              Opnieuw proberen
            </Button>
            <a href="/">
              <Button variant="secondary" fullWidth>
                Terug naar homepagina
              </Button>
            </a>
          </div>
        </Card>
      </div>
    </div>
  )
}
