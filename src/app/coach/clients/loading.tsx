export default function ClientsLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-10 w-48 bg-[#E5E1D9] rounded-lg" />
      <div className="h-11 bg-white rounded-xl" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map(i => (
          <div key={i} className="bg-white rounded-2xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-11 h-11 rounded-full bg-[#E5E1D9]" />
              <div>
                <div className="h-4 w-28 bg-[#E5E1D9] rounded mb-1" />
                <div className="h-3 w-20 bg-[#E5E1D9] rounded" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
