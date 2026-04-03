'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { createClient } from '@/lib/supabase'
import {
  Heart, MessageCircle, Send, Pin, Sparkles, HelpCircle,
  Trophy, Lightbulb, Megaphone, ChevronDown, X
} from 'lucide-react'

interface Author {
  id: string
  full_name: string
  avatar_url?: string
  role: string
}

interface Post {
  id: string
  content: string
  post_type: string
  image_url?: string
  is_pinned: boolean
  created_at: string
  author: Author
  like_count: number
  comment_count: number
  user_liked: boolean
}

interface Comment {
  id: string
  content: string
  created_at: string
  author: Author
}

const POST_TYPE_CONFIG: Record<string, { icon: any; label: string; color: string; bg: string }> = {
  update: { icon: Megaphone, label: 'Update', color: '#3068C4', bg: 'rgba(48,104,196,0.06)' },
  motivation: { icon: Sparkles, label: 'Motivatie', color: '#C47D15', bg: 'rgba(196,125,21,0.06)' },
  tip: { icon: Lightbulb, label: 'Tip', color: '#3D8B5C', bg: 'rgba(61,139,92,0.06)' },
  achievement: { icon: Trophy, label: 'Prestatie', color: '#1A1917', bg: '#F5F2EC' },
  question: { icon: HelpCircle, label: 'Vraag', color: '#AF52DE', bg: '#F5EEFA' },
}

interface Props {
  isCoach?: boolean
}

