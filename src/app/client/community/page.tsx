import { CommunityFeed } from '@/components/community/CommunityFeed'

export default function ClientCommunityPage() {
  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-editorial-h2 text-[#FDFDFE] mb-6 animate-slide-up">
        Community
      </h1>
      <div className="animate-slide-up stagger-2">
        <CommunityFeed isCoach={false} />
      </div>
    </div>
  )
}
