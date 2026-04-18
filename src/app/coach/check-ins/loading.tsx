export default function CheckInsLoading() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="animate-pulse">
        <div className="h-9 w-40 bg-[#A6ADA7] rounded-xl" />
        <div className="h-4 w-64 bg-[#A6ADA7] rounded mt-2" />
      </div>

      {/* Pending section */}
      <div>
        <div className="h-5 w-32 bg-[#A6ADA7] rounded mb-4 animate-pulse" />
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="bg-[#A6ADA7] rounded-2xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[#A6ADA7] animate-pulse"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#A6ADA7]" />
                  <div>
                    <div className="h-4 w-32 bg-[#A6ADA7] rounded mb-1" />
                    <div className="h-3 w-20 bg-[#A6ADA7] rounded" />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-5 w-16 bg-[#A6ADA7] rounded-full" />
                  <div className="h-3 w-16 bg-[#A6ADA7] rounded" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Reviewed section */}
      <div>
        <div className="h-5 w-28 bg-[#A6ADA7] rounded mb-4 animate-pulse" />
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="bg-[#A6ADA7] rounded-2xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[#A6ADA7] animate-pulse"
              style={{ animationDelay: `${(i + 4) * 60}ms` }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#A6ADA7]" />
                  <div>
                    <div className="h-4 w-28 bg-[#A6ADA7] rounded mb-1" />
                    <div className="h-3 w-16 bg-[#A6ADA7] rounded" />
                  </div>
                </div>
                <div className="h-3 w-20 bg-[#A6ADA7] rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
