'use client'

interface Props {
  notes: string
  moodScore: number | null
  energyScore: number | null
  sleepScore: number | null
  onChange: (updates: { notes?: string; mood_score?: number | null; energy_score?: number | null; sleep_score?: number | null }) => void
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

const SCORE_LABELS: Record<string, string[]> = {
  mood: ['Slecht', 'Matig', 'Oké', 'Goed', 'Top'],
  energy: ['Zeer laag', 'Laag', 'Oké', 'Goed', 'Top'],
  sleep: ['Slecht', 'Matig', 'Oké', 'Goed', 'Uitstekend'],
}

function ScoreSlider({
  label,
  value,
  onChange,
  scaleLabels,
}: {
  label: string
  value: number | null
  onChange: (v: number | null) => void
  scaleLabels: string[]
}) {
  const v = value ?? 0
  return (
    <div>
      <div className="flex items-center justify-between mb-2.5">
        <span className="text-[14px] text-[#1C1E18] font-medium">{label}</span>
        <span className="text-[11px] text-[rgba(28,30,24,0.62)] min-h-[16px]">
          {value ? scaleLabels[value - 1] : '—'}
        </span>
      </div>
      <div
        className="flex gap-1 p-1 rounded-full"
        style={{ background: 'rgba(28,30,24,0.10)' }}
      >
        {[1, 2, 3, 4, 5].map((n) => {
          const active = n <= v
          const current = n === v
          return (
            <button
              key={n}
              type="button"
              onClick={() => onChange(value === n ? null : n)}
              className={`flex-1 py-2 rounded-full text-[13px] font-semibold tabular-nums transition-all ${
                current
                  ? 'bg-[#1C1E18] text-[#2A2D2B] shadow-sm'
                  : active
                  ? 'text-[#1C1E18]'
                  : 'text-[rgba(28,30,24,0.58)]'
              }`}
              style={
                active && !current
                  ? { background: 'rgba(28,30,24,0.32)' }
                  : undefined
              }
            >
              {n}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export function NotesStep({ notes, moodScore, energyScore, sleepScore, onChange }: Props) {
  return (
    <div className="space-y-5">
      {/* ─── SCORES ─────────────────────────────────────── */}
      <div className="p-6 space-y-6" style={LIGHT_CARD}>
        <div className="flex items-center gap-2">
          <span style={LABEL_STYLE}>Hoe voel je je</span>
          <span className="ml-auto text-[10px] text-[rgba(28,30,24,0.58)] font-medium">Optioneel</span>
        </div>

        <ScoreSlider
          label="Stemming"
          value={moodScore}
          onChange={(v) => onChange({ mood_score: v })}
          scaleLabels={SCORE_LABELS.mood}
        />
        <ScoreSlider
          label="Energie"
          value={energyScore}
          onChange={(v) => onChange({ energy_score: v })}
          scaleLabels={SCORE_LABELS.energy}
        />
        <ScoreSlider
          label="Slaap"
          value={sleepScore}
          onChange={(v) => onChange({ sleep_score: v })}
          scaleLabels={SCORE_LABELS.sleep}
        />
      </div>

      {/* ─── NOTITIES ──────────────────────────────────── */}
      <div className="p-5" style={LIGHT_CARD}>
        <div className="flex items-center gap-2 mb-3">
          <span style={LABEL_STYLE}>Notities</span>
          <span className="ml-auto text-[10px] text-[rgba(28,30,24,0.58)] font-medium tabular-nums">
            {notes.length}/500
          </span>
        </div>
        <textarea
          value={notes}
          onChange={(e) => onChange({ notes: e.target.value })}
          placeholder="Hoe voelde je deze maand? Iets dat je coach moet weten?"
          rows={4}
          maxLength={500}
          className="w-full px-3.5 py-3 bg-[rgba(28,30,24,0.10)] rounded-[14px] text-[14px] text-[#1C1E18] placeholder-[rgba(28,30,24,0.58)] focus:outline-none focus:bg-[rgba(28,30,24,0.14)] transition-colors resize-none"
        />
      </div>
    </div>
  )
}
