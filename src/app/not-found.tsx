import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Home } from 'lucide-react'
import Link from 'next/link'

export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-bg text-text-primary flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <Card padding="lg" className="text-center space-y-6">
          <div className="flex justify-center">
            <div className="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center">
              <Home className="h-6 w-6 text-amber-600" />
            </div>
          </div>

          <div className="space-y-2">
            <h1 className="text-4xl font-display font-semibold">404</h1>
            <p className="text-text-muted">
              Deze pagina bestaat niet. Controleer de URL en probeer het opnieuw.
            </p>
          </div>

          <Link href="/">
            <Button fullWidth>
              Terug naar homepagina
            </Button>
          </Link>
        </Card>
      </div>
    </div>
  )
}
