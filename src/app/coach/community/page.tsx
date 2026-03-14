'use client'

import { CommunityFeed } from '@/components/community/CommunityFeed'

export default function CoachCommunityPage() {
  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-display font-semibold text-text-primary tracking-tight mb-6">
        Community
      </h1>
      <CommunityFeed isCoach={true} />
    </div>
  )
}
