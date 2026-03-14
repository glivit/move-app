'use client'

import { useRef, useState } from 'react'
import { Camera, X } from 'lucide-react'

interface Props {
  photos: { front: File | null; back: File | null; left: File | null; right: File | null }
  onChange: (photos: Props['photos']) => void
}

const positions = [
  { key: 'front' as const, label: 'Voorkant' },
  { key: 'back' as const, label: 'Achterkant' },
  { key: 'left' as const, label: 'Linkerkant' },
  { key: 'right' as const, label: 'Rechterkant' },
]

export function PhotoUploadStep({ photos, onChange }: Props) {
  const [previews, setPreviews] = useState<Record<string, string>>({})
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({})

  const handleFileChange = (position: keyof typeof photos, file: File | null) => {
    onChange({ ...photos, [position]: file })
    if (file) {
      const url = URL.createObjectURL(file)
      setPreviews(prev => ({ ...prev, [position]: url }))
    } else {
      setPreviews(prev => {
        const next = { ...prev }
        delete next[position]
        return next
      })
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-display font-semibold text-lg">Foto's</h3>
        <p className="text-sm text-text-secondary mt-1">
          Nuchter, zelfde ondergoed, zelfde locatie, ochtend
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {positions.map(({ key, label }) => (
          <div key={key} className="relative">
            <input
              ref={el => { inputRefs.current[key] = el }}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => handleFileChange(key, e.target.files?.[0] || null)}
            />

            {previews[key] ? (
              <div className="relative aspect-[3/4] rounded-lg overflow-hidden bg-surface-muted">
                <img src={previews[key]} alt={label} className="w-full h-full object-cover" />
                <button
                  onClick={() => handleFileChange(key, null)}
                  className="absolute top-2 right-2 w-7 h-7 bg-bg-dark/60 rounded-full flex items-center justify-center text-white"
                >
                  <X className="h-4 w-4" />
                </button>
                <span className="absolute bottom-2 left-2 text-xs font-medium text-white bg-bg-dark/60 px-2 py-0.5 rounded">
                  {label}
                </span>
              </div>
            ) : (
              <button
                onClick={() => inputRefs.current[key]?.click()}
                className="aspect-[3/4] w-full rounded-lg border-2 border-dashed border-border hover:border-accent/40 flex flex-col items-center justify-center gap-2 transition-colors bg-surface-muted/50"
              >
                <Camera className="h-6 w-6 text-text-muted" />
                <span className="text-xs font-medium text-text-muted">{label}</span>
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
