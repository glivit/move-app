import { createServerSupabaseClient } from '@/lib/supabase-server'
import { notFound } from 'next/navigation'
import Image from 'next/image'
import {
  ArrowLeft, Target, Dumbbell, Heart, Apple, Moon, Ruler, Camera,
  Briefcase, Coffee, Wine, UtensilsCrossed, Flame, Clock, MapPin,
  AlertTriangle, MessageSquare, ChefHat,
} from 'lucide-react'
import Link from 'next/link'

interface Props {
  params: Promise<{ id: string }>
}

function extractStoragePath(url: string): string | null {
  try {
    const match = url.match(/\/storage\/v1\/object\/public\/checkin-photos\/(.+)$/)
    return match ? match[1] : null
  } catch {
    return null
  }
}

export default async function IntakeFormPage({ params }: Props) {
  const { id } = await params
  const supabase = await createServerSupabaseClient()

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, full_name, sex, date_of_birth')
    .eq('id', id)
    .single()

  if (!profile) notFound()

  const { data: intake } = await supabase
    .from('intake_forms')
    .select('*')
    .eq('client_id', id)
    .single()

  if (!intake) {
    return (
      <div className="space-y-6">
        <Link
          href={`/coach/clients/${id}`}
          className="inline-flex items-center gap-1 text-[#8E8E93] hover:text-[#666] transition-colors"
        >
          <ArrowLeft strokeWidth={1.5} className="w-4 h-4" />
          <span className="text-sm font-medium">Terug naar {profile.full_name}</span>
        </Link>
        <div className="bg-white rounded-2xl p-8 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[#E8E4DC] text-center">
          <p className="text-[#8E8E93]">Geen intake formulier beschikbaar voor deze cliënt.</p>
        </div>
      </div>
    )
  }

  const i = intake as any

  // Generate signed URLs for photos
  const photoEntries = [
    { key: 'photo_front_url', label: 'Voorkant' },
    { key: 'photo_back_url', label: 'Achterkant' },
    { key: 'photo_left_url', label: 'Linkerkant' },
    { key: 'photo_right_url', label: 'Rechterkant' },
  ]

  const signedPhotos: { url: string; label: string }[] = []
  for (const { key, label } of photoEntries) {
    if (i[key]) {
      const path = extractStoragePath(i[key])
      if (path) {
        const { data: signedData } = await supabase.storage
          .from('checkin-photos')
          .createSignedUrl(path, 3600)
        if (signedData?.signedUrl) {
          signedPhotos.push({ url: signedData.signedUrl, label })
        }
      }
    }
  }

  /* ─── Shared Components ──────────────────────────── */

  const Section = ({ icon: Icon, title, children }: { icon: any; title: string; children: React.ReactNode }) => (
    <div className="bg-white rounded-2xl p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[#E8E4DC]">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#EDEAE4' }}>
          <Icon className="w-5 h-5" strokeWidth={1.5} style={{ color: '#1A1917' }} />
        </div>
        <h2 className="text-[17px] font-semibold" style={{ color: '#1A1A18' }}>{title}</h2>
      </div>
      {children}
    </div>
  )

  const Field = ({ label, value }: { label: string; value: string | number | null | undefined }) => {
    if (!value && value !== 0) return null
    return (
      <div>
        <p className="text-[12px] uppercase font-medium tracking-wide" style={{ color: '#8E8E93' }}>{label}</p>
        <p className="mt-1 text-[14px] whitespace-pre-line" style={{ color: '#1A1A18' }}>{value}</p>
      </div>
    )
  }

  const TagList = ({ label, items }: { label: string; items: string[] | null | undefined }) => {
    if (!items || items.length === 0) return null
    return (
      <div>
        <p className="text-[12px] uppercase font-medium tracking-wide" style={{ color: '#8E8E93' }}>{label}</p>
        <div className="flex flex-wrap gap-2 mt-2">
          {items.map((item: string) => (
            <span key={item} className="text-[13px] px-3 py-1.5 rounded-full" style={{ backgroundColor: '#EDEAE4', color: '#1A1917' }}>
              {item}
            </span>
          ))}
        </div>
      </div>
    )
  }

  const tapeMeasurements = [
    { label: 'Borst', value: i.chest_cm },
    { label: 'Taille', value: i.waist_cm },
    { label: 'Heupen', value: i.hips_cm },
    { label: 'Linkerarm', value: i.left_arm_cm },
    { label: 'Rechterarm', value: i.right_arm_cm },
    { label: 'Linkerbovenbeen', value: i.left_thigh_cm },
    { label: 'Rechterbovenbeen', value: i.right_thigh_cm },
    { label: 'Linkerkuit', value: i.left_calf_cm },
    { label: 'Rechterkuit', value: i.right_calf_cm },
  ].filter(m => m.value)

  // Map stress_level number to label
  const stressLabel = typeof i.stress_level === 'number'
    ? i.stress_level <= 3 ? 'Laag' : i.stress_level <= 6 ? 'Gemiddeld' : 'Hoog'
    : i.stress_level

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link
          href={`/coach/clients/${id}`}
          className="inline-flex items-center gap-1 text-[#8E8E93] hover:text-[#666] transition-colors mb-4"
        >
          <ArrowLeft strokeWidth={1.5} className="w-4 h-4" />
          <span className="text-sm font-medium">Terug naar {profile.full_name}</span>
        </Link>

        <h1 className="text-3xl font-display font-semibold" style={{ color: '#1A1A18' }}>
          Intake formulier
        </h1>
        <p className="text-sm mt-1" style={{ color: '#8E8E93' }}>
          {profile.full_name} — ingevuld op {new Date(intake.created_at).toLocaleDateString('nl-BE', { day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>

      {/* ─── Doelen ─── */}
      <Section icon={Target} title="Doelen">
        <div className="space-y-4">
          <Field label="Hoofddoel" value={i.primary_goal} />
          <Field label="Doeltype" value={i.goal_type !== i.primary_goal ? i.goal_type : null} />
          <TagList label="Secundaire doelen" items={i.secondary_goals} />
          <Field label="Streefgewicht" value={i.goal_weight_kg ? `${i.goal_weight_kg} kg` : null} />
          <Field label="Doel omschrijving" value={i.goal_description} />
          <Field label="Tempo" value={i.goal_pace} />
          <Field label="Motivatie" value={i.motivation_statement} />
          {i.previous_attempts && (
            <Field label="Eerder geprobeerd" value={i.previous_attempts_detail || 'Ja'} />
          )}
        </div>
      </Section>

      {/* ─── Training ─── */}
      <Section icon={Dumbbell} title="Training">
        <div className="space-y-4">
          <Field label="Trainingslocatie" value={i.training_location} />
          <TagList label="Beschikbare apparatuur" items={i.home_equipment} />
          <Field label="Ervaringsniveau" value={i.experience_level} />
          <Field label="Frequentie" value={i.training_frequency ? `${i.training_frequency}x per week` : i.current_activity_level} />
          <TagList label="Type training" items={i.training_types} />
          <Field label="Sessieduur" value={i.session_duration} />
          <TagList label="Voorkeursdagen" items={i.preferred_training_days} />
          <Field label="Trainingsachtergrond" value={i.training_experience} />
        </div>
      </Section>

      {/* ─── Gezondheid ─── */}
      <Section icon={Heart} title="Gezondheid">
        <div className="space-y-4">
          <Field label="Blessures / beperkingen" value={i.injuries_limitations || (i.has_injuries ? 'Ja (niet gespecificeerd)' : 'Geen')} />
          <Field label="Verleden met eetproblemen" value={i.has_food_relationship_issues ? 'Ja' : 'Nee'} />
        </div>
      </Section>

      {/* ─── Dagelijkse voeding ─── */}
      <Section icon={UtensilsCrossed} title="Dagelijkse voeding">
        <div className="space-y-4">
          {i.typical_daily_eating && (
            <div>
              <p className="text-[12px] uppercase font-medium tracking-wide" style={{ color: '#8E8E93' }}>Wat eet je op een doorsnee dag?</p>
              <div className="mt-2 p-4 rounded-xl text-[14px] leading-relaxed whitespace-pre-line" style={{ backgroundColor: '#FAFAFA', color: '#1A1A18' }}>
                {i.typical_daily_eating}
              </div>
            </div>
          )}
          <TagList label="Favoriete maaltijden" items={i.favorite_meals} />
          <TagList label="Haat-voedsel" items={i.hated_foods} />
          <TagList label="Allergieën / restricties" items={i.allergies} />
          <Field label="Restricties (tekst)" value={i.dietary_restrictions} />
          <Field label="Maaltijden per dag" value={i.meals_per_day} />
        </div>
      </Section>

      {/* ─── Kookstijl & snacks ─── */}
      <Section icon={ChefHat} title="Kookstijl & snacks">
        <div className="space-y-4">
          <Field label="Kookstijl" value={i.cooking_style} />
          <Field label="Voedingsvoorkeuren" value={i.dietary_preferences !== i.cooking_style ? i.dietary_preferences : null} />
          <Field label="Kooksituatie" value={i.social_context} />
          <TagList label="Huidige snacks" items={i.current_snacks} />
          <TagList label="Waarom snacken?" items={i.snack_reason} />
          <Field label="Snackvoorkeur" value={i.snack_preference} />
          <Field label="Avondsnacker" value={i.evening_snacker} />
          {i.food_adventurousness !== null && i.food_adventurousness !== undefined && (
            <div>
              <p className="text-[12px] uppercase font-medium tracking-wide" style={{ color: '#8E8E93' }}>Avontuurlijk met eten</p>
              <div className="flex items-center gap-2 mt-2">
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                    <div
                      key={n}
                      className="w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-medium"
                      style={{
                        backgroundColor: n <= (i.food_adventurousness || 0) ? '#1A1917' : '#EDEAE4',
                        color: n <= (i.food_adventurousness || 0) ? 'white' : '#8E8E93',
                      }}
                    >
                      {n}
                    </div>
                  ))}
                </div>
                <span className="text-[12px]" style={{ color: '#8E8E93' }}>/ 10</span>
              </div>
            </div>
          )}
        </div>
      </Section>

      {/* ─── Levensstijl ─── */}
      <Section icon={Moon} title="Levensstijl">
        <div className="space-y-4">
          <Field label="Type werk" value={i.work_type} />
          {i.sleep_hours_avg && (
            <Field label="Gemiddelde slaap" value={`${i.sleep_hours_avg} uur per nacht`} />
          )}
          {i.stress_level && (
            <div>
              <p className="text-[12px] uppercase font-medium tracking-wide" style={{ color: '#8E8E93' }}>Stressniveau</p>
              <div className="flex items-center gap-3 mt-2">
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map(n => (
                    <div
                      key={n}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-[13px] font-medium"
                      style={{
                        backgroundColor: n <= i.stress_level ? '#1A1917' : '#EDEAE4',
                        color: n <= i.stress_level ? 'white' : '#8E8E93',
                      }}
                    >
                      {n}
                    </div>
                  ))}
                </div>
                <span className="text-[13px] font-medium" style={{ color: '#8E8E93' }}>
                  {stressLabel}
                </span>
              </div>
            </div>
          )}
          <Field label="Alcohol" value={i.alcohol} />
          <Field label="Koffie/cafeïne" value={i.caffeine} />
        </div>
      </Section>

      {/* ─── Startmetingen ─── */}
      <Section icon={Ruler} title="Startmetingen">
        <div className="grid grid-cols-3 gap-4">
          {i.weight_kg && (
            <div className="p-4 rounded-xl" style={{ backgroundColor: '#FAFAFA' }}>
              <p className="text-[12px] uppercase font-medium tracking-wide" style={{ color: '#8E8E93' }}>Gewicht</p>
              <p className="text-xl font-bold mt-1" style={{ color: '#1A1A18' }}>{i.weight_kg} <span className="text-sm font-normal" style={{ color: '#8E8E93' }}>kg</span></p>
            </div>
          )}
          {i.height_cm && (
            <div className="p-4 rounded-xl" style={{ backgroundColor: '#FAFAFA' }}>
              <p className="text-[12px] uppercase font-medium tracking-wide" style={{ color: '#8E8E93' }}>Lengte</p>
              <p className="text-xl font-bold mt-1" style={{ color: '#1A1A18' }}>{i.height_cm} <span className="text-sm font-normal" style={{ color: '#8E8E93' }}>cm</span></p>
            </div>
          )}
          {i.age && (
            <div className="p-4 rounded-xl" style={{ backgroundColor: '#FAFAFA' }}>
              <p className="text-[12px] uppercase font-medium tracking-wide" style={{ color: '#8E8E93' }}>Leeftijd</p>
              <p className="text-xl font-bold mt-1" style={{ color: '#1A1A18' }}>{i.age} <span className="text-sm font-normal" style={{ color: '#8E8E93' }}>jaar</span></p>
            </div>
          )}
        </div>

        {tapeMeasurements.length > 0 && (
          <div className="mt-5">
            <p className="text-[13px] font-semibold mb-3" style={{ color: '#1A1A18' }}>Omtrekmaten</p>
            <div className="grid grid-cols-3 gap-3">
              {tapeMeasurements.map(m => (
                <div key={m.label} className="p-3 rounded-xl" style={{ backgroundColor: '#FAFAFA' }}>
                  <p className="text-[11px] uppercase font-medium tracking-wide" style={{ color: '#8E8E93' }}>{m.label}</p>
                  <p className="text-[15px] font-semibold mt-1" style={{ color: '#1A1A18' }}>{m.value} <span className="text-[12px] font-normal" style={{ color: '#8E8E93' }}>cm</span></p>
                </div>
              ))}
            </div>
          </div>
        )}
      </Section>

      {/* ─── Startfoto's ─── */}
      {signedPhotos.length > 0 && (
        <Section icon={Camera} title="Startfoto's">
          <div className="grid grid-cols-2 gap-3">
            {signedPhotos.map(({ url, label }) => (
              <div key={label} className="relative aspect-[3/4] rounded-xl overflow-hidden bg-[#FAFAFA]">
                <Image src={url} alt={label} width={400} height={500} className="w-full h-full object-cover" unoptimized loading="lazy" />
                <span className="absolute bottom-2 left-2 text-xs font-medium text-white bg-black/50 px-2 py-0.5 rounded">
                  {label}
                </span>
              </div>
            ))}
          </div>
        </Section>
      )}
    </div>
  )
}
