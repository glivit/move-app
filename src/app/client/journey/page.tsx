'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function JourneyRedirect() {
  const router = useRouter()
  useEffect(() => {
    router.replace('/client/progress')
  }, [router])
  return null
}
