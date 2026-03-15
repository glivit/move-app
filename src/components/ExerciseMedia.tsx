'use client'

import { useState, type ReactNode } from 'react'
import { Play } from 'lucide-react'

// ─── Muscle group icon SVGs in MŌVE gold ────────────────────────────

const muscleIcons: Record<string, ReactNode> = {
  chest: (
    <svg viewBox="0 0 64 64" fill="none" className="w-full h-full">
      <path d="M32 20c-8 0-16 4-18 12-1 5 2 10 6 12 4 2 8 2 12 0 4 2 8 2 12 0 4-2 7-7 6-12-2-8-10-12-18-12z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.6"/>
      <path d="M32 20v24M22 28c2 3 5 5 10 5M42 28c-2 3-5 5-10 5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity="0.4"/>
    </svg>
  ),
  back: (
    <svg viewBox="0 0 64 64" fill="none" className="w-full h-full">
      <path d="M32 14v36M26 18c-3 4-5 10-5 18s2 10 5 14M38 18c3 4 5 10 5 18s-2 10-5 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.6"/>
      <path d="M24 26h16M24 32h16M24 38h16" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.3"/>
    </svg>
  ),
  shoulders: (
    <svg viewBox="0 0 64 64" fill="none" className="w-full h-full">
      <path d="M20 36c0-8 5-14 12-14s12 6 12 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.6"/>
      <circle cx="20" cy="36" r="5" stroke="currentColor" strokeWidth="1.5" opacity="0.5"/>
      <circle cx="44" cy="36" r="5" stroke="currentColor" strokeWidth="1.5" opacity="0.5"/>
      <circle cx="32" cy="28" r="3" stroke="currentColor" strokeWidth="1" opacity="0.3"/>
    </svg>
  ),
  arms: (
    <svg viewBox="0 0 64 64" fill="none" className="w-full h-full">
      <path d="M28 18c-2 6-3 12-2 18 1 4 3 7 6 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.6"/>
      <path d="M36 18c2 6 3 12 2 18-1 4-3 7-6 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.6"/>
      <ellipse cx="26" cy="30" rx="4" ry="6" stroke="currentColor" strokeWidth="1.2" opacity="0.4"/>
      <ellipse cx="38" cy="30" rx="4" ry="6" stroke="currentColor" strokeWidth="1.2" opacity="0.4"/>
    </svg>
  ),
  legs: (
    <svg viewBox="0 0 64 64" fill="none" className="w-full h-full">
      <path d="M28 14c-1 8-2 16-3 24-1 4-2 8-1 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.6"/>
      <path d="M36 14c1 8 2 16 3 24 1 4 2 8 1 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.6"/>
      <ellipse cx="27" cy="26" rx="4" ry="8" stroke="currentColor" strokeWidth="1.2" opacity="0.4"/>
      <ellipse cx="37" cy="26" rx="4" ry="8" stroke="currentColor" strokeWidth="1.2" opacity="0.4"/>
    </svg>
  ),
  core: (
    <svg viewBox="0 0 64 64" fill="none" className="w-full h-full">
      <rect x="22" y="18" width="20" height="28" rx="4" stroke="currentColor" strokeWidth="1.5" opacity="0.6"/>
      <path d="M32 18v28M22 25h20M22 32h20M22 39h20" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.3"/>
    </svg>
  ),
  cardio: (
    <svg viewBox="0 0 64 64" fill="none" className="w-full h-full">
      <path d="M32 48c-12-8-18-14-18-22 0-6 4-10 9-10 3 0 6 2 9 5 3-3 6-5 9-5 5 0 9 4 9 10 0 8-6 14-18 22z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.6"/>
      <path d="M20 32h6l3-5 6 10 3-5h6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" opacity="0.4"/>
    </svg>
  ),
}

function getMuscleIcon(bodyPart: string) {
  const key = bodyPart?.toLowerCase() || ''
  return muscleIcons[key] || muscleIcons.chest
}

// ─── Equipment labels in NL ──────────────────────────────────────────

const equipmentLabels: Record<string, string> = {
  machine: 'Machine',
  cable: 'Kabel',
  barbell: 'Barbell',
  dumbbell: 'Dumbbell',
  'body weight': 'Lichaamsgewicht',
  kettlebell: 'Kettlebell',
  'smith machine': 'Smith Machine',
  'ez bar': 'EZ Bar',
  'trap bar': 'Trap Bar',
  'resistance band': 'Weerstandsband',
  'foam roller': 'Foam Roller',
}

