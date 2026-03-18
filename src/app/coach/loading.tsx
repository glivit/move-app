export default function CoachLoading() {
  return (
    <div className="space-y-8 animate-pulse">
      <div>
        <div className="h-10 w-64 bg-[#E5E1D9] rounded-lg" />
        <div className="h-4 w-40 bg-[#E5E1D9] rounded-md mt-3" />
      </div>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="bg-white rounded-2xl p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <div className="h-3 w-20 bg-[#E5E1D9] rounded mb-3" />
            <div className="h-9 w-16 bg-[#E5E1D9] rounded" />
          </div>
        ))}
      </div>
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-white rounded-2xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <div className="h-4 w-32 bg-[#E5E1D9] rounded mb-3" />
            <div className="h-3 w-48 bg-[#E5E1D9] rounded" />
          </div>
        ))}
      </div>
    </div>
  )
}
