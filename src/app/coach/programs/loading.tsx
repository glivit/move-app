export default function ProgramsLoading() {
  return (
    <div className="min-h-screen bg-[#FAFAFA] p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 animate-pulse">
          <div className="h-9 w-48 bg-[#E5E1D9] rounded-xl mb-4" style={{ fontFamily: 'var(--font-display)' }} />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-[#E5E1D9]" />
              <div className="h-4 w-40 bg-[#E5E1D9] rounded" />
            </div>
            <div className="h-10 w-44 bg-[#E5E1D9] rounded-xl" />
          </div>
        </div>

        {/* Programs Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[#E8E4DC] p-6 animate-pulse"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="h-5 w-3/4 bg-[#E5E1D9] rounded mb-2" />
                  <div className="h-3 w-full bg-[#E5E1D9] rounded" />
                </div>
                <div className="w-9 h-9 bg-[#E5E1D9] rounded-lg ml-2" />
              </div>
              <div className="flex gap-2 mb-4">
                <div className="h-6 w-20 bg-[#E5E1D9] rounded-full" />
                <div className="h-6 w-10 bg-[#E5E1D9] rounded-full" />
                <div className="h-6 w-12 bg-[#E5E1D9] rounded-full" />
              </div>
              <div className="flex gap-2">
                <div className="h-5 w-16 bg-[#E5E1D9] rounded-full" />
                <div className="h-5 w-20 bg-[#E5E1D9] rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
