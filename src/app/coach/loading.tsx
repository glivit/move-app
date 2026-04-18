export default function CoachDashboardLoading() {
  return (
    <div className="space-y-10">
      {/* Greeting */}
      <div className="pt-2 animate-pulse">
        <div className="h-10 w-72 bg-[#A6ADA7] rounded-xl" />
        <div className="h-4 w-48 bg-[#A6ADA7] rounded mt-3" />
      </div>

      {/* KPI Cards — 5 columns matching real layout */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="bg-[#A6ADA7] rounded-2xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[#A6ADA7] animate-pulse"
            style={{ animationDelay: `${i * 80}ms` }}
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="h-2.5 w-14 bg-[#A6ADA7] rounded mb-3" />
                <div className="h-7 w-10 bg-[#A6ADA7] rounded" />
              </div>
              <div className="w-10 h-10 rounded-xl bg-[#A6ADA7]" />
            </div>
          </div>
        ))}
      </div>

      {/* Action Required section */}
      <div>
        <div className="h-6 w-36 bg-[#A6ADA7] rounded mb-6 animate-pulse" />
        <div className="space-y-5">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="bg-[#A6ADA7] rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[#A6ADA7] overflow-hidden animate-pulse" style={{ animationDelay: `${(i + 5) * 80}ms` }}>
              <div className="px-6 py-4 border-b border-[#A6ADA7] flex items-center gap-2.5">
                <div className="w-2.5 h-2.5 rounded-full bg-[#A6ADA7]" />
                <div className="h-3.5 w-20 bg-[#A6ADA7] rounded" />
                <div className="h-3 w-24 bg-[#A6ADA7] rounded ml-auto" />
              </div>
              {Array.from({ length: 3 }).map((_, j) => (
                <div key={j} className={`flex items-center justify-between px-6 py-4 ${j < 2 ? 'border-b border-[#A6ADA7]' : ''}`}>
                  <div className="flex items-center gap-3">
                    <div className="h-4 w-32 bg-[#A6ADA7] rounded" />
                    <div className="h-5 w-16 bg-[#A6ADA7] rounded-full" />
                  </div>
                  <div className="h-3 w-16 bg-[#A6ADA7] rounded" />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <div className="h-6 w-32 bg-[#A6ADA7] rounded mb-6 animate-pulse" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-[#A6ADA7] rounded-2xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[#A6ADA7] animate-pulse" style={{ animationDelay: `${(i + 7) * 80}ms` }}>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-[#A6ADA7]" />
                <div>
                  <div className="h-4 w-28 bg-[#A6ADA7] rounded mb-1.5" />
                  <div className="h-3 w-40 bg-[#A6ADA7] rounded" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
