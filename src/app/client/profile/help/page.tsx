'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronDown, MessageSquare } from 'lucide-react'

const FAQ_ITEMS = [
  {
    q: 'Hoe start ik een workout?',
    a: 'Ga naar het Training tabblad en tik op "Start Workout". Selecteer de trainingsdag die je wilt uitvoeren. De app begeleidt je door elke oefening met sets, reps en rusttijden.',
  },
  {
    q: 'Hoe log ik mijn voeding?',
    a: 'Ga naar Voeding in het menu. Je kunt daar je maaltijden loggen per dag. Je coach kan ook een maaltijdplan voor je klaarzetten met specifieke macro-doelen.',
  },
  {
    q: 'Hoe doe ik een check-in?',
    a: 'Tik op Check-in in het menu. Vul je gewicht, metingen en foto\'s in. Je coach bekijkt deze gegevens en geeft je feedback via berichten.',
  },
  {
    q: 'Hoe wijzig ik mijn trainingsprogramma?',
    a: 'Je trainingsprogramma wordt door je coach ingesteld. Heb je een aanpassing nodig? Stuur een bericht naar je coach via het Berichten tabblad.',
  },
  {
    q: 'Wat betekent de PR-badge?',
    a: 'PR staat voor Persoonlijk Record. Wanneer je een nieuw gewichtsrecord behaalt voor een oefening, wordt dit automatisch gedetecteerd en gevierd met een badge en confetti.',
  },
  {
    q: 'Hoe werkt de rusttimer?',
    a: 'Na het loggen van een set start de rusttimer automatisch. Je hoort een geluidssignaal wanneer de rust bijna voorbij is, en trillingen wanneer je verder kunt.',
  },
  {
    q: 'Kan ik mijn pakket wijzigen?',
    a: 'Neem contact op met je coach om je pakket aan te passen. Beschikbare pakketten zijn Essential (€297/maand), Performance (€497/maand) en Elite (€797/maand).',
  },
  {
    q: 'Hoe werkt de voortgangstracking?',
    a: 'Ga naar Voortgang om je statistieken te bekijken. Je ziet daar grafieken van je check-in data, trainingsvolume, persoonlijke records en meer.',
  },
  {
    q: 'Ik heb een technisch probleem. Wat nu?',
    a: 'Stuur een bericht naar je coach met een beschrijving van het probleem. Je kunt ook de pagina herladen of de app sluiten en opnieuw openen.',
  },
]

export default function HelpPage() {
  const router = useRouter()
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="p-2 -ml-2 text-[#1A1917]">
          <ChevronLeft strokeWidth={1.5} className="w-5 h-5" />
        </button>
        <h1 className="text-editorial-h2 text-[#1A1917]">
          Help & FAQ
        </h1>
      </div>

      {/* Contact Coach */}
      <a
        href="/client/messages"
        className="bg-[#1A1917] rounded-2xl p-5 flex items-center gap-4 text-white hover:bg-[#7A5C12] transition-colors"
      >
        <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
          <MessageSquare strokeWidth={1.5} className="w-6 h-6" />
        </div>
        <div>
          <p className="text-[15px] font-semibold">Stel een vraag aan je coach</p>
          <p className="text-[13px] opacity-80">De snelste manier om hulp te krijgen</p>
        </div>
      </a>

      {/* FAQ */}
      <div>
        <p className="text-[13px] font-medium text-[#8E8E93] uppercase tracking-wide px-1 mb-2">Veelgestelde vragen</p>
        <div className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[#E8E4DC] divide-y divide-[#E8E4DC]">
          {FAQ_ITEMS.map((item, index) => (
            <div key={index}>
              <button
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-[#FAFAFA] transition-colors"
              >
                <span className="text-[15px] text-[#1A1A18] pr-4">{item.q}</span>
                <ChevronDown
                  strokeWidth={1.5}
                  className={`w-5 h-5 text-[#8E8E93] flex-shrink-0 transition-transform ${
                    openIndex === index ? 'rotate-180' : ''
                  }`}
                />
              </button>
              {openIndex === index && (
                <div className="px-5 pb-4">
                  <p className="text-[14px] text-[#8E8E93] leading-relaxed">{item.a}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* App Version */}
      <div className="text-center pt-4">
        <p className="text-[13px] text-[#C7C7CC]">MŌVE Coaching App v1.0.0</p>
        <p className="text-[11px] text-[#C7C7CC] mt-1">Premium Coaching · Knokke</p>
      </div>
    </div>
  )
}
