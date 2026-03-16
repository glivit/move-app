'use client'

// Simplified error page — no external component imports to avoid
// Next.js 16 _global-error prerender issues

interface ErrorPageProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  return (
    <div className="min-h-screen bg-[#EEEBE3] flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[#E8E4DC] p-8 space-y-6">
        <div className="flex justify-center">
          <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-red-600">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
        </div>

        <div className="text-center space-y-2">
          <h1 className="text-2xl font-semibold text-[#1A1917]" style={{ fontFamily: 'var(--font-display)' }}>
            Er ging iets mis
          </h1>
          <p className="text-[14px] text-[#A09D96]">
            {error.message || 'Er is een onverwachte fout opgetreden. Probeer het alstublieft opnieuw.'}
          </p>
        </div>

        <div className="space-y-3">
          <button
            onClick={reset}
            className="w-full py-3 rounded-xl bg-[#1A1917] text-white text-[14px] font-semibold hover:bg-[#2A2A28] transition-colors"
          >
            Opnieuw proberen
          </button>
          <a href="/" className="block">
            <button className="w-full py-3 rounded-xl border border-[#DDD9D0] text-[#6B6862] text-[14px] font-semibold hover:bg-[#EEEBE3] transition-colors">
              Terug naar homepagina
            </button>
          </a>
        </div>
      </div>
    </div>
  )
}
