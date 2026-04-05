export default function NutritionLoading() {
  return (
    <div className="min-h-screen bg-client-bg">
      {/* Header */}
      <div className="mb-8 animate-pulse">
        <div className="h-9 w-32 bg-[#E5E1D9] rounded-xl mb-2" />
        <div className="h-4 w-56 bg-[#E5E1D9] rounded" />
      </div>

      {/* Action bar */}
      <div className="flex items-center justify-between mb-6 animate-pulse">
        <div className="h-10 w-64 bg-white rounded-xl border border-client-border" />
        <div className="h-10 w-36 bg-[#E5E1D9] rounded-xl" />
      </div>

      {/* Client nutrition cards */}
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="bg-white rounded-2xl p-5 border border-client-border shadow-clean animate-pulse"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#E5E1D9]" />
                <div>
                  <div className="h-4 w-32 bg-[#E5E1D9] rounded mb-1" />
                  <div className="h-3 w-20 bg-[#E5E1D9] rounded" />
                </div>
              </div>
              <div className="flex gap-6">
                <div className="text-center">
                  <div className="h-5 w-10 bg-[#E5E1D9] rounded mx-auto mb-1" />
                  <div className="h-2.5 w-8 bg-[#E5E1D9] rounded mx-auto" />
                </div>
                <div className="text-center">
                  <div className="h-5 w-10 bg-[#E5E1D9] rounded mx-auto mb-1" />
                  <div className="h-2.5 w-8 bg-[#E5E1D9] rounded mx-auto" />
                </div>
                <div className="text-center">
                  <div className="h-5 w-10 bg-[#E5E1D9] rounded mx-auto mb-1" />
                  <div className="h-2.5 w-8 bg-[#E5E1D9] rounded mx-auto" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
