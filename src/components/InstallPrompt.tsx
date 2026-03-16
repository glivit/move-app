'use client'

import { useEffect, useState } from 'react'
import { Download, X, Share, Plus } from 'lucide-react'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showPrompt, setShowPrompt] = useState(false)
  const [showIOSGuide, setShowIOSGuide] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true)
      return
    }

    // Check if user dismissed before (don't show for 7 days)
    const dismissed = localStorage.getItem('move-install-dismissed')
    if (dismissed) {
      const dismissedDate = new Date(dismissed)
      const daysSince = (Date.now() - dismissedDate.getTime()) / (1000 * 60 * 60 * 24)
      if (daysSince < 7) return
    }

    // Android / Desktop Chrome: catch beforeinstallprompt
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      // Show after a short delay so user has time to see the app first
      setTimeout(() => setShowPrompt(true), 3000)
    }

    window.addEventListener('beforeinstallprompt', handler)

    // iOS detection: show guide after 5 seconds
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent)
    if (isIOS && isSafari) {
      setTimeout(() => setShowIOSGuide(true), 5000)
    }

    // Listen for successful install
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true)
      setShowPrompt(false)
      setShowIOSGuide(false)
      setDeferredPrompt(null)
    })

    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') {
      setIsInstalled(true)
    }
    setDeferredPrompt(null)
    setShowPrompt(false)
  }

  const handleDismiss = () => {
    setShowPrompt(false)
    setShowIOSGuide(false)
    localStorage.setItem('move-install-dismissed', new Date().toISOString())
  }

  if (isInstalled) return null

  // Android / Desktop Chrome install banner
  if (showPrompt && deferredPrompt) {
    return (
      <div className="fixed bottom-20 left-4 right-4 z-50 md:bottom-6 md:left-auto md:right-6 md:max-w-sm animate-in slide-in-from-bottom-4">
        <div className="bg-white rounded-2xl shadow-xl border border-[#E8E4DC] p-5">
          <div className="flex items-start gap-4">
            <div className="bg-[#1A1917] rounded-xl p-2.5 shrink-0">
              <Download className="h-5 w-5 text-[#333330]" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-[#1A1917] text-sm">
                Installeer MŌVE
              </h3>
              <p className="text-xs text-[#A09D96] mt-0.5">
                Voeg toe aan je startscherm voor de volledige app-ervaring
              </p>
            </div>
            <button
              onClick={handleDismiss}
              className="text-[#C5C2BC] hover:text-[#A09D96] p-1 -mr-1 -mt-1"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="flex gap-3 mt-4">
            <button
              onClick={handleDismiss}
              className="flex-1 text-sm text-[#A09D96] py-2.5 rounded-xl hover:bg-[#EEEBE3] transition-colors"
            >
              Later
            </button>
            <button
              onClick={handleInstall}
              className="flex-1 bg-[#1A1917] text-white text-sm font-semibold py-2.5 rounded-xl hover:bg-[#2A2925] transition-colors"
            >
              Installeren
            </button>
          </div>
        </div>
      </div>
    )
  }

  // iOS Safari install guide
  if (showIOSGuide) {
    return (
      <div className="fixed bottom-20 left-4 right-4 z-50 animate-in slide-in-from-bottom-4">
        <div className="bg-white rounded-2xl shadow-xl border border-[#E8E4DC] p-5">
          <div className="flex items-start gap-4">
            <div className="bg-[#1A1917] rounded-xl p-2.5 shrink-0">
              <Download className="h-5 w-5 text-[#333330]" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-[#1A1917] text-sm">
                Installeer MŌVE
              </h3>
              <p className="text-xs text-[#A09D96] mt-1 leading-relaxed">
                Tik op{' '}
                <Share className="h-3.5 w-3.5 inline-block text-[#007AFF] -mt-0.5" />{' '}
                <span className="font-medium text-[#1A1917]">Deel</span> onderaan
                en kies{' '}
                <Plus className="h-3.5 w-3.5 inline-block text-[#007AFF] -mt-0.5" />{' '}
                <span className="font-medium text-[#1A1917]">Zet op beginscherm</span>
              </p>
            </div>
            <button
              onClick={handleDismiss}
              className="text-[#C5C2BC] hover:text-[#A09D96] p-1 -mr-1 -mt-1"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    )
  }

  return null
}
