'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { ChevronLeft, Camera, Loader2, Check } from 'lucide-react'

export default function EditProfilePage() {
  const router = useRouter()
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/'); return }

      setEmail(user.email || '')

      const { data } = await supabase
        .from('profiles')
        .select('full_name, phone, avatar_url')
        .eq('id', user.id)
        .single()

      if (data) {
        setFullName(data.full_name || '')
        setPhone(data.phone || '')
        setAvatarUrl(data.avatar_url)
      }
      setLoading(false)
    }
    load()
  }, [supabase, router])

  const handleSave = async () => {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase
      .from('profiles')
      .update({ full_name: fullName, phone: phone || null })
      .eq('id', user.id)

    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-6 h-6 animate-spin text-[#8B6914]" />
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="p-2 -ml-2 text-[#8B6914]">
          <ChevronLeft strokeWidth={1.5} className="w-5 h-5" />
        </button>
        <h1 className="text-[22px] font-semibold text-[#1A1A18]" style={{ fontFamily: 'var(--font-display)' }}>
          Persoonlijke gegevens
        </h1>
      </div>

      {/* Avatar */}
      <div className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[#F0F0ED] p-6 flex flex-col items-center">
        <div className="relative mb-4">
          <div className="w-24 h-24 rounded-full bg-[#8B6914] text-white flex items-center justify-center text-3xl font-semibold overflow-hidden">
            {avatarUrl ? (
              <img src={avatarUrl} alt={fullName} className="w-full h-full object-cover" />
            ) : (
              fullName ? fullName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : '?'
            )}
          </div>
          <div className="absolute bottom-0 right-0 w-8 h-8 bg-white rounded-full shadow-md flex items-center justify-center border border-[#F0F0ED]">
            <Camera strokeWidth={1.5} className="w-4 h-4 text-[#8E8E93]" />
          </div>
        </div>
        <p className="text-[13px] text-[#8E8E93]">Tik om foto te wijzigen</p>
      </div>

      {/* Form */}
      <div className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[#F0F0ED] divide-y divide-[#F0F0ED]">
        <div className="px-5 py-4">
          <label className="block text-[11px] font-medium text-[#8E8E93] uppercase tracking-wide mb-1">Volledige naam</label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full text-[15px] text-[#1A1A18] bg-transparent focus:outline-none"
          />
        </div>
        <div className="px-5 py-4">
          <label className="block text-[11px] font-medium text-[#8E8E93] uppercase tracking-wide mb-1">E-mail</label>
          <input
            type="email"
            value={email}
            disabled
            className="w-full text-[15px] text-[#8E8E93] bg-transparent cursor-not-allowed"
          />
        </div>
        <div className="px-5 py-4">
          <label className="block text-[11px] font-medium text-[#8E8E93] uppercase tracking-wide mb-1">Telefoon</label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+32 ..."
            className="w-full text-[15px] text-[#1A1A18] bg-transparent placeholder:text-[#C7C7CC] focus:outline-none"
          />
        </div>
      </div>

      {/* Save Button */}
      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full py-3.5 rounded-2xl bg-[#8B6914] text-white font-semibold text-[15px] hover:bg-[#7A5C12] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {saving ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : saved ? (
          <>
            <Check strokeWidth={2} className="w-5 h-5" />
            Opgeslagen
          </>
        ) : (
          'Opslaan'
        )}
      </button>
    </div>
  )
}
