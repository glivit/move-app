export default function NutritionLoading() {
  return (
    <div className="pb-28" style={{ animation: 'pulse 1.8s ease-in-out infinite' }}>
      {/* Back button placeholder */}
      <div style={{
        height: 16, width: 52,
        background: 'var(--card-bg-tint)',
        borderRadius: 4,
        margin: '8px 0 14px',
      }} />

      {/* Hero card skeleton */}
      <div className="v6-card-dark" style={{ marginBottom: 14, minHeight: 300 }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
          <div style={{
            height: 24, width: 96,
            background: 'var(--card-bg-tint)',
            borderRadius: 6,
          }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
          <div style={{
            width: 176, height: 176, borderRadius: '50%',
            background: 'var(--card-bg-subtle)',
          }} />
        </div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr',
          gap: 8,
        }}>
          {[1, 2, 3].map(i => (
            <div key={i} style={{
              height: 76,
              background: 'var(--card-bg-subtle)',
              borderRadius: 14,
            }} />
          ))}
        </div>
      </div>

      {/* Meals card skeleton */}
      <div className="v6-card-dark" style={{ marginBottom: 14, padding: '18px 22px' }}>
        {[1, 2, 3].map(i => (
          <div
            key={i}
            style={{
              borderTop: i === 1 ? 'none' : '1px solid rgba(253,253,254,0.08)',
              padding: '14px 0',
            }}
          >
            <div style={{
              height: 16, width: 112,
              background: 'var(--card-bg-tint)',
              borderRadius: 4,
              marginBottom: 6,
            }} />
            <div style={{
              height: 12, width: 72,
              background: 'var(--card-bg-tint)',
              borderRadius: 4,
            }} />
          </div>
        ))}
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.65; }
        }
      `}</style>
    </div>
  )
}
