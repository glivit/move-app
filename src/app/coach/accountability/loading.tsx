export default function AccountabilityLoading() {
  return (
    <div className="min-h-screen bg-client-bg">
      {/* Header */}
      <div className="mb-8 animate-pulse">
        <div className="h-9 w-48 bg-[#E5E1D9] rounded-xl" />
        <div className="h-4 w-72 bg-[#E5E1D9] rounded mt-2" />
      </div>

      {/* Period filter pills */}
      <div className="flex gap-2 mb-6 animate-pulse">
        <div className="h-9 w-20 bg-[#E5E1D9] rounded-full" />
        <div className="h-9 w-20 bg-[#E5E1D9] rounded-full" />
        <div className="h-9 w-20 bg-[#E5E1D9] rounded-full" />
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-3 mb-6 animate-pulse">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-white rounded-2xl p-4 border border-[#E8E4DC] text-center">
            <div className="h-7 w-10 bg-[#E5E1D9] rounded mx-auto mb-2" />
            <div className="h-3 w-24 bg-[#E5E1D9] rounded mx-auto" />
          </div>
        ))}
      </div>

      {/* Client list */}
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="bg-white rounded-2xl p-5 border border-[#E8E4DC] animate-pulse"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-[#E5E1D9] shrink-0" />
              <div className="flex-1">
                <div className="h-4 w-32 bg-[#E5E1D9] rounded mb-2" />
                <div className="flex gap-3">
                  <div className="h-3 w-16 bg-[#E5E1D9] rounded" />
                  <div className="h-3 w-28 bg-[#E5E1D9] rounded" />
                  <div className="h-3 w-24 bg-[#E5E1D9] rounded" />
                </div>
              </div>
              <div className="h-6 w-8 bg-[#E5E1D9] rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
