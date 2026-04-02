'use client'

import { Input } from '@/components/ui/Input'

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

const fields = [
  { key: 'weight_kg' as const, label: 'Gewicht', unit: 'kg', placeholder: '82,5' },
  { key: 'body_fat_pct' as const, label: 'Vetpercentage', unit: '%', placeholder: '18,2' },
  { key: 'muscle_mass_kg' as const, label: 'Spiermassa', unit: 'kg', placeholder: '35,4' },
  { key: 'visceral_fat_level' as const, label: 'Visceraal vet', unit: 'level', placeholder: '8' },
  { key: 'body_water_pct' as const, label: 'Waterpercentage', unit: '%', placeholder: '55,3' },
  { key: 'bmi' as const, label: 'BMI', unit: '', placeholder: '24,1' },
]

export function MetricsInputStep({ metrics, onChange }: Props) {
  const handleChange = (key: keyof typeof metrics, value: string) => {
    onChange({ ...metrics, [key]: value })
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-semibold text-[20px]">InBody metingen</h3>
        <p className="text-sm text-text-secondary mt-1">
          Voer je InBody resultaten in. Gebruik komma als decimaalteken.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {fields.map(({ key, label, unit, placeholder }) => (
          <div key={key}>
            <Input
              label={`${label}${unit ? ` (${unit})` : ''}`}
              type="text"
              inputMode="decimal"
              value={metrics[key]}
              onChange={(e) => handleChange(key, e.target.value)}
              placeholder={placeholder}
            />
          </div>
        ))}
      </div>
    </div>
  )
}
