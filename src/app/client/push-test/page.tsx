'use client'

import { useState, useEffect } from 'react'

export default function PushTestPage() {
  const [status, setStatus] = useState<string>('Laden...')
  const [diagnostics, setDiagnostics] = useState<any>(null)
  const [subStatus, setSubStatus] = useState<string>('')

  useEffect(() => {
    checkLocal()
  }, [])

  async function checkLocal() {
    const checks: string[] = []

    // Browser support
    checks.push(`serviceWorker: ${'serviceWorker' in navigator}`)
    checks.push(`PushManager: ${'PushManager' in window}`)
    checks.push(`Notification: ${'Notification' in window}`)

    if ('Notification' in window) {
      checks.push(`Notification.permission: ${Notification.permission}`)
    }

    // VAPID key
    const vapid = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
    checks.push(`VAPID key beschikbaar: ${!!vapid} (${vapid?.length || 0} chars)`)

    // Service worker
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.getRegistration()
      checks.push(`SW geregistreerd: ${!!reg}`)
      checks.push(`SW scope: ${reg?.scope || 'n/a'}`)
      checks.push(`SW active: ${!!reg?.active}`)

      if (reg) {
        const sub = await reg.pushManager.getSubscription()
        checks.push(`Push subscription: ${!!sub}`)
        if (sub) {
          checks.push(`Endpoint: ${new URL(sub.endpoint).hostname}`)
          checks.push(`Expires: ${sub.expirationTime || 'nooit'}`)
        }
      }
    }

    // Standalone mode (PWA)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
      || (navigator as any).standalone === true
    checks.push(`PWA standalone: ${isStandalone}`)

    // iOS detection
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
    checks.push(`iOS: ${isIOS}`)
    checks.push(`UA: ${navigator.userAgent.substring(0, 80)}`)

    setStatus(checks.join('\n'))
  }

  async function runServerTest() {
    setDiagnostics('Testen...')
    try {
      const res = await fetch('/api/push/test')
      const data = await res.json()
      setDiagnostics(JSON.stringify(data, null, 2))
    } catch (err: any) {
      setDiagnostics(`Error: ${err.message}`)
    }
  }

  async function forceSubscribe() {
    setSubStatus('Bezig...')
    try {
      // Register SW — Serwist route-handler variant.
      const reg = await navigator.serviceWorker.register('/serwist/sw.js', { scope: '/' })
      await navigator.serviceWorker.ready

      // Request permission
      const perm = await Notification.requestPermission()
      setSubStatus(`Permission: ${perm}`)
      if (perm !== 'granted') return

      // Subscribe
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
      if (!vapidKey) {
        setSubStatus('VAPID key ontbreekt in env!')
        return
      }

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey) as BufferSource,
      })

      setSubStatus(`Subscribed! Endpoint: ${new URL(sub.endpoint).hostname}`)

      // Save to server
      const saveRes = await fetch('/api/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription: sub.toJSON() }),
      })

      const saveData = await saveRes.json()
      setSubStatus(prev => prev + `\nOpgeslagen: ${JSON.stringify(saveData)}`)
    } catch (err: any) {
      setSubStatus(`Error: ${err.message}`)
    }
  }

  return (
    <div className="p-4 pb-24 space-y-4 font-mono text-xs">
      <h1 className="text-lg font-bold">Push Debug</h1>

      <div className="bg-white p-3 rounded-xl border border-gray-200">
        <h2 className="font-bold mb-2">Client-side checks:</h2>
        <pre className="whitespace-pre-wrap text-[11px]">{status}</pre>
        <button onClick={checkLocal} className="mt-2 px-3 py-1.5 bg-gray-100 rounded-lg text-xs">
          Herlaad
        </button>
      </div>

      <div className="bg-white p-3 rounded-xl border border-gray-200">
        <h2 className="font-bold mb-2">Force subscribe:</h2>
        <button onClick={forceSubscribe} className="px-3 py-1.5 bg-amber-600 text-white rounded-lg text-xs">
          Abonneer nu
        </button>
        {subStatus && <pre className="mt-2 whitespace-pre-wrap text-[11px]">{subStatus}</pre>}
      </div>

      <div className="bg-white p-3 rounded-xl border border-gray-200">
        <h2 className="font-bold mb-2">Server diagnostics + test push:</h2>
        <button onClick={runServerTest} className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs">
          Test push sturen
        </button>
        {diagnostics && <pre className="mt-2 whitespace-pre-wrap text-[11px] max-h-80 overflow-auto">{diagnostics}</pre>}
      </div>
    </div>
  )
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}
