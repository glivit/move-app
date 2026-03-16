'use client'

import { CommunityFeed } from '@/components/community/CommunityFeed'

export default function ClientCommunityPage() {
  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-editorial-h2 text-[#1A1917] mb-6">
        Community
      </h1>
      <CommunityFeed isCoach={false} />
    </div>
  )
}
