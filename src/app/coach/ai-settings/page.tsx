'use client'

import { useState } from 'react'
import { Bot, MessageSquare, Clock, Zap, CheckCircle2, Loader2, Send } from 'lucide-react'

export default function AISettingsPage() {
  const [autoFeedback, setAutoFeedback] = useState(true)
  const [nudgeMissedWorkout, setNudgeMissedWorkout] = useState(true)
  const [nudgeMissedNutrition, setNudgeMissedNutrition] = useState(false)
  const [weeklyMotivation, setWeeklyMotivation] = useState(true)
  const [feedbackDelay, setFeedbackDelay] = useState(3) // minutes
  const [testMessage, setTestMessage] = useState('')
  const [testResult, setTestResult] = useState('')
  const [testing, setTesting] = useState(false)

  const handleTestAI = async () => {
    if (!testMessage.trim()) return
    setTesting(true)
    setTestResult('')

    try {
      const res = await fetch('/api/ai-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: testMessage }),
      })

      if (res.ok) {
        const data = await res.json()
        setTestResult(data.response || 'Geen reactie ontvangen')
      } else {
        setTestResult('AI niet beschikbaar — voeg ANTHROPIC_API_KEY toe aan je omgevingsvariabelen')
      }
    } catch {
      setTestResult('Fout bij communicatie met AI')
    } finally {
      setTesting(false)
    }
  }

  const ToggleSwitch = ({ enabled, onChange, label, description }: {
    enabled: boolean
    onChange: (v: boolean) => void
    label: string
    description: string
  }) => (
    <div className="flex items-start justify-between gap-4 py-4">
      <div>
        <p className="text-[14px] font-medium text-[#FDFDFE]">{label}</p>
        <p className="text-[12px] text-[#D6D9D6] mt-0.5">{description}</p>
      </div>
      <button
        onClick={() => onChange(!enabled)}
        className={`w-12 h-7 rounded-full flex items-center px-0.5 transition-colors flex-shrink-0 ${
          enabled ? 'bg-[var(--color-pop)]' : 'bg-[#A6ADA7]'
        }`}
      >
        <div className={`w-6 h-6 rounded-full bg-[#A6ADA7] shadow-sm transition-transform ${
          enabled ? 'translate-x-5' : 'translate-x-0'
        }`} />
      </button>
    </div>
  )

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="pt-2">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#8A7BA8]/20 to-[#8A7BA8]/5 flex items-center justify-center">
            <Bot className="w-5 h-5 text-[#8A7BA8]" strokeWidth={1.5} />
          </div>
          <div>
            <h1 className="text-[28px] font-semibold text-[#FDFDFE] tracking-[-0.02em]" style={{ fontFamily: 'var(--font-display)' }}>
              AI Coach Agent
            </h1>
          </div>
        </div>
        <p className="text-[15px] text-[#E6E8E7]">
          Jouw digitale tweeling die automatisch reageert op workouts en inactiviteit. Cliënten denken dat jij het bent.
        </p>
      </div>

      {/* Auto Feedback Settings */}
      <div className="bg-[#A6ADA7] rounded-2xl border border-[#A6ADA7] shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
        <div className="px-6 py-4 border-b border-[#A6ADA7] flex items-center gap-2.5">
          <Zap className="w-4 h-4 text-[#8A7BA8]" strokeWidth={1.5} />
          <h2 className="text-[15px] font-semibold text-[#FDFDFE]">Automatische reacties</h2>
        </div>

        <div className="px-6 divide-y divide-[#A6ADA7]">
          <ToggleSwitch
            enabled={autoFeedback}
            onChange={setAutoFeedback}
            label="Workout feedback"
            description={`AI stuurt automatisch feedback ${feedbackDelay} min nadat een cliënt traint — tenzij jij al reageerde`}
          />
          <ToggleSwitch
            enabled={nudgeMissedWorkout}
            onChange={setNudgeMissedWorkout}
            label="Gemiste workout nudge"
            description="Stuurt om 20:00 een bericht als een geplande workout niet is afgerond"
          />
          <ToggleSwitch
            enabled={nudgeMissedNutrition}
            onChange={setNudgeMissedNutrition}
            label="Voedingslogging herinnering"
            description="Herinnert cliënten die hun voeding niet bijhouden (binnenkort)"
          />
          <ToggleSwitch
            enabled={weeklyMotivation}
            onChange={setWeeklyMotivation}
            label="Wekelijkse motivatie"
            description="Stuurt elke maandag een persoonlijk motivatiebericht"
          />
        </div>
      </div>

      {/* Timing */}
      <div className="bg-[#A6ADA7] rounded-2xl border border-[#A6ADA7] shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
        <div className="px-6 py-4 border-b border-[#A6ADA7] flex items-center gap-2.5">
          <Clock className="w-4 h-4 text-[#8A7BA8]" strokeWidth={1.5} />
          <h2 className="text-[15px] font-semibold text-[#FDFDFE]">Timing</h2>
        </div>
        <div className="px-6 py-5">
          <label className="text-[12px] font-semibold text-[#D6D9D6] uppercase tracking-wide block mb-2">
            Vertraging workout feedback
          </label>
          <p className="text-[12px] text-[#D6D9D6] mb-3">
            Hoe lang wacht de AI voordat het reageert? Dit geeft jou tijd om zelf te reageren.
          </p>
          <div className="flex gap-2">
            {[1, 3, 5, 10, 15].map(min => (
              <button
                key={min}
                onClick={() => setFeedbackDelay(min)}
                className={`px-4 py-2 rounded-xl text-[13px] font-semibold transition-all ${
                  feedbackDelay === min
                    ? 'bg-[#474B48] text-white'
                    : 'bg-[#A6ADA7] text-[#E6E8E7] hover:bg-[#A6ADA7]'
                }`}
              >
                {min} min
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Test AI */}
      <div className="bg-[#A6ADA7] rounded-2xl border border-[#A6ADA7] shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
        <div className="px-6 py-4 border-b border-[#A6ADA7] flex items-center gap-2.5">
          <MessageSquare className="w-4 h-4 text-[#8A7BA8]" strokeWidth={1.5} />
          <h2 className="text-[15px] font-semibold text-[#FDFDFE]">Test jouw AI agent</h2>
        </div>
        <div className="px-6 py-5 space-y-4">
          <p className="text-[13px] text-[#D6D9D6]">
            Beschrijf een situatie en kijk hoe jouw AI reageert. Bijv: &ldquo;Jan heeft net zijn push day gedaan, 45 min, 2 PR&apos;s, voelde zich sterk&rdquo;
          </p>
          <textarea
            value={testMessage}
            onChange={(e) => setTestMessage(e.target.value)}
            placeholder="Beschrijf een situatie..."
            className="w-full px-4 py-3 border border-[#A6ADA7] rounded-xl text-[14px] text-[#FDFDFE] placeholder-[#CDD1CE] focus:outline-none focus:border-[#FDFDFE] resize-none h-20"
          />
          <button
            onClick={handleTestAI}
            disabled={testing || !testMessage.trim()}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#8A7BA8] text-white text-[13px] font-semibold hover:bg-[#6A4E96] transition-colors disabled:opacity-50"
          >
            {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Test AI reactie
          </button>

          {testResult && (
            <div className="bg-[#A6ADA7] rounded-xl p-4 border border-[#A6ADA7]">
              <div className="flex items-center gap-2 mb-2">
                <Bot className="w-4 h-4 text-[#8A7BA8]" strokeWidth={1.5} />
                <span className="text-[12px] font-bold text-[#8A7BA8] uppercase tracking-wide">Glenn AI</span>
              </div>
              <p className="text-[14px] text-[#FDFDFE] whitespace-pre-wrap">{testResult}</p>
            </div>
          )}
        </div>
      </div>

      {/* Info */}
      <div className="bg-[#A6ADA7] rounded-2xl p-5 border border-[#A6ADA7]">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-[#2FA65A] flex-shrink-0 mt-0.5" strokeWidth={1.5} />
          <div>
            <p className="text-[14px] font-medium text-[#FDFDFE] mb-1">Hoe het werkt</p>
            <ul className="text-[13px] text-[#E6E8E7] space-y-1.5">
              <li>De AI schrijft conceptberichten — die komen op je dashboard terecht</li>
              <li>Jij bekijkt elk concept: bewerken, versturen, of verwijderen</li>
              <li>Niets wordt automatisch verstuurd zonder jouw goedkeuring</li>
              <li>Cliënten zien berichten vanuit &ldquo;Glenn&rdquo; — niet AI</li>
              <li>Als jij zelf al feedback hebt gegeven, maakt de AI geen concept aan</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
