export default function BroadcastsLoading() {
  return (
    <div className="min-h-screen bg-client-bg">
      {/* Header */}
      <div className="border-b border-client-border">
        <div className="max-w-6xl mx-auto px-6 py-12 animate-pulse">
          <div className="h-9 w-36 bg-[#A6ADA7] rounded-xl mb-2" />
          <div className="h-4 w-64 bg-[#A6ADA7] rounded" />
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Broadcast form skeleton */}
        <div className="p-8 bg-[#A6ADA7] border border-client-border rounded-2xl shadow-clean mb-8 animate-pulse">
          <div className="h-5 w-36 bg-[#A6ADA7] rounded mb-6" />
          <div className="space-y-4">
            <div className="h-10 bg-[#A6ADA7]/30 rounded-xl" />
            <div className="h-24 bg-[#A6ADA7]/30 rounded-xl" />
            <div className="flex gap-3">
              <div className="h-10 w-32 bg-[#A6ADA7] rounded-xl" />
              <div className="h-10 w-32 bg-[#A6ADA7] rounded-xl" />
            </div>
          </div>
        </div>

        {/* History */}
        <div className="h-5 w-40 bg-[#A6ADA7] rounded mb-6 animate-pulse" />
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="p-6 bg-[#A6ADA7] border border-client-border rounded-2xl animate-pulse"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="h-4 w-40 bg-[#A6ADA7] rounded mb-2" />
                  <div className="h-3 w-full bg-[#A6ADA7] rounded mb-4" />
                  <div className="flex gap-4">
                    <div className="h-3 w-20 bg-[#A6ADA7] rounded" />
                    <div className="h-3 w-24 bg-[#A6ADA7] rounded" />
                    <div className="h-3 w-20 bg-[#A6ADA7] rounded" />
                  </div>
                </div>
                <div className="w-9 h-9 bg-[#A6ADA7] rounded-xl" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
