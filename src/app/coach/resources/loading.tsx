export default function ResourcesLoading() {
  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      {/* Header */}
      <div className="border-b border-[#E8E4DC]">
        <div className="max-w-6xl mx-auto px-6 py-12 animate-pulse">
          <div className="flex justify-between items-start">
            <div>
              <div className="h-9 w-36 bg-[#E5E1D9] rounded-xl" />
              <div className="h-4 w-72 bg-[#E5E1D9] rounded mt-2" />
            </div>
            <div className="h-11 w-40 bg-[#E5E1D9] rounded-xl" />
          </div>

          {/* Stats */}
          <div className="flex gap-6 mt-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="text-center">
                <div className="h-6 w-8 bg-[#E5E1D9] rounded mx-auto" />
                <div className="h-3 w-14 bg-[#E5E1D9] rounded mx-auto mt-1" />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Search & Filter */}
        <div className="flex items-center gap-3 mb-6 animate-pulse">
          <div className="flex-1 h-10 bg-white rounded-xl border border-[#E8E4DC]" />
          <div className="h-10 w-64 bg-[#E8E4DC] rounded-xl" />
        </div>

        {/* Resources Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="bg-white rounded-2xl border border-[#E8E4DC] overflow-hidden animate-pulse"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <div className="h-2 bg-[#E5E1D9]" />
              <div className="p-5">
                <div className="flex items-center gap-2 mb-2">
                  <div className="h-4 w-14 bg-[#E5E1D9] rounded-md" />
                  <div className="h-3 w-12 bg-[#E5E1D9] rounded" />
                </div>
                <div className="h-4 w-3/4 bg-[#E5E1D9] rounded mb-1" />
                <div className="h-3 w-full bg-[#E5E1D9] rounded mb-3" />
                <div className="flex items-center justify-between">
                  <div className="h-3 w-8 bg-[#E5E1D9] rounded" />
                  <div className="flex gap-1">
                    <div className="w-7 h-7 bg-[#E5E1D9] rounded-lg" />
                    <div className="w-7 h-7 bg-[#E5E1D9] rounded-lg" />
                    <div className="w-7 h-7 bg-[#E5E1D9] rounded-lg" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
