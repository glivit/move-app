'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import {
  Plus, Edit2, Trash2, X, Play, FileText, Image, Video,
  Star, Eye, Search
} from 'lucide-react'

const categoryColors: Record<string, { color: string; bg: string }> = {
  Voeding: { color: '#34C759', bg: '#E8FAF0' },
  Training: { color: '#007AFF', bg: '#EBF5FF' },
  Herstel: { color: '#AF52DE', bg: '#F5EEFA' },
  Mindset: { color: '#FF9500', bg: '#FFF3E0' },
  Lifestyle: { color: '#FF2D55', bg: '#FFE5EC' },
}

const contentTypeConfig: Record<string, { icon: any; label: string; color: string }> = {
  article: { icon: FileText, label: 'Artikel', color: '#007AFF' },
  video: { icon: Play, label: 'Video', color: '#FF3B30' },
  pdf: { icon: FileText, label: 'PDF', color: '#FF9500' },
  infographic: { icon: Image, label: 'Infographic', color: '#AF52DE' },
}

interface Resource {
  id: string
  title: string
  description: string
  category: string
  url?: string
  content: string
  content_type: string
  video_url?: string
  thumbnail_url?: string
  duration_minutes?: number
  is_featured: boolean
  tags: string[]
  view_count: number
  created_at: string
}

