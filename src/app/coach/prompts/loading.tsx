export default function PromptsLoading() {
  return (
    <div className="min-h-screen bg-client-bg">
      {/* Header */}
      <div className="border-b border-client-border">
        <div className="max-w-6xl mx-auto px-6 py-12 animate-pulse">
          <div className="h-9 w-44 bg-[#A6ADA7] rounded-xl mb-2" />
          <div className="h-4 w-80 bg-[#A6ADA7] rounded" />
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* New Prompt button */}
        <div className="mb-8 animate-pulse">
          <div className="h-11 w-40 bg-[#A6ADA7] rounded-xl" />
        </div>

        {/* Prompt cards */}
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="p-6 bg-[#A6ADA7] border border-client-border rounded-2xl animate-pulse"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="h-4 w-36 bg-[#A6ADA7] rounded" />
                    <div className="h-5 w-14 bg-[#A6ADA7] rounded-xl" />
                  </div>
                  <div className="h-3 w-full bg-[#A6ADA7] rounded mb-2" />
                  <div className="h-3 w-2/3 bg-[#A6ADA7] rounded mb-4" />
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-[#A6ADA7] rounded" />
                    <div className="h-3 w-32 bg-[#A6ADA7] rounded" />
                  </div>
                </div>
                <div className="flex gap-2">
                  <div className="w-9 h-9 bg-[#A6ADA7] rounded-xl" />
                  <div className="w-9 h-9 bg-[#A6ADA7] rounded-xl" />
                  <div className="w-9 h-9 bg-[#A6ADA7] rounded-xl" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
