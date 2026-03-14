'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Settings } from 'lucide-react'

interface StripePortalProps {
  clientId?: string
}

export function StripePortal({ clientId }: StripePortalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleOpen = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/stripe/customer-portal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...(clientId && { client_id: clientId }),
        }),
      })

      if (!response.ok) {
        throw new Error('Fout bij het openen van facturatieportaal')
      }

      const data = await response.json()

      if (data.url) {
        window.location.href = data.url
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fout bij het openen van facturatieportaal')
      console.error('Portal error:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <Button
        variant="secondary"
        size="md"
        onClick={handleOpen}
        loading={loading}
        className="flex items-center gap-2"
      >
        <Settings className="w-4 h-4" />
        Facturatie beheren
      </Button>
      {error && (
        <p className="text-sm text-red-600 mt-2">{error}</p>
      )}
    </div>
  )
}
