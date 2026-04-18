/**
 * v6 Orion loading skeleton for a full message thread (header + messages + input).
 */
export function MessageThreadSkeleton() {
  const muted = 'rgba(253,253,254,0.18)'
  const ownMuted = 'rgba(71,75,72,0.55)'

  return (
    <div className="flex flex-col h-full" style={{ background: '#8E9890' }}>
      {/* Header */}
      <div
        className="px-6 py-4 flex items-center justify-between"
        style={{
          background: '#474B48',
          boxShadow: 'inset 0 -1px 0 rgba(255,255,255,0.06)',
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-full animate-pulse"
            style={{ background: 'rgba(253,253,254,0.14)' }}
          />
          <div className="space-y-2">
            <div
              className="h-4 w-32 rounded-full animate-pulse"
              style={{ background: 'rgba(253,253,254,0.14)' }}
            />
            <div
              className="h-3 w-24 rounded-full animate-pulse"
              style={{ background: 'rgba(253,253,254,0.10)' }}
            />
          </div>
        </div>
        <div
          className="w-8 h-8 rounded-full animate-pulse"
          style={{ background: 'rgba(253,253,254,0.10)' }}
        />
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-auto p-6 space-y-4">
        {/* Left bubble */}
        <div className="flex justify-start">
          <div
            className="max-w-[78%] rounded-2xl rounded-bl-sm px-4 py-3 space-y-2"
            style={{ background: muted }}
          >
            <div className="h-3 w-48 rounded-full bg-white/30 animate-pulse" />
            <div className="h-3 w-40 rounded-full bg-white/30 animate-pulse" />
          </div>
        </div>

        {/* Right bubble */}
        <div className="flex justify-end">
          <div
            className="max-w-[78%] rounded-2xl rounded-br-sm px-4 py-3"
            style={{ background: ownMuted }}
          >
            <div className="h-3 w-44 rounded-full bg-white/25 animate-pulse" />
          </div>
        </div>

        {/* Left bubble */}
        <div className="flex justify-start">
          <div
            className="max-w-[78%] rounded-2xl rounded-bl-sm px-4 py-3 space-y-2"
            style={{ background: muted }}
          >
            <div className="h-3 w-56 rounded-full bg-white/30 animate-pulse" />
            <div className="h-3 w-48 rounded-full bg-white/30 animate-pulse" />
          </div>
        </div>

        {/* Right bubble */}
        <div className="flex justify-end">
          <div
            className="max-w-[78%] rounded-2xl rounded-br-sm px-4 py-3"
            style={{ background: ownMuted }}
          >
            <div className="h-3 w-52 rounded-full bg-white/25 animate-pulse" />
          </div>
        </div>
      </div>

      {/* Input */}
      <div
        className="px-4 py-3"
        style={{
          background: '#474B48',
          borderTop: '1px solid rgba(253,253,254,0.08)',
        }}
      >
        <div
          className="h-11 rounded-full animate-pulse"
          style={{ background: 'rgba(253,253,254,0.10)' }}
        />
      </div>
    </div>
  )
}