export default function ResourcesPage() {
  const [resources, setResources] = useState<Resource[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [filterType, setFilterType] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'Voeding',
    url: '',
    content: '',
    content_type: 'article',
    video_url: '',
    thumbnail_url: '',
    duration_minutes: 0,
    is_featured: false,
    tags: [] as string[],
  })

  const supabase = createClient()

  useEffect(() => {
    fetchResources()
  }, [])

  const fetchResources = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('resources')
      .select('*')
      .order('is_featured', { ascending: false })
      .order('created_at', { ascending: false })
    setResources(data || [])
    setLoading(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const payload = {
        ...formData,
        duration_minutes: formData.duration_minutes || null,
        video_url: formData.video_url || null,
        thumbnail_url: formData.thumbnail_url || null,
      }
      if (editingId) {
        await supabase.from('resources').update(payload).eq('id', editingId)
      } else {
        await supabase.from('resources').insert([payload])
      }
      resetForm()
      fetchResources()
    } catch (error) {
      console.error('Error saving resource:', error)
    }
  }

  const handleDelete = async (id: string) => {
    if (confirm('Weet je zeker dat je deze resource wilt verwijderen?')) {
      await supabase.from('resources').delete().eq('id', id)
      fetchResources()
    }
  }

  const handleEdit = (resource: Resource) => {
    setFormData({
      title: resource.title,
      description: resource.description,
      category: resource.category,
      url: resource.url || '',
      content: resource.content,
      content_type: resource.content_type || 'article',
      video_url: resource.video_url || '',
      thumbnail_url: resource.thumbnail_url || '',
      duration_minutes: resource.duration_minutes || 0,
      is_featured: resource.is_featured || false,
      tags: resource.tags || [],
    })
    setEditingId(resource.id)
    setShowForm(true)
  }

  const toggleFeatured = async (id: string, current: boolean) => {
    await supabase.from('resources').update({ is_featured: !current }).eq('id', id)
    fetchResources()
  }

  const resetForm = () => {
    setFormData({
      title: '', description: '', category: 'Voeding', url: '', content: '',
      content_type: 'article', video_url: '', thumbnail_url: '', duration_minutes: 0,
      is_featured: false, tags: [],
    })
    setShowForm(false)
    setEditingId(null)
  }

  const filteredResources = resources.filter((r) => {
    if (filterType !== 'all' && r.content_type !== filterType) return false
    if (searchQuery && !r.title.toLowerCase().includes(searchQuery.toLowerCase())) return false
    return true
  })

  const stats = {
    total: resources.length,
    articles: resources.filter((r) => r.content_type === 'article').length,
    videos: resources.filter((r) => r.content_type === 'video').length,
    featured: resources.filter((r) => r.is_featured).length,
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      {/* Header */}
      <div className="border-b border-[#E8E4DC]">
        <div className="max-w-6xl mx-auto px-6 py-12">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-[32px] font-display" style={{ color: '#1A1A18' }}>
                Kennisbank
              </h1>
              <p className="text-[15px] mt-1" style={{ color: '#8E8E93' }}>
                Beheer educatieve content en video&apos;s voor je cliënten
              </p>
            </div>
            <button
              onClick={() => { resetForm(); setShowForm(true) }}
              className="flex items-center gap-2 px-5 py-3 rounded-xl font-medium text-white transition-all hover:opacity-90"
              style={{ backgroundColor: '#1A1A18' }}
            >
              <Plus size={20} strokeWidth={1.5} />
              Nieuwe content
            </button>
          </div>

          {/* Stats */}
          <div className="flex gap-6 mt-6">
            <div className="text-center">
              <p className="text-[20px] font-bold" style={{ color: '#1A1A18' }}>{stats.total}</p>
              <p className="text-[11px]" style={{ color: '#8E8E93' }}>Totaal</p>
            </div>
            <div className="text-center">
              <p className="text-[20px] font-bold" style={{ color: '#007AFF' }}>{stats.articles}</p>
              <p className="text-[11px]" style={{ color: '#8E8E93' }}>Artikelen</p>
            </div>
            <div className="text-center">
              <p className="text-[20px] font-bold" style={{ color: '#FF3B30' }}>{stats.videos}</p>
              <p className="text-[11px]" style={{ color: '#8E8E93' }}>Video&apos;s</p>
            </div>
            <div className="text-center">
              <p className="text-[20px] font-bold" style={{ color: '#1A1917' }}>{stats.featured}</p>
              <p className="text-[11px]" style={{ color: '#8E8E93' }}>Uitgelicht</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Search & Filter */}
        <div className="flex items-center gap-3 mb-6">
          <div className="flex-1 flex items-center gap-2 px-4 py-2.5 bg-white rounded-xl border border-[#E8E4DC]">
            <Search size={16} strokeWidth={1.5} style={{ color: '#C7C7CC' }} />
            <input
              type="text"
              placeholder="Zoek content..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 bg-transparent text-[13px] outline-none"
              style={{ color: '#1A1A18' }}
            />
          </div>
          <div className="flex gap-1 p-1 bg-[#E8E4DC] rounded-xl">
            {[
              { key: 'all', label: 'Alles' },
              { key: 'article', label: 'Artikelen' },
              { key: 'video', label: "Video's" },
              { key: 'pdf', label: 'PDF' },
            ].map((opt) => (
              <button
                key={opt.key}
                onClick={() => setFilterType(opt.key)}
                className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all ${
                  filterType === opt.key ? 'bg-white text-[#1A1A18] shadow-sm' : 'text-[#8E8E93]'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Form */}
        {showForm && (
          <div
            className="mb-8 p-8 rounded-2xl border"
            style={{ backgroundColor: 'white', borderColor: '#E8E4DC', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-[17px] font-display" style={{ color: '#1A1A18' }}>
                {editingId ? 'Content bewerken' : 'Nieuwe content'}
              </h2>
              <button onClick={resetForm} className="p-2 hover:bg-[#FAFAFA] rounded-xl">
                <X size={20} strokeWidth={1.5} style={{ color: '#8E8E93' }} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Content type selector */}
              <div>
                <label className="text-[12px] font-medium" style={{ color: '#8E8E93' }}>Type</label>
                <div className="grid grid-cols-4 gap-2 mt-1.5">
                  {Object.entries(contentTypeConfig).map(([key, cfg]) => {
                    const Icon = cfg.icon
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setFormData({ ...formData, content_type: key })}
                        className="flex items-center gap-2 py-2.5 px-3 rounded-xl border text-[12px] font-semibold transition-all"
                        style={{
                          borderColor: formData.content_type === key ? cfg.color : '#E8E4DC',
                          color: formData.content_type === key ? cfg.color : '#8E8E93',
                          backgroundColor: formData.content_type === key ? `${cfg.color}10` : 'white',
                        }}
                      >
                        <Icon size={14} strokeWidth={1.5} />
                        {cfg.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[12px] font-medium" style={{ color: '#8E8E93' }}>Titel</label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full mt-1 px-4 py-2.5 rounded-xl border text-[13px] focus:outline-none focus:border-[#1A1917]"
                    style={{ borderColor: '#E8E4DC', color: '#1A1A18' }}
                  />
                </div>
                <div>
                  <label className="text-[12px] font-medium" style={{ color: '#8E8E93' }}>Categorie</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full mt-1 px-4 py-2.5 rounded-xl border text-[13px] focus:outline-none focus:border-[#1A1917]"
                    style={{ borderColor: '#E8E4DC', color: '#1A1A18' }}
                  >
                    {Object.keys(categoryColors).map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[12px] font-medium" style={{ color: '#8E8E93' }}>Beschrijving</label>
                <textarea
                  required
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={2}
                  className="w-full mt-1 px-4 py-2.5 rounded-xl border text-[13px] focus:outline-none focus:border-[#1A1917] resize-none"
                  style={{ borderColor: '#E8E4DC', color: '#1A1A18' }}
                />
              </div>

              {/* Video-specific fields */}
              {(formData.content_type === 'video') && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[12px] font-medium" style={{ color: '#8E8E93' }}>
                      Video URL (YouTube/Vimeo)
                    </label>
                    <input
                      type="url"
                      value={formData.video_url}
                      onChange={(e) => setFormData({ ...formData, video_url: e.target.value })}
                      placeholder="https://youtube.com/watch?v=..."
                      className="w-full mt-1 px-4 py-2.5 rounded-xl border text-[13px] focus:outline-none focus:border-[#1A1917]"
                      style={{ borderColor: '#E8E4DC', color: '#1A1A18' }}
                    />
                  </div>
                  <div>
                    <label className="text-[12px] font-medium" style={{ color: '#8E8E93' }}>
                      Duur (minuten)
                    </label>
                    <input
                      type="number"
                      value={formData.duration_minutes || ''}
                      onChange={(e) => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) || 0 })}
                      className="w-full mt-1 px-4 py-2.5 rounded-xl border text-[13px] focus:outline-none focus:border-[#1A1917]"
                      style={{ borderColor: '#E8E4DC', color: '#1A1A18' }}
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[12px] font-medium" style={{ color: '#8E8E93' }}>Externe link (optioneel)</label>
                  <input
                    type="url"
                    value={formData.url}
                    onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                    className="w-full mt-1 px-4 py-2.5 rounded-xl border text-[13px] focus:outline-none focus:border-[#1A1917]"
                    style={{ borderColor: '#E8E4DC', color: '#1A1A18' }}
                  />
                </div>
                <div>
                  <label className="text-[12px] font-medium" style={{ color: '#8E8E93' }}>Thumbnail URL (optioneel)</label>
                  <input
                    type="url"
                    value={formData.thumbnail_url}
                    onChange={(e) => setFormData({ ...formData, thumbnail_url: e.target.value })}
                    className="w-full mt-1 px-4 py-2.5 rounded-xl border text-[13px] focus:outline-none focus:border-[#1A1917]"
                    style={{ borderColor: '#E8E4DC', color: '#1A1A18' }}
                  />
                </div>
              </div>

              <div>
                <label className="text-[12px] font-medium" style={{ color: '#8E8E93' }}>Inhoud</label>
                <textarea
                  required
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  rows={5}
                  className="w-full mt-1 px-4 py-2.5 rounded-xl border text-[13px] focus:outline-none focus:border-[#1A1917] resize-none"
                  style={{ borderColor: '#E8E4DC', color: '#1A1A18' }}
                />
              </div>

              {/* Featured toggle */}
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_featured}
                  onChange={(e) => setFormData({ ...formData, is_featured: e.target.checked })}
                  className="w-4 h-4 rounded accent-[#1A1917]"
                />
                <span className="text-[13px] font-medium" style={{ color: '#1A1A18' }}>
                  Uitgelicht (bovenaan voor cliënten)
                </span>
              </label>

              <div className="flex gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-5 py-2.5 rounded-xl text-[13px] font-medium border transition-all"
                  style={{ borderColor: '#E8E4DC', color: '#1A1A18' }}
                >
                  Annuleren
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl text-[13px] font-semibold text-white transition-all hover:opacity-90"
                  style={{ backgroundColor: '#1A1917' }}
                >
                  {editingId ? 'Opslaan' : 'Publiceren'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Resources Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-48 bg-white rounded-2xl animate-pulse border border-[#E8E4DC]" />
            ))}
          </div>
        ) : filteredResources.length === 0 ? (
          <div
            className="p-12 text-center rounded-2xl border"
            style={{ backgroundColor: 'white', borderColor: '#E8E4DC' }}
          >
            <FileText size={40} strokeWidth={1.5} className="mx-auto mb-3" style={{ color: '#C7C7CC' }} />
            <p className="text-[15px]" style={{ color: '#8E8E93' }}>
              {searchQuery || filterType !== 'all' ? 'Geen resultaten gevonden' : 'Nog geen content. Maak je eerste resource aan!'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredResources.map((resource) => {
              const catColor = categoryColors[resource.category] || { color: '#1A1917', bg: '#F5F2EC' }
              const typeConfig = contentTypeConfig[resource.content_type] || contentTypeConfig.article
              const TypeIcon = typeConfig.icon

              return (
                <div
                  key={resource.id}
                  className="rounded-2xl border overflow-hidden group"
                  style={{ backgroundColor: 'white', borderColor: '#E8E4DC', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
                >
                  {/* Thumbnail / Type indicator */}
                  {resource.thumbnail_url ? (
                    <div className="relative aspect-video bg-[#E8E4DC] overflow-hidden">
                      <img src={resource.thumbnail_url} alt="" className="w-full h-full object-cover" />
                      {resource.content_type === 'video' && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                          <div className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center">
                            <Play size={18} strokeWidth={2} style={{ color: '#FF3B30' }} />
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="h-2" style={{ backgroundColor: catColor.color }} />
                  )}

                  <div className="p-5">
                    {/* Meta row */}
                    <div className="flex items-center gap-2 mb-2">
                      <span
                        className="px-2 py-0.5 rounded-md text-[10px] font-semibold"
                        style={{ backgroundColor: catColor.bg, color: catColor.color }}
                      >
                        {resource.category}
                      </span>
                      <span
                        className="flex items-center gap-1 text-[10px] font-medium"
                        style={{ color: typeConfig.color }}
                      >
                        <TypeIcon size={10} strokeWidth={2} />
                        {typeConfig.label}
                      </span>
                      {resource.is_featured && (
                        <Star size={10} strokeWidth={2} style={{ color: '#1A1917' }} fill="#1A1917" />
                      )}
                      {resource.duration_minutes ? (
                        <span className="text-[10px]" style={{ color: '#C7C7CC' }}>
                          {resource.duration_minutes} min
                        </span>
                      ) : null}
                    </div>

                    {/* Title */}
                    <h3 className="text-[14px] font-semibold mb-1 line-clamp-2" style={{ color: '#1A1A18' }}>
                      {resource.title}
                    </h3>
                    <p className="text-[12px] line-clamp-2 mb-3" style={{ color: '#8E8E93' }}>
                      {resource.description}
                    </p>

                    {/* Actions */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1 text-[11px]" style={{ color: '#C7C7CC' }}>
                        <Eye size={12} strokeWidth={1.5} />
                        {resource.view_count || 0}
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => toggleFeatured(resource.id, resource.is_featured)}
                          className="p-1.5 rounded-lg hover:bg-[#FAFAFA] transition-all"
                          title={resource.is_featured ? 'Verwijder uitgelicht' : 'Maak uitgelicht'}
                        >
                          <Star size={14} strokeWidth={1.5}
                            style={{ color: resource.is_featured ? '#1A1917' : '#C7C7CC' }}
                            fill={resource.is_featured ? '#1A1917' : 'none'}
                          />
                        </button>
                        <button
                          onClick={() => handleEdit(resource)}
                          className="p-1.5 rounded-lg hover:bg-[#FAFAFA] transition-all"
                        >
                          <Edit2 size={14} strokeWidth={1.5} style={{ color: '#1A1917' }} />
                        </button>
                        <button
                          onClick={() => handleDelete(resource.id)}
                          className="p-1.5 rounded-lg hover:bg-[#FFE5E5] transition-all"
                        >
                          <Trash2 size={14} strokeWidth={1.5} style={{ color: '#FF3B30' }} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
