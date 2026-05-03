// Skeleton color: subtle ink-tint, matches aurora canvas palette (was hard-coded #A6ADA7
// from the pre-aurora greenscale era — flashed against the new beige tint).
const SKELETON = 'rgba(28,30,24,0.08)'
const SKELETON_BORDER = 'rgba(28,30,24,0.06)'

export default function CoachDashboardLoading() {
  return (
    <div className="space-y-10">
      {/* Greeting */}
      <div className="pt-2 animate-pulse">
        <div className="h-10 w-72 rounded-xl" style={{ background: SKELETON }} />
        <div className="h-4 w-48 rounded mt-3" style={{ background: SKELETON }} />
      </div>

      {/* KPI Cards — 5 columns matching real layout */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="rounded-2xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] animate-pulse"
            style={{ background: SKELETON, border: `1px solid ${SKELETON_BORDER}`, animationDelay: `${i * 80}ms` }}
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="h-2.5 w-14 rounded mb-3" style={{ background: SKELETON }} />
                <div className="h-7 w-10 rounded" style={{ background: SKELETON }} />
              </div>
              <div className="w-10 h-10 rounded-xl" style={{ background: SKELETON }} />
            </div>
          </div>
        ))}
      </div>

      {/* Action Required section */}
      <div>
        <div className="h-6 w-36 rounded mb-6 animate-pulse" style={{ background: SKELETON }} />
        <div className="space-y-5">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden animate-pulse" style={{ background: SKELETON, border: `1px solid ${SKELETON_BORDER}`, animationDelay: `${(i + 5) * 80}ms` }}>
              <div className="px-6 py-4 flex items-center gap-2.5" style={{ borderBottom: `1px solid ${SKELETON_BORDER}` }}>
                <div className="w-2.5 h-2.5 rounded-full" style={{ background: SKELETON }} />
                <div className="h-3.5 w-20 rounded" style={{ background: SKELETON }} />
                <div className="h-3 w-24 rounded ml-auto" style={{ background: SKELETON }} />
              </div>
              {Array.from({ length: 3 }).map((_, j) => (
                <div key={j} className="flex items-center justify-between px-6 py-4" style={j < 2 ? { borderBottom: `1px solid ${SKELETON_BORDER}` } : undefined}>
                  <div className="flex items-center gap-3">
                    <div className="h-4 w-32 rounded" style={{ background: SKELETON }} />
                    <div className="h-5 w-16 rounded-full" style={{ background: SKELETON }} />
                  </div>
                  <div className="h-3 w-16 rounded" style={{ background: SKELETON }} />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <div className="h-6 w-32 rounded mb-6 animate-pulse" style={{ background: SKELETON }} />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-2xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] animate-pulse" style={{ background: SKELETON, border: `1px solid ${SKELETON_BORDER}`, animationDelay: `${(i + 7) * 80}ms` }}>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl" style={{ background: SKELETON }} />
                <div>
                  <div className="h-4 w-28 rounded mb-1.5" style={{ background: SKELETON }} />
                  <div className="h-3 w-40 rounded" style={{ background: SKELETON }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
