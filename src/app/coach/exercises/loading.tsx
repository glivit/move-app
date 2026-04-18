export default function ExercisesLoading() {
  return (
    <div className="min-h-screen bg-client-bg">
      {/* Page Title */}
      <div className="mb-8 animate-pulse">
        <div className="h-9 w-40 bg-[#A6ADA7] rounded-xl" />
        <div className="h-4 w-28 bg-[#A6ADA7] rounded mt-2" />
      </div>

      {/* Controls */}
      <div className="mb-8 space-y-4 animate-pulse">
        {/* Search bar */}
        <div className="h-12 bg-[#A6ADA7] border border-client-border rounded-2xl" />

        {/* Body part filter tabs */}
        <div className="flex gap-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-9 w-16 bg-[#A6ADA7] rounded-full" />
          ))}
        </div>

        {/* Equipment dropdown */}
        <div className="h-10 bg-[#A6ADA7] border border-client-border rounded-2xl" />

        {/* New exercise button */}
        <div className="h-12 bg-[#A6ADA7] rounded-2xl" />
      </div>

      {/* Exercises Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="bg-[#A6ADA7] rounded-2xl shadow-clean border border-client-border overflow-hidden animate-pulse"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <div className="aspect-video bg-[#A6ADA7]" />
            <div className="p-4 space-y-3">
              <div className="h-4 bg-[#A6ADA7] rounded w-3/4" />
              <div className="flex gap-2">
                <div className="h-6 bg-[#A6ADA7] rounded-full w-16" />
                <div className="h-6 bg-[#A6ADA7] rounded-full w-20" />
              </div>
              <div className="h-3 bg-[#A6ADA7] rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