function getEquipmentLabel(equipment: string) {
  return equipmentLabels[equipment?.toLowerCase()] || equipment
}

// ─── Body part labels in NL ──────────────────────────────────────────

const bodyPartLabels: Record<string, string> = {
  chest: 'Borst',
  back: 'Rug',
  shoulders: 'Schouders',
  arms: 'Armen',
  legs: 'Benen',
  core: 'Kern',
  cardio: 'Cardio',
  neck: 'Nek',
}

function getBodyPartLabel(bodyPart: string) {
  return bodyPartLabels[bodyPart?.toLowerCase()] || bodyPart
}

// ─── Body part accent colors ─────────────────────────────────────────

const bodyPartAccents: Record<string, { bg: string; text: string; border: string }> = {
  chest: { bg: 'rgba(200,169,110,0.08)', text: '#9B7B2E', border: 'rgba(200,169,110,0.15)' },
  back: { bg: 'rgba(48,104,196,0.08)', text: '#3068C4', border: 'rgba(48,104,196,0.15)' },
  shoulders: { bg: 'rgba(139,105,20,0.08)', text: '#8B6914', border: 'rgba(139,105,20,0.15)' },
  arms: { bg: 'rgba(196,125,21,0.08)', text: '#C47D15', border: 'rgba(196,125,21,0.15)' },
  legs: { bg: 'rgba(61,139,92,0.08)', text: '#3D8B5C', border: 'rgba(61,139,92,0.15)' },
  core: { bg: 'rgba(192,75,55,0.08)', text: '#C04B37', border: 'rgba(192,75,55,0.15)' },
  cardio: { bg: 'rgba(200,169,110,0.08)', text: '#9B7B2E', border: 'rgba(200,169,110,0.15)' },
}

function getAccent(bodyPart: string) {
  return bodyPartAccents[bodyPart?.toLowerCase()] || bodyPartAccents.chest
}

// ─── Props ───────────────────────────────────────────────────────────

interface ExerciseMediaProps {
  /** Exercise name */
  name: string
  /** Dutch name (preferred) */
  nameNl?: string | null
  /** Body part category */
  bodyPart: string
  /** Target muscle */
  targetMuscle?: string
  /** Equipment type */
  equipment?: string
  /** ExerciseDB GIF URL */
  gifUrl?: string | null
  /** Custom video URL (YouTube, etc.) */
  videoUrl?: string | null
  /** Display variant */
  variant?: 'hero' | 'card' | 'compact'
  /** Show equipment/muscle labels */
  showLabels?: boolean
}

// ─── Component ───────────────────────────────────────────────────────

