export default function ClientLoading() {
  // v6 Orion skeleton — geen v3 rgba(253,253,254,0.08) tinten.
  // Achtergrond = canvas #8E9890; shimmer blokken op witte transparantie
  // zodat ze op zowel #A6ADA7 (v6-card) als #474B48 (v6-card-dark) overtuigend blijven.
  return (
    <div className="pb-28 animate-fade-in">
      {/* Hero v6-card skeleton */}
      <div
        className="rounded-[24px] mb-4"
        style={{
          padding: '22px 22px 24px',
          background: 'rgba(255,255,255,0.50)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.14), 0 1px 2px rgba(0,0,0,0.10)',
        }}
      >
        <div className="animate-pulse space-y-3">
          <div className="h-3 w-24 rounded-full" style={{ background: 'rgba(253,253,254,0.18)' }} />
          <div className="h-7 w-48 rounded-lg" style={{ background: 'rgba(253,253,254,0.24)' }} />
          <div className="h-3 w-32 rounded-full mt-1" style={{ background: 'var(--card-bg-tint)' }} />
          <div style={{ height: 3, width: '100%', background: 'var(--card-bg-tint)', borderRadius: 2, marginTop: 18 }} />
          <div className="flex justify-between mt-3">
            <div className="h-2.5 w-16 rounded-full" style={{ background: 'var(--card-bg-tint)' }} />
            <div className="h-2.5 w-20 rounded-full" style={{ background: 'var(--card-bg-tint)' }} />
          </div>
        </div>
      </div>

      {/* Week v6-card skeleton */}
      <div
        className="rounded-[24px] mb-4"
        style={{
          padding: '22px 22px 24px',
          background: 'rgba(255,255,255,0.50)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.14), 0 1px 2px rgba(0,0,0,0.10)',
        }}
      >
        <div className="animate-pulse">
          <div className="h-3 w-20 rounded-full mb-4" style={{ background: 'rgba(253,253,254,0.18)' }} />
          <div className="flex gap-3">
            {[0, 1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="flex-1 flex flex-col items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ background: 'var(--card-bg-tint)' }} />
                <div className="h-2 w-6 rounded-full" style={{ background: 'var(--card-bg-tint)' }} />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Dieet v6-card-dark skeleton */}
      <div
        className="rounded-[24px] mb-4"
        style={{
          padding: '22px 22px 24px',
          background: '#474B48',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08), 0 1px 2px rgba(0,0,0,0.14)',
        }}
      >
        <div className="animate-pulse space-y-3">
          <div className="h-3 w-24 rounded-full" style={{ background: 'var(--card-bg-tint)' }} />
          <div className="h-10 w-32 rounded-lg" style={{ background: 'rgba(253,253,254,0.18)' }} />
          <div style={{ height: 3, width: '100%', background: 'var(--card-bg-tint)', borderRadius: 2, marginTop: 14 }} />
          <div className="flex gap-6 mt-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex-1 space-y-1.5">
                <div className="h-4 w-10 rounded" style={{ background: 'rgba(253,253,254,0.18)' }} />
                <div className="h-2.5 w-14 rounded-full" style={{ background: 'var(--card-bg-tint)' }} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
