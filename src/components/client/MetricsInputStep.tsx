'use client'

interface Props {
  metrics: {
    weight_kg: string
    body_fat_pct: string
    muscle_mass_kg: string
    visceral_fat_level: string
    body_water_pct: string
    bmi: string
  }
  onChange: (metrics: Props['metrics']) => void
}

const LIGHT_CARD: React.CSSProperties = {
  background: 'rgba(255,255,255,0.50)',
  borderRadius: 24,
  boxShadow:
    'inset 0 1px 0 rgba(255,255,255,0.14), 0 1px 2px rgba(0,0,0,0.10)',
}

const LABEL_STYLE: React.CSSProperties = {
  fontSize: 10,
  letterSpacing: '0.16em',
  textTransform: 'uppercase',
  color: 'rgba(28,30,24,0.58)',
  fontWeight: 600,
}

const fields = [
  { key: 'weight_kg' as const, label: 'Gewicht', unit: 'kg', placeholder: '82,5' },
  { key: 'body_fat_pct' as const, label: 'Vetpercentage', unit: '%', placeholder: '18,2' },
  { key: 'muscle_mass_kg' as const, label: 'Spiermassa', unit: 'kg', placeholder: '35,4' },
  { key: 'visceral_fat_level' as const, label: 'Visceraal vet', unit: 'lvl', placeholder: '8' },
  { key: 'body_water_pct' as const, label: 'Water', unit: '%', placeholder: '55,3' },
  { key: 'bmi' as const, label: 'BMI', unit: '', placeholder: '24,1' },
]

export function MetricsInputStep({ metrics, onChange }: Props) {
  const handleChange = (key: keyof typeof metrics, value: string) => {
    onChange({ ...metrics, [key]: value })
  }

  return (
    <div className="space-y-5">
      <div className="p-5" style={LIGHT_CARD}>
        <div className="flex items-center gap-2 mb-4">
          <span style={LABEL_STYLE}>InBody metingen</span>
        </div>
        <p className="text-[13px] text-[rgba(28,30,24,0.62)] leading-relaxed mb-5">
          Voer je InBody resultaten in. Gebruik komma als decimaalteken.
        </p>

        <div className="grid grid-cols-2 gap-3">
          {fields.map(({ key, label, unit, placeholder }) => (
            <label
              key={key}
              className="block rounded-[14px] px-3.5 py-3"
              style={{ background: 'rgba(28,30,24,0.10)' }}
            >
              <span className="block text-[10px] font-semibold uppercase tracking-[0.12em] text-[rgba(28,30,24,0.62)] mb-1">
                {label}
                {unit && <span className="ml-1 text-[rgba(28,30,24,0.58)]">({unit})</span>}
              </span>
              <input
                type="text"
                inputMode="decimal"
                value={metrics[key]}
                onChange={(e) => handleChange(key, e.target.value)}
                placeholder={placeholder}
                className="w-full bg-transparent text-[18px] font-semibold text-[#1C1E18] placeholder-[rgba(28,30,24,0.42)] outline-none tabular-nums"
              />
            </label>
          ))}
        </div>
      </div>
    </div>
  )
}
