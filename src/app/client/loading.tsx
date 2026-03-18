export default function ClientLoading() {
  return (
    <div className="pb-28 animate-pulse">
      <div className="mb-8">
        <div className="h-3 w-20 bg-[#E5E1D9] rounded mb-3" />
        <div className="h-8 w-48 bg-[#E5E1D9] rounded-lg" />
      </div>
      <div className="h-28 bg-white rounded-2xl shadow-[var(--shadow-card)] mb-4" />
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-20 bg-white rounded-2xl shadow-[var(--shadow-card)]" />
        ))}
      </div>
    </div>
  )
}
