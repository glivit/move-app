'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { createClient } from '@/lib/supabase'
import { Search, BookOpen, ChevronRight, Play, Clock, Star, X } from 'lucide-react'

interface Resource {
  id: string
  title: string
  description: string
  content: string
  category: string
  url?: string
  content_type: string
  video_url?: string
  thumbnail_url?: string
  duration_minutes?: number
  is_featured: boolean
  created_at: string
}

const CATEGORY_COLORS: Record<string, string> = {
  Voeding: '#2FA65A',
  Training: '#3068C4',
  Herstel: '#C0FC01',
  Mindset: '#AF52DE',
  Lifestyle: '#B55A4A',
}

const CATEGORY_BG: Record<string, string> = {
  Voeding: 'rgba(61,139,92,0.06)',
  Training: 'rgba(48,104,196,0.06)',
  Herstel: 'rgba(196,125,21,0.06)',
  Mindset: '#F5EEFA',
  Lifestyle: '#FFE5EC',
}

function getYouTubeEmbedUrl(url: string): string | null {
  try {
    const u = new URL(url)
    if (u.hostname.includes('youtube.com')) {
      const v = u.searchParams.get('v')
      return v ? `https://www.youtube.com/embed/${v}` : null
    }
    if (u.hostname.includes('youtu.be')) {
      return `https://www.youtube.com/embed${u.pathname}`
    }
    if (u.hostname.includes('vimeo.com')) {
      const id = u.pathname.split('/').pop()
      return id ? `https://player.vimeo.com/video/${id}` : null
    }
    return url
  } catch {
    return url
  }
}

