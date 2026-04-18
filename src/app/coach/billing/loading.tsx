export default function BillingLoading() {
  return (
    <div className="min-h-screen bg-client-bg">
      {/* Header */}
      <div className="border-b border-client-border">
        <div className="max-w-6xl mx-auto px-6 py-12 animate-pulse">
          <div className="h-9 w-36 bg-[#A6ADA7] rounded-xl mb-2" />
          <div className="h-4 w-56 bg-[#A6ADA7] rounded" />
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-12">
        {/* MRR Card */}
        <div className="mb-8 p-8 bg-[#A6ADA7] border border-client-border rounded-2xl shadow-clean animate-pulse">
          <div className="flex items-start justify-between">
            <div>
              <div className="h-3 w-52 bg-[#A6ADA7] rounded mb-3" />
              <div className="flex items-baseline gap-2">
                <div className="h-12 w-28 bg-[#A6ADA7] rounded-lg" />
                <div className="h-4 w-16 bg-[#A6ADA7] rounded" />
              </div>
            </div>
            <div className="w-16 h-16 rounded-2xl bg-[#A6ADA7]" />
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-6 mb-8">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="p-6 bg-[#A6ADA7] border border-client-border rounded-2xl shadow-clean animate-pulse" style={{ animationDelay: `${i * 80}ms` }}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="h-3 w-16 bg-[#A6ADA7] rounded mb-2" />
                  <div className="h-8 w-10 bg-[#A6ADA7] rounded" />
                </div>
                <div className="w-12 h-12 rounded-2xl bg-[#A6ADA7]" />
              </div>
            </div>
          ))}
        </div>

        {/* Filter buttons */}
        <div className="mb-8 p-6 bg-[#A6ADA7] border border-client-border rounded-2xl shadow-clean animate-pulse">
          <div className="flex gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-9 w-28 bg-[#A6ADA7] rounded-xl" />
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="bg-[#A6ADA7] border border-client-border rounded-2xl shadow-clean overflow-hidden animate-pulse">
          <div className="border-b border-client-border px-6 py-4 flex gap-6">
            <div className="h-3 w-16 bg-[#A6ADA7] rounded" />
            <div className="h-3 w-12 bg-[#A6ADA7] rounded" />
            <div className="h-3 w-12 bg-[#A6ADA7] rounded" />
            <div className="h-3 w-20 bg-[#A6ADA7] rounded" />
            <div className="h-3 w-10 bg-[#A6ADA7] rounded ml-auto" />
          </div>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className={`px-6 py-4 flex items-center gap-6 ${i < 4 ? 'border-b border-client-border' : ''}`}>
              <div className="flex-1">
                <div className="h-4 w-32 bg-[#A6ADA7] rounded mb-1" />
                <div className="h-3 w-44 bg-[#A6ADA7] rounded" />
              </div>
              <div className="h-5 w-20 bg-[#A6ADA7] rounded-full" />
              <div className="h-5 w-16 bg-[#A6ADA7] rounded-xl" />
              <div className="h-3 w-20 bg-[#A6ADA7] rounded" />
              <div className="h-4 w-12 bg-[#A6ADA7] rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
