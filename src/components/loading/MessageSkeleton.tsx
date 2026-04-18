/**
 * v6 Orion skeleton for an inline message list (no header / no input).
 * Alternates left (light) and right (dark) bubble placeholders.
 */
export function MessageSkeleton() {
  const leftBubble = 'rgba(253,253,254,0.18)'
  const rightBubble = 'rgba(71,75,72,0.55)'

  return (
    <div className="space-y-4 p-4">
      {/* Left */}
      <div className="flex justify-start">
        <div
          className="max-w-[78%] rounded-2xl rounded-bl-sm px-4 py-3 space-y-2"
          style={{ background: leftBubble }}
        >
          <div className="h-3 w-48 rounded-full bg-white/30 animate-pulse" />
          <div className="h-3 w-40 rounded-full bg-white/30 animate-pulse" />
        </div>
      </div>

      {/* Right */}
      <div className="flex justify-end">
        <div
          className="max-w-[78%] rounded-2xl rounded-br-sm px-4 py-3 space-y-2"
          style={{ background: rightBubble }}
        >
          <div className="h-3 w-44 rounded-full bg-white/25 animate-pulse" />
          <div className="h-3 w-36 rounded-full bg-white/25 animate-pulse" />
        </div>
      </div>

      {/* Left */}
      <div className="flex justify-start">
        <div
          className="max-w-[78%] rounded-2xl rounded-bl-sm px-4 py-3 space-y-2"
          style={{ background: leftBubble }}
        >
          <div className="h-3 w-56 rounded-full bg-white/30 animate-pulse" />
          <div className="h-3 w-48 rounded-full bg-white/30 animate-pulse" />
          <div className="h-3 w-32 rounded-full bg-white/30 animate-pulse" />
        </div>
      </div>

      {/* Right */}
      <div className="flex justify-end">
        <div
          className="max-w-[78%] rounded-2xl rounded-br-sm px-4 py-3"
          style={{ background: rightBubble }}
        >
          <div className="h-3 w-52 rounded-full bg-white/25 animate-pulse" />
        </div>
      </div>

      {/* Left */}
      <div className="flex justify-start">
        <div
          className="max-w-[78%] rounded-2xl rounded-bl-sm px-4 py-3 space-y-2"
          style={{ background: leftBubble }}
        >
          <div className="h-3 w-40 rounded-full bg-white/30 animate-pulse" />
          <div className="h-3 w-44 rounded-full bg-white/30 animate-pulse" />
        </div>
      </div>
    </div>
  )
}
