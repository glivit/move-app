'use client'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="nl-BE">
      <body style={{ margin: 0, fontFamily: 'system-ui, sans-serif', backgroundColor: '#F5F2ED' }}>
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ maxWidth: '400px', width: '100%', backgroundColor: 'white', borderRadius: '16px', padding: '32px', textAlign: 'center' }}>
            <h1 style={{ fontSize: '24px', fontWeight: 600, color: '#1A1917', marginBottom: '8px' }}>
              Er ging iets mis
            </h1>
            <p style={{ fontSize: '14px', color: '#9C9A95', marginBottom: '24px' }}>
              Er is een onverwachte fout opgetreden.
            </p>
            <button
              onClick={reset}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '12px',
                backgroundColor: '#1A1917',
                color: 'white',
                fontSize: '14px',
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
              }}
            >
              Opnieuw proberen
            </button>
          </div>
        </div>
      </body>
    </html>
  )
}
