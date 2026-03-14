import { ArrowDown, ArrowUp, Minus } from 'lucide-react'

interface MetricCardProps {
  label: string
  value: number | string | null
  previousValue?: number | null
  unit?: string
  type?: 'positive-down' | 'positive-up' | 'neutral'
  className?: string
}

export function MetricCard({
  label,
  value,
  previousValue,
  unit = '',
  type = 'neutral',
  className = '',
}: MetricCardProps) {
  const numValue = value !== null && value !== undefined ? (typeof value === 'number' ? value : parseFloat(value)) : null
  const delta =
    numValue !== null && previousValue !== undefined && previousValue !== null ? numValue - previousValue : undefined

  const getDeltaColor = () => {
    if (delta === undefined || delta === 0) return '#A3957E'
    if (type === 'positive-down') return delta < 0 ? '#1D8C47' : '#E08A3D'
    if (type === 'positive-up') return delta > 0 ? '#1D8C47' : '#E08A3D'
    return '#A3957E'
  }

  const getDeltaIcon = () => {
    if (delta === undefined || delta === 0) return <Minus size={12} strokeWidth={2} />
    return delta > 0 ? <ArrowUp size={12} strokeWidth={2} /> : <ArrowDown size={12} strokeWidth={2} />
  }

  return (
    <div
      className={`rounded-xl p-4 border ${className}`}
      style={{
        backgroundColor: '#FFFFFF',
        borderColor: '#E8E0D5',
      }}
    >
      <p className="text-xs font-medium mb-2" style={{ color: '#A3957E' }}>
        {label}
      </p>
      <div className="flex items-baseline gap-1.5">
        <span className="text-2xl font-display font-semibold" style={{ color: '#1A1A18' }}>
          {numValue !== null ? (typeof value === 'number' ? value.toFixed(1) : numValue.toFixed(1)) : '—'}
        </span>
        {unit && (
          <span className="text-sm" style={{ color: '#A3957E' }}>
            {unit}
          </span>
        )}
      </div>
      {delta !== undefined && (
        <div className="flex items-center gap-1 mt-3 text-xs font-medium" style={{ color: getDeltaColor() }}>
          {getDeltaIcon()}
          <span>
            {Math.abs(delta).toFixed(1)} {unit}
          </span>
        </div>
      )}
    </div>
  )
}
