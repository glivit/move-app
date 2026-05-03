'use client'

import { useEffect, useState } from 'react'

/**
 * useVisualViewportHeight — geeft de echte zichtbare viewport-hoogte terug,
 * geupdated wanneer iOS Safari de keyboard opent/sluit.
 *
 * Probleem dit oplost: `position: fixed; inset: 0` containers (modals,
 * sheets, full-screen pages) weten niet dat de keyboard ruimte inneemt.
 * Resultaat: input verdwijnt onder keyboard, of er ontstaat een "rare
 * sprong" wanneer iOS de pagina probeert te scrollen om input zichtbaar
 * te houden.
 *
 * Visual Viewport API geeft de échte zichtbare hoogte terug (excl.
 * keyboard) en updatet bij resize. Wij kunnen die als inline `height`
 * gebruiken om de container te laten meekrimpen.
 *
 * SSR-veilig: returnt `null` op server + initial render. Op de client
 * pakt het de waarde direct na mount.
 *
 * @returns viewport height in px, of null tijdens SSR / pre-hydration
 */
export function useVisualViewportHeight(): number | null {
  const [height, setHeight] = useState<number | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const vv = window.visualViewport
    if (!vv) {
      // Fallback voor browsers zonder Visual Viewport API
      const update = () => setHeight(window.innerHeight)
      update()
      window.addEventListener('resize', update)
      return () => window.removeEventListener('resize', update)
    }
    const update = () => setHeight(vv.height)
    update()
    vv.addEventListener('resize', update)
    vv.addEventListener('scroll', update)
    return () => {
      vv.removeEventListener('resize', update)
      vv.removeEventListener('scroll', update)
    }
  }, [])

  return height
}
