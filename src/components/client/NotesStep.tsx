'use client'

interface Props {
  notes: string
  moodScore: number | null
  energyScore: number | null
  sleepScore: number | null
  onChange: (updates: { notes?: string; mood_score?: number | null; energy_score?: number | null; sleep_score?: number | null }) => void
}

function ScoreSlider({ label, value, onChange }: { label: string; value: number | null; onChange: (v: number | null) => void }) {
  return (
    <div>
      <label className="block text-sm font-medium text-text-primary mb-2">{label}</label>
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map((score) => (
          <button
            key={score}
            type="button"
            onClick={() => onChange(value === score ? null : score)}
            className={`w-10 h-10 rounded-lg text-sm font-semibold transition-all ${
              value === score
                ? 'bg-accent text-white'
                : 'bg-surface-muted text-text-secondary hover:bg-surface-muted/80'
            }`}
          >
            {score}
          </button>
        ))}
      </div>
    </div>
  )
}

export function NotesStep({ notes, moodScore, energyScore, sleepScore, onChange }: Props) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-semibold text-[20px]">Hoe voel je je?</h3>
        <p className="text-sm text-text-secondary mt-1">Optioneel — deel wat je wilt.</p>
      </div>

      <div className="space-y-6">
        <ScoreSlider label="Stemming" value={moodScore} onChange={(v) => onChange({ mood_score: v })} />
        <ScoreSlider label="Energie" value={energyScore} onChange={(v) => onChange({ energy_score: v })} />
        <ScoreSlider label="Slaap" value={sleepScore} onChange={(v) => onChange({ sleep_score: v })} />
      </div>

      <div>
        <label className="block text-sm font-medium text-text-primary mb-1.5">
          Notities
        </label>
        <textarea
          value={notes}
          onChange={(e) => onChange({ notes: e.target.value })}
          placeholder="Hoe voelde je je deze week? Iets dat je coach moet weten?"
          rows={4}
          maxLength={500}
          className="w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent resize-none"
        />
        <p className="text-xs text-text-muted text-right mt-1">{notes.length}/500</p>
      </div>
    </div>
  )
}