export default function ResourcesPage() {
  const supabase = createClient()
  const [resources, setResources] = useState<Resource[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('Alles')
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null)

  const categories = ['Alles', 'Voeding', 'Training', 'Herstel', 'Mindset', 'Lifestyle']

  useEffect(() => {
    loadResources()
  }, [])

  const loadResources = async () => {
    try {
      setLoading(true)
      const { data } = await supabase
        .from('resources')
        .select('*')
        .order('is_featured', { ascending: false })
        .order('created_at', { ascending: false })
      setResources(data || [])
    } finally {
      setLoading(false)
    }
  }

  const trackView = async (resourceId: string) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('resource_views').upsert({
      user_id: user.id,
      resource_id: resourceId,
      viewed_at: new Date().toISOString(),
    }, { onConflict: 'user_id,resource_id' })
  }

  const filteredResources = resources.filter((r) => {
    if (selectedCategory !== 'Alles' && r.category !== selectedCategory) return false
    if (searchQuery && !r.title.toLowerCase().includes(searchQuery.toLowerCase())) return false
    return true
  })

  const featured = filteredResources.filter((r) => r.is_featured)
  const regular = filteredResources.filter((r) => !r.is_featured)

  return (
    <div className="space-y-6">
      {/* Hero Section */}
      <div className="animate-slide-up">
        <p className="text-label mb-3">Kennisbank</p>
        <h1 className="page-title-sm">Resources</h1>
      </div>

      {/* Search */}
      <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-white dark:bg-[#1C1E18] animate-slide-up stagger-2">
        <Search size={18} strokeWidth={1.5} style={{ color: 'rgba(28,30,24,0.60)' }} />
        <input
          type="text"
          placeholder="Zoek content..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1 bg-transparent text-[14px] outline-none"
          style={{ color: '#1C1E18' }}
        />
      </div>

      {/* Category Pills */}
      <div className="overflow-x-auto pb-1 -mx-4 px-4 animate-slide-up stagger-3">
        <div className="flex gap-2">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className="px-4 py-2 rounded-xl text-[13px] font-semibold uppercase tracking-[0.12em] whitespace-nowrap transition-all border"
              style={{
                backgroundColor: selectedCategory === cat ? '#1C1E18' : 'white',
                color: selectedCategory === cat ? 'white' : 'rgba(253,253,254,0.55)',
                borderColor: selectedCategory === cat ? '#1C1E18' : 'rgba(28,30,24,0.10)',
              }}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="space-y-3 animate-slide-up stagger-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-white dark:bg-[#1C1E18] rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : filteredResources.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-[#1C1E18] rounded-2xl animate-slide-up stagger-6">
          <BookOpen size={40} strokeWidth={1.5} className="mx-auto mb-3" style={{ color: 'rgba(28,30,24,0.60)' }} />
          <p className="text-[14px]" style={{ color: 'rgba(253,253,254,0.55)' }}>Geen content gevonden</p>
        </div>
      ) : (
        <>
          {/* Featured */}
          {featured.length > 0 && (
            <div className="space-y-3 animate-slide-up stagger-6">
              {featured.map((resource) => (
                <button
                  key={resource.id}
                  onClick={() => { setSelectedResource(resource); trackView(resource.id) }}
                  className="w-full text-left overflow-hidden transition-all bg-white dark:bg-[#1C1E18] rounded-2xl hover:bg-[rgba(28,30,24,0.12)] dark:bg-[#232320]"
                >
                  {resource.thumbnail_url ? (
                    <div className="relative aspect-[21/9] overflow-hidden">
                      <Image src={resource.thumbnail_url} alt="" width={400} height={171} className="w-full h-full object-cover" unoptimized loading="lazy" />
                      {resource.content_type === 'video' && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                          <div className="w-12 h-12 rounded-full bg-white dark:bg-[#1C1E18]/90 flex items-center justify-center">
                            <Play size={20} strokeWidth={2} style={{ color: '#B55A4A' }} fill="#B55A4A" />
                          </div>
                        </div>
                      )}
                      <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/40 backdrop-blur-sm">
                        <Star size={10} strokeWidth={2} style={{ color: '#FFD60A' }} fill="#FFD60A" />
                        <span className="text-[11px] font-semibold text-white">Uitgelicht</span>
                      </div>
                    </div>
                  ) : (
                    <div className="h-2" style={{ backgroundColor: CATEGORY_COLORS[resource.category] || '#1C1E18' }} />
                  )}
                  <div className="p-5">
                    <div className="flex items-center gap-2 mb-2">
                      <span
                        className="px-2 py-0.5 rounded-md text-[11px] font-semibold"
                        style={{
                          backgroundColor: CATEGORY_BG[resource.category] || 'rgba(28,30,24,0.10)',
                          color: CATEGORY_COLORS[resource.category] || '#1C1E18',
                        }}
                      >
                        {resource.category}
                      </span>
                      {resource.duration_minutes ? (
                        <span className="flex items-center gap-1 text-[11px]" style={{ color: 'rgba(28,30,24,0.60)' }}>
                          <Clock size={10} strokeWidth={1.5} />
                          {resource.duration_minutes} min
                        </span>
                      ) : null}
                    </div>
                    <h3 className="text-[16px] font-semibold mb-1" style={{ color: '#1C1E18' }}>
                      {resource.title}
                    </h3>
                    <p className="text-[13px] line-clamp-2" style={{ color: 'rgba(253,253,254,0.55)' }}>
                      {resource.description}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Regular */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 animate-slide-up stagger-7">
            {regular.map((resource) => (
              <button
                key={resource.id}
                onClick={() => { setSelectedResource(resource); trackView(resource.id) }}
                className="w-full text-left overflow-hidden transition-all bg-white dark:bg-[#1C1E18] rounded-2xl hover:bg-[rgba(28,30,24,0.12)] dark:bg-[#232320]"
              >
                {resource.thumbnail_url ? (
                  <div className="relative aspect-video overflow-hidden">
                    <Image src={resource.thumbnail_url} alt="" width={400} height={225} className="w-full h-full object-cover" unoptimized loading="lazy" />
                    {resource.content_type === 'video' && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                        <div className="w-10 h-10 rounded-full bg-white dark:bg-[#1C1E18]/90 flex items-center justify-center">
                          <Play size={16} strokeWidth={2} style={{ color: '#B55A4A' }} fill="#B55A4A" />
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="h-1.5" style={{ backgroundColor: CATEGORY_COLORS[resource.category] || '#1C1E18' }} />
                )}
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span
                      className="px-2 py-0.5 rounded-md text-[10px] font-semibold"
                      style={{
                        backgroundColor: CATEGORY_BG[resource.category] || 'rgba(28,30,24,0.10)',
                        color: CATEGORY_COLORS[resource.category] || '#1C1E18',
                      }}
                    >
                      {resource.category}
                    </span>
                    {resource.content_type === 'video' && (
                      <Play size={10} strokeWidth={2} style={{ color: '#B55A4A' }} />
                    )}
                  </div>
                  <h3 className="text-[14px] font-semibold line-clamp-2" style={{ color: '#1C1E18' }}>
                    {resource.title}
                  </h3>
                </div>
              </button>
            ))}
          </div>
        </>
      )}

      {/* Resource Detail Modal */}
      {selectedResource && (
        <div className="fixed inset-0 z-50 flex items-end lg:items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSelectedResource(null)} />
          <div className="relative w-full max-w-2xl mx-4 mb-4 lg:mb-0 max-h-[85vh] overflow-y-auto bg-white dark:bg-[#1C1E18] rounded-2xl">
            <button
              onClick={() => setSelectedResource(null)}
              className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full flex items-center justify-center bg-black/20 backdrop-blur-sm"
            >
              <X size={16} strokeWidth={2} className="text-white" />
            </button>

            {selectedResource.content_type === 'video' && selectedResource.video_url && (
              <div className="aspect-video bg-black overflow-hidden">
                <iframe
                  src={getYouTubeEmbedUrl(selectedResource.video_url) || selectedResource.video_url}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            )}

            {selectedResource.content_type !== 'video' && selectedResource.thumbnail_url && (
              <div className="aspect-[21/9] overflow-hidden">
                <Image src={selectedResource.thumbnail_url} alt="" width={400} height={171} className="w-full h-full object-cover" unoptimized loading="lazy" />
              </div>
            )}

            <div className="p-6">
              <div className="flex items-center gap-2 mb-3">
                <span
                  className="px-2.5 py-1 rounded-lg text-[11px] font-semibold"
                  style={{
                    backgroundColor: CATEGORY_BG[selectedResource.category] || 'rgba(28,30,24,0.10)',
                    color: CATEGORY_COLORS[selectedResource.category] || '#1C1E18',
                  }}
                >
                  {selectedResource.category}
                </span>
                {selectedResource.duration_minutes ? (
                  <span className="flex items-center gap-1 text-[11px]" style={{ color: 'rgba(253,253,254,0.55)' }}>
                    <Clock size={10} strokeWidth={1.5} />
                    {selectedResource.duration_minutes} min
                  </span>
                ) : null}
              </div>

              <h2 className="text-xl font-bold mb-2" style={{ color: '#1C1E18' }}>
                {selectedResource.title}
              </h2>
              <p className="text-[14px] mb-4" style={{ color: 'rgba(253,253,254,0.55)' }}>
                {selectedResource.description}
              </p>

              <div className="text-[14px] leading-relaxed whitespace-pre-wrap" style={{ color: '#1C1E18' }}>
                {selectedResource.content}
              </div>

              {selectedResource.url && (
                <a
                  href={selectedResource.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 mt-4 px-4 py-2.5 rounded-xl text-[13px] font-semibold uppercase tracking-[0.12em] transition-all border"
                  style={{ backgroundColor: 'white', color: '#1C1E18', borderColor: 'rgba(28,30,24,0.10)' }}
                >
                  Bekijk externe link
                  <ChevronRight size={14} strokeWidth={2} />
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
