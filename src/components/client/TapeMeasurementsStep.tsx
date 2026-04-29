'use client'

interface Props {
  measurements: Record<string, string>
  onChange: (measurements: Props['measurements']) => void
}

const LIGHT_CARD: React.CSSProperties = {
  background: '#A6ADA7',
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

const SECTIONS: Array<{ title: string; fields: Array<{ key: string; label: string }> }> = [
  {
    title: 'Torso',
    fields: [
      { key: 'chest_cm', label: 'Borst' },
      { key: 'waist_cm', label: 'Taille' },
      { key: 'hips_cm', label: 'Heupen' },
    ],
  },
  {
    title: 'Armen',
    fields: [
      { key: 'left_arm_cm', label: 'Links' },
      { key: 'right_arm_cm', label: 'Rechts' },
    ],
  },
  {
    title: 'Bovenbenen',
    fields: [
      { key: 'left_thigh_cm', label: 'Links' },
      { key: 'right_thigh_cm', label: 'Rechts' },
    ],
  },
  {
    title: 'Kuiten',
    fields: [
      { key: 'left_calf_cm', label: 'Links' },
      { key: 'right_calf_cm', label: 'Rechts' },
    ],
  },
]

export function TapeMeasurementsStep({ measurements, onChange }: Props) {
  const handleChange = (key: string, value: string) => {
    onChange({ ...measurements, [key]: value })
  }

  return (
    <div className="space-y-5">
      <div className="p-5" style={LIGHT_CARD}>
        <div className="flex items-center gap-2 mb-4">
          <span style={LABEL_STYLE}>Omtrekmaten (cm)</span>
        </div>
        <p className="text-[13px] text-[rgba(28,30,24,0.62)] leading-relaxed mb-5">
          Meet alle omtrekken in centimeters met een meetlint.
        </p>

        <div className="space-y-5">
          {SECTIONS.map((section) => (
            <div key={section.title}>
              <p className="text-[11px] font-semibold text-[rgba(28,30,24,0.72)] mb-2">
                {section.title}
              </p>
              <div className="grid grid-cols-2 gap-3">
                {section.fields.map(({ key, label }) => (
                  <label
                    key={key}
                    className="block rounded-[14px] px-3.5 py-3"
                    style={{ background: 'rgba(28,30,24,0.10)' }}
                  >
                    <span className="block text-[10px] font-semibold uppercase tracking-[0.12em] text-[rgba(28,30,24,0.62)] mb-1">
                      {label}
                    </span>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={measurements[key] || ''}
                      onChange={(e) => handleChange(key, e.target.value)}
                      placeholder="0,0"
                      className="w-full bg-transparent text-[18px] font-semibold text-[#1C1E18] placeholder-[rgba(28,30,24,0.42)] outline-none tabular-nums"
                    />
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