export function CommunityFeed({ isCoach = false }: Props) {
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [newPost, setNewPost] = useState('')
  const [postType, setPostType] = useState('update')
  const [posting, setPosting] = useState(false)
  const [expandedComments, setExpandedComments] = useState<string | null>(null)
  const [comments, setComments] = useState<Record<string, Comment[]>>({})
  const [newComment, setNewComment] = useState('')
  const [commentingPostId, setCommentingPostId] = useState<string | null>(null)

  useEffect(() => {
    loadPosts()
  }, [])

  async function loadPosts() {
    setLoading(true)
    const res = await fetch('/api/community')
    if (res.ok) {
      const data = await res.json()
      setPosts(data)
    }
    setLoading(false)
  }

  async function createPost() {
    if (!newPost.trim()) return
    setPosting(true)
    const res = await fetch('/api/community', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: newPost, post_type: postType }),
    })
    if (res.ok) {
      const post = await res.json()
      setPosts([post, ...posts])
      setNewPost('')
    }
    setPosting(false)
  }

  async function toggleLike(postId: string) {
    const res = await fetch('/api/community/like', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ post_id: postId }),
    })
    if (res.ok) {
      const { liked } = await res.json()
      setPosts(posts.map((p) =>
        p.id === postId
          ? { ...p, user_liked: liked, like_count: liked ? p.like_count + 1 : p.like_count - 1 }
          : p
      ))
    }
  }

  async function loadComments(postId: string) {
    if (expandedComments === postId) {
      setExpandedComments(null)
      return
    }
    setExpandedComments(postId)
    const res = await fetch(`/api/community/comments?post_id=${postId}`)
    if (res.ok) {
      const data = await res.json()
      setComments({ ...comments, [postId]: data })
    }
  }

  async function addComment(postId: string) {
    if (!newComment.trim()) return
    const res = await fetch('/api/community/comments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ post_id: postId, content: newComment }),
    })
    if (res.ok) {
      const comment = await res.json()
      setComments({
        ...comments,
        [postId]: [...(comments[postId] || []), comment],
      })
      setPosts(posts.map((p) =>
        p.id === postId ? { ...p, comment_count: p.comment_count + 1 } : p
      ))
      setNewComment('')
      setCommentingPostId(null)
    }
  }

  const getInitials = (name: string) => name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)

  const timeAgo = (date: string) => {
    const diff = Date.now() - new Date(date).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'Zojuist'
    if (mins < 60) return `${mins}m`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours}u`
    const days = Math.floor(hours / 24)
    if (days < 7) return `${days}d`
    return new Date(date).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })
  }

  return (
    <div className="space-y-4 animate-slide-up">
      {/* New Post */}
      <div
        className="rounded-2xl p-5 border"
        style={{ backgroundColor: 'white', borderColor: '#E8E4DC', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
      >
        <textarea
          value={newPost}
          onChange={(e) => setNewPost(e.target.value)}
          placeholder={isCoach ? 'Deel een update met je community...' : 'Deel iets met de groep...'}
          rows={2}
          className="w-full text-[14px] bg-transparent outline-none resize-none"
          style={{ color: '#1A1917' }}
        />
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-[#E8E4DC]">
          {/* Post type selector */}
          <div className="flex gap-1.5">
            {Object.entries(POST_TYPE_CONFIG).map(([key, cfg]) => {
              const Icon = cfg.icon
              return (
                <button
                  key={key}
                  onClick={() => setPostType(key)}
                  className="p-1.5 rounded-lg transition-all"
                  style={{
                    backgroundColor: postType === key ? cfg.bg : 'transparent',
                    color: postType === key ? cfg.color : '#C0C0C0',
                  }}
                  title={cfg.label}
                >
                  <Icon size={16} strokeWidth={1.5} />
                </button>
              )
            })}
          </div>

          <button
            onClick={createPost}
            disabled={posting || !newPost.trim()}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[13px] font-semibold text-white transition-all disabled:opacity-40"
            style={{ backgroundColor: '#1A1917' }}
          >
            <Send size={14} strokeWidth={2} />
            {posting ? 'Posten...' : 'Post'}
          </button>
        </div>
      </div>

      {/* Posts */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-white rounded-2xl animate-pulse border border-[#E8E4DC]" />
          ))}
        </div>
      ) : posts.length === 0 ? (
        <div
          className="rounded-2xl p-12 text-center border"
          style={{ backgroundColor: 'white', borderColor: '#E8E4DC' }}
        >
          <Megaphone size={32} strokeWidth={1.5} className="mx-auto mb-3" style={{ color: '#C0C0C0' }} />
          <p className="text-[14px]" style={{ color: '#ACACAC' }}>
            Nog geen berichten. Deel de eerste update!
          </p>
        </div>
      ) : (
        posts.map((post) => {
          const typeConfig = POST_TYPE_CONFIG[post.post_type] || POST_TYPE_CONFIG.update
          const TypeIcon = typeConfig.icon
          const isExpanded = expandedComments === post.id

          return (
            <div
              key={post.id}
              className="rounded-2xl border overflow-hidden hover:bg-[#FAFAF8] transition-colors"
              style={{ backgroundColor: 'white', borderColor: '#E8E4DC', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
            >
              {/* Pinned indicator */}
              {post.is_pinned && (
                <div className="flex items-center gap-1.5 px-5 pt-3 text-[11px] font-semibold" style={{ color: '#1A1917' }}>
                  <Pin size={10} strokeWidth={2} />
                  Vastgepind
                </div>
              )}

              <div className="p-5">
                {/* Author row */}
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-[11px] font-bold"
                    style={{
                      backgroundColor: post.author?.role === 'coach' ? '#F5F2EC' : '#FAFAFA',
                      color: post.author?.role === 'coach' ? '#1A1917' : '#ACACAC',
                    }}
                  >
                    {post.author?.avatar_url ? (
                      <Image src={post.author.avatar_url} alt="" width={32} height={32} className="w-8 h-8 rounded-full object-cover" unoptimized loading="lazy" />
                    ) : (
                      getInitials(post.author?.full_name || 'U')
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] font-semibold" style={{ color: '#1A1917' }}>
                        {post.author?.full_name}
                      </span>
                      {post.author?.role === 'coach' && (
                        <span className="px-1.5 py-0.5 rounded-md text-[9px] font-bold" style={{ backgroundColor: '#F5F2EC', color: '#1A1917' }}>
                          COACH
                        </span>
                      )}
                      <span
                        className="flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-semibold"
                        style={{ backgroundColor: typeConfig.bg, color: typeConfig.color }}
                      >
                        <TypeIcon size={8} strokeWidth={2} />
                        {typeConfig.label}
                      </span>
                    </div>
                    <p className="text-[11px]" style={{ color: '#C0C0C0' }}>
                      {timeAgo(post.created_at)}
                    </p>
                  </div>
                </div>

                {/* Content */}
                <p className="text-[14px] leading-relaxed whitespace-pre-wrap mb-4" style={{ color: '#1A1917' }}>
                  {post.content}
                </p>

                {post.image_url && (
                  <div className="rounded-xl overflow-hidden mb-4">
                    <Image src={post.image_url} alt="" width={400} height={300} className="w-full" unoptimized loading="lazy" />
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-4 pt-3 border-t border-[#E8E4DC]">
                  <button
                    onClick={() => toggleLike(post.id)}
                    className="flex items-center gap-1.5 text-[12px] font-medium transition-all"
                    style={{ color: post.user_liked ? '#C4372A' : '#ACACAC' }}
                  >
                    <Heart
                      size={16}
                      strokeWidth={1.5}
                      fill={post.user_liked ? '#C4372A' : 'none'}
                    />
                    {post.like_count > 0 && post.like_count}
                  </button>
                  <button
                    onClick={() => loadComments(post.id)}
                    className="flex items-center gap-1.5 text-[12px] font-medium transition-all"
                    style={{ color: isExpanded ? '#3068C4' : '#ACACAC' }}
                  >
                    <MessageCircle size={16} strokeWidth={1.5} />
                    {post.comment_count > 0 && post.comment_count}
                  </button>
                </div>
              </div>

              {/* Comments section */}
              {isExpanded && (
                <div className="border-t border-[#E8E4DC] bg-[#FAFAFA]">
                  {/* Existing comments */}
                  {(comments[post.id] || []).map((comment) => (
                    <div key={comment.id} className="px-5 py-3 border-b border-[#E8E4DC] last:border-b-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[12px] font-semibold" style={{ color: '#1A1917' }}>
                          {comment.author?.full_name}
                        </span>
                        {comment.author?.role === 'coach' && (
                          <span className="px-1 py-0.5 rounded text-[8px] font-bold" style={{ backgroundColor: '#F5F2EC', color: '#1A1917' }}>
                            COACH
                          </span>
                        )}
                        <span className="text-[10px]" style={{ color: '#C0C0C0' }}>
                          {timeAgo(comment.created_at)}
                        </span>
                      </div>
                      <p className="text-[13px]" style={{ color: '#1A1917' }}>{comment.content}</p>
                    </div>
                  ))}

                  {/* New comment input */}
                  <div className="px-5 py-3 flex items-center gap-2">
                    <input
                      type="text"
                      value={commentingPostId === post.id ? newComment : ''}
                      onFocus={() => setCommentingPostId(post.id)}
                      onChange={(e) => { setCommentingPostId(post.id); setNewComment(e.target.value) }}
                      onKeyDown={(e) => e.key === 'Enter' && addComment(post.id)}
                      placeholder="Schrijf een reactie..."
                      className="flex-1 text-[13px] bg-white px-3 py-2 rounded-xl border border-[#E8E4DC] outline-none focus:border-[#1A1917]"
                      style={{ color: '#1A1917' }}
                    />
                    <button
                      onClick={() => addComment(post.id)}
                      disabled={!newComment.trim() || commentingPostId !== post.id}
                      className="p-2 rounded-xl transition-all disabled:opacity-30"
                      style={{ backgroundColor: '#1A1917' }}
                    >
                      <Send size={14} strokeWidth={2} className="text-white" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        })
      )}
    </div>
  )
}