export function ExerciseMedia({
  name,
  nameNl,
  bodyPart,
  targetMuscle,
  equipment,
  gifUrl,
  videoUrl,
  variant = 'hero',
  showLabels = true,
}: ExerciseMediaProps) {
  const [imgError, setImgError] = useState(false)
  const [imgLoaded, setImgLoaded] = useState(false)
  const accent = getAccent(bodyPart)
  const displayName = nameNl || name
  const hasGif = gifUrl && !imgError

  // ─── Hero variant: full-width in active workout ──────────────────

  if (variant === 'hero') {
    return (
      <div className="relative overflow-hidden" style={{ background: '#F8F6F2' }}>
        {hasGif ? (
          <>
            {/* Loading skeleton */}
            {!imgLoaded && (
              <div className="aspect-[4/3] flex items-center justify-center">
                <div className="w-12 h-12 text-[#C8A96E]/30">
                  {getMuscleIcon(bodyPart)}
                </div>
              </div>
            )}
            {/* GIF with premium treatment */}
            <div
              className="flex items-center justify-center transition-opacity duration-500"
              style={{
                maxHeight: '44vh',
                opacity: imgLoaded ? 1 : 0,
              }}
            >
              <img
                src={gifUrl!}
                alt={displayName}
                loading="eager"
                decoding="async"
                onLoad={() => setImgLoaded(true)}
                onError={() => setImgError(true)}
                className="w-full h-full object-contain"
                style={{
                  maxHeight: '44vh',
                  mixBlendMode: 'multiply',
                  filter: 'saturate(0.3) contrast(0.95) brightness(1.02)',
                }}
              />
            </div>
            {/* Subtle warm gradient overlay */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: 'linear-gradient(180deg, rgba(248,246,242,0) 60%, rgba(248,246,242,0.6) 85%, rgba(248,246,242,1) 100%)',
              }}
            />
            {/* Top fade */}
            <div
              className="absolute inset-x-0 top-0 h-8 pointer-events-none"
              style={{
                background: 'linear-gradient(180deg, rgba(248,246,242,0.4) 0%, rgba(248,246,242,0) 100%)',
              }}
            />
          </>
        ) : (
          /* ── Premium fallback: muscle group illustration ── */
          <div
            className="aspect-[4/3] flex flex-col items-center justify-center px-8"
            style={{ background: `linear-gradient(135deg, ${accent.bg} 0%, rgba(248,246,242,1) 100%)` }}
          >
            <div className="w-20 h-20 mb-4" style={{ color: accent.text, opacity: 0.35 }}>
              {getMuscleIcon(bodyPart)}
            </div>
            <p className="text-[13px] font-medium tracking-wide uppercase" style={{ color: accent.text, opacity: 0.5 }}>
              {getBodyPartLabel(bodyPart)}
            </p>
          </div>
        )}

        {/* Video play button overlay */}
        {videoUrl && (
          <a
            href={videoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="absolute top-4 right-4 w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-105"
            style={{
              backgroundColor: 'rgba(26,25,23,0.7)',
              backdropFilter: 'blur(8px)',
            }}
          >
            <Play size={16} strokeWidth={2} className="text-white ml-0.5" />
          </a>
        )}

        {/* Equipment & muscle badges */}
        {showLabels && (equipment || targetMuscle) && (
          <div className="absolute bottom-3 left-4 right-4 flex items-center gap-2">
            {equipment && (
              <span
                className="text-[11px] font-semibold px-2.5 py-1 rounded-full"
                style={{
                  backgroundColor: 'rgba(26,25,23,0.06)',
                  color: '#5C5A55',
                  backdropFilter: 'blur(4px)',
                }}
              >
                {getEquipmentLabel(equipment)}
              </span>
            )}
            {targetMuscle && (
              <span
                className="text-[11px] font-medium px-2.5 py-1 rounded-full"
                style={{
                  backgroundColor: accent.bg,
                  color: accent.text,
                  border: `1px solid ${accent.border}`,
                }}
              >
                {targetMuscle.charAt(0).toUpperCase() + targetMuscle.slice(1)}
              </span>
            )}
          </div>
        )}
      </div>
    )
  }

  // ─── Card variant: exercise browser grid ─────────────────────────

  if (variant === 'card') {
    return (
      <div className="relative aspect-video overflow-hidden" style={{ background: '#F8F6F2' }}>
        {hasGif ? (
          <>
            <img
              src={gifUrl!}
              alt={displayName}
              loading="lazy"
              decoding="async"
              onError={() => setImgError(true)}
              className="w-full h-full object-cover"
              style={{
                mixBlendMode: 'multiply',
                filter: 'saturate(0.25) contrast(0.92) brightness(1.04)',
              }}
            />
            {/* Bottom gradient */}
            <div
              className="absolute inset-x-0 bottom-0 h-12 pointer-events-none"
              style={{
                background: 'linear-gradient(180deg, transparent 0%, rgba(248,246,242,0.7) 100%)',
              }}
            />
          </>
        ) : (
          <div
            className="w-full h-full flex flex-col items-center justify-center"
            style={{ background: `linear-gradient(135deg, ${accent.bg} 0%, rgba(248,246,242,1) 100%)` }}
          >
            <div className="w-12 h-12 mb-2" style={{ color: accent.text, opacity: 0.3 }}>
              {getMuscleIcon(bodyPart)}
            </div>
            <p className="text-[11px] font-medium uppercase tracking-wide" style={{ color: accent.text, opacity: 0.45 }}>
              {getBodyPartLabel(bodyPart)}
            </p>
          </div>
        )}
      </div>
    )
  }

  // ─── Compact variant: inline list item ───────────────────────────

  return (
    <div
      className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 overflow-hidden"
      style={{
        background: hasGif ? '#F8F6F2' : `linear-gradient(135deg, ${accent.bg} 0%, rgba(248,246,242,1) 100%)`,
      }}
    >
      {hasGif ? (
        <img
          src={gifUrl!}
          alt={displayName}
          loading="lazy"
          decoding="async"
          onError={() => setImgError(true)}
          className="w-full h-full object-cover"
          style={{
            mixBlendMode: 'multiply',
            filter: 'saturate(0.2) contrast(0.9) brightness(1.05)',
          }}
        />
      ) : (
        <div className="w-7 h-7" style={{ color: accent.text, opacity: 0.3 }}>
          {getMuscleIcon(bodyPart)}
        </div>
      )}
    </div>
  )
}
