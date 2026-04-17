export default function WorkoutLoading() {
  return (
    <div className="pb-28 animate-pulse">
      {/* Dark hero card skeleton */}
      <div
        className="rounded-[24px] mb-4"
        style={{
          height: 200,
          background: 'rgba(71,75,72,0.65)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)',
        }}
      />

      {/* Context head skeleton */}
      <div className="flex justify-between items-center mb-2 px-1">
        <div
          className="h-3 w-20 rounded-md"
          style={{ background: 'rgba(253,253,254,0.18)' }}
        />
        <div
          className="h-3 w-24 rounded-md"
          style={{ background: 'rgba(253,253,254,0.10)' }}
        />
      </div>

      {/* Frosted week-card skeleton */}
      <div
        className="rounded-[24px]"
        style={{
          background: 'rgba(253,253,254,0.08)',
          padding: '6px 4px',
          minHeight: 340,
        }}
      >
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 px-4 py-4"
            style={{
              borderTop: i === 0 ? 'none' : '1px solid rgba(253,253,254,0.06)',
            }}
          >
            <div
              className="h-4 w-10 rounded"
              style={{ background: 'rgba(253,253,254,0.14)' }}
            />
            <div className="flex-1 space-y-1.5">
              <div
                className="h-3 w-32 rounded"
                style={{ background: 'rgba(253,253,254,0.12)' }}
              />
              <div
                className="h-2.5 w-24 rounded"
                style={{ background: 'rgba(253,253,254,0.06)' }}
              />
            </div>
            <div
              className="h-5 w-14 rounded-full"
              style={{ background: 'rgba(253,253,254,0.08)' }}
            />
          </div>
        ))}
      </div>
    </div>
  )
}
