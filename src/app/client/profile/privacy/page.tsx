'use client'

import { useRouter } from 'next/navigation'
import { ChevronLeft, Shield } from 'lucide-react'

export default function PrivacyPage() {
  const router = useRouter()

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="p-2 -ml-2 text-[#1A1917]">
          <ChevronLeft strokeWidth={1.5} className="w-5 h-5" />
        </button>
        <h1 className="text-editorial-h2 text-[#1A1917]">
          Privacy beleid
        </h1>
      </div>

      {/* Privacy Shield */}
      <div className="bg-white rounded-2xl border border-[#F0F0EE] p-6 flex flex-col items-center text-center">
        <div className="w-16 h-16 rounded-full bg-[#3D8B5C]/10 flex items-center justify-center mb-4">
          <Shield strokeWidth={1.5} className="w-8 h-8 text-[#3D8B5C]" />
        </div>
        <h2 className="text-[17px] font-semibold text-[#1A1917] mb-2">Jouw gegevens zijn veilig</h2>
        <p className="text-[13px] text-[#ACACAC] leading-relaxed">
          MŌVE neemt je privacy serieus. Hieronder lees je hoe we omgaan met je persoonlijke gegevens.
        </p>
      </div>

      {/* Sections */}
      <div className="bg-white rounded-2xl border border-[#F0F0EE] divide-y divide-[#F0F0EE]">
        <div className="px-5 py-5">
          <h3 className="text-[15px] font-semibold text-[#1A1917] mb-2">Welke gegevens verzamelen we?</h3>
          <p className="text-[14px] text-[#ACACAC] leading-relaxed">
            We verzamelen alleen de gegevens die nodig zijn voor je coachingtraject: naam, e-mail, trainingsdata, check-in metingen, foto's en berichten met je coach. Gezondheidsinformatie zoals blessures en voedingsvoorkeuren worden bewaard om je programma te personaliseren.
          </p>
        </div>

        <div className="px-5 py-5">
          <h3 className="text-[15px] font-semibold text-[#1A1917] mb-2">Hoe gebruiken we je gegevens?</h3>
          <p className="text-[14px] text-[#ACACAC] leading-relaxed">
            Je gegevens worden uitsluitend gebruikt door jou en je coach voor het opvolgen van je trainingsprogramma en voortgang. We verkopen nooit gegevens aan derden en gebruiken ze niet voor marketing.
          </p>
        </div>

        <div className="px-5 py-5">
          <h3 className="text-[15px] font-semibold text-[#1A1917] mb-2">Waar worden gegevens opgeslagen?</h3>
          <p className="text-[14px] text-[#ACACAC] leading-relaxed">
            Alle gegevens worden veilig opgeslagen via Supabase, gehost binnen de EU. De verbinding is versleuteld via SSL/TLS. Foto's worden opgeslagen in beveiligde cloud storage.
          </p>
        </div>

        <div className="px-5 py-5">
          <h3 className="text-[15px] font-semibold text-[#1A1917] mb-2">Wie heeft toegang?</h3>
          <p className="text-[14px] text-[#ACACAC] leading-relaxed">
            Alleen jij en je persoonlijke coach hebben toegang tot je gegevens. Er is geen openbare profielpagina of zichtbaarheid voor andere gebruikers (behalve in community posts die je zelf plaatst).
          </p>
        </div>

        <div className="px-5 py-5">
          <h3 className="text-[15px] font-semibold text-[#1A1917] mb-2">Gegevens verwijderen</h3>
          <p className="text-[14px] text-[#ACACAC] leading-relaxed">
            Je hebt het recht om je account en alle bijbehorende gegevens te laten verwijderen. Neem hiervoor contact op met je coach. Na bevestiging worden alle gegevens binnen 30 dagen permanent verwijderd.
          </p>
        </div>

        <div className="px-5 py-5">
          <h3 className="text-[15px] font-semibold text-[#1A1917] mb-2">GDPR-rechten</h3>
          <p className="text-[14px] text-[#ACACAC] leading-relaxed">
            Conform de AVG/GDPR heb je recht op inzage, correctie, verwijdering en overdraagbaarheid van je gegevens. Je kunt ook bezwaar maken tegen de verwerking. Neem contact op met je coach om van deze rechten gebruik te maken.
          </p>
        </div>
      </div>

      {/* Contact */}
      <div className="bg-white rounded-2xl border border-[#F0F0EE] p-5">
        <p className="text-[13px] text-[#ACACAC] text-center">
          Vragen over je privacy? Neem contact op via{' '}
          <a href="/client/messages" className="text-[#1A1917] font-medium">Berichten</a>
          {' '}of e-mail naar{' '}
          <span className="text-[#1A1917] font-medium">info@movecoaching.be</span>
        </p>
      </div>

      <p className="text-[11px] text-[#C0C0C0] text-center">Laatst bijgewerkt: maart 2026</p>
    </div>
  )
}
