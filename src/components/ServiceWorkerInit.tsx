'use client'

import { useServiceWorker } from '@/hooks/useServiceWorker'

export function ServiceWorkerInit() {
  useServiceWorker()
  return null
}
