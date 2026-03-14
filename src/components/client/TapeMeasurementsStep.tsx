'use client'

import { Input } from '@/components/ui/Input'

interface Props {
  measurements: Record<string, string>
  onChange: (measurements: Props['measurements']) => void
}

const fields = [
  { key: 'chest_cm', label: 'Borst' },
  { key: 'waist_cm', label: 'Taille' },
  { key: 'hips_cm', label: 'Heupen' },
  { key: 'left_arm_cm', label: 'Linkerarm' },
  { key: 'right_arm_cm', label: 'Rechterarm' },
  { key: 'left_thigh_cm', label: 'Linkerbovenbeen' },
  { key: 'right_thigh_cm', label: 'Rechterbovenbeen' },
  { key: 'left_calf_cm', label: 'Linkerkuit' },
  { key: 'right_calf_cm', label: 'Rechterkuit' },
]

export function TapeMeasurementsStep({ measurements, onChange }: Props) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-display font-semibold text-lg">Omtrekmaten</h3>
        <p className="text-sm text-text-secondary mt-1">
          Meet alle omtrekken in centimeters met een meetlint.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {fields.map(({ key, label }) => (
          <Input
            key={key}
            label={`${label} (cm)`}
            type="text"
            inputMode="decimal"
            value={measurements[key] || ''}
            onChange={(e) => onChange({ ...measurements, [key]: e.target.value })}
            placeholder="0,0"
          />
        ))}
      </div>
    </div>
  )
}
