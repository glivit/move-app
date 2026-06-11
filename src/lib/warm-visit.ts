'use client'

import { useState } from 'react'

/**
 * useWarmVisit — true als deze route al eerder bezocht is in deze sessie.
 *
 * Gebruikt om entrance-animaties (staggered slide-ups) alléén op het
 * eerste bezoek te spelen. Bij een warm revisit staat de content er al
 * (IDB cache-paint in ~10ms) en voelt een replay van de stagger als
 * traag her-renderen i.p.v. als polish.
 */
const visited = new Set<string>()

export function useWarmVisit(key: string): boolean {
  const [warm] = useState(() => {
    const w = visited.has(key)
    visited.add(key)
    return w
  })
  return warm
}
