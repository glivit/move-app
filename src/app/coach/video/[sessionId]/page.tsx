'use client';

import { use, useEffect, useState } from 'react';
import { VideoCallRoom } from '@/components/video/VideoCallRoom';
import { CallNotesForm } from '@/components/video/CallNotesForm';
import { Card } from '@/components/ui/Card';
import { AlertCircle } from 'lucide-react';

interface VideoSession {
  id: string;
  client_id: string;
  daily_room_url: string;
  scheduled_at: string;
  duration_minutes: number;
  status: string;
  notes: string | null;
}

interface SessionResponse {
  success: boolean;
  data?: VideoSession;
  error?: string;
}

interface PageProps {
  params: Promise<{ sessionId: string }>;
}

export default function CoachVideoPage({ params }: PageProps) {
  const { sessionId } = use(params);
  const [session, setSession] = useState<VideoSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [callEnded, setCallEnded] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);

  useEffect(() => {
    const fetchSession = async () => {
      try {
        const response = await fetch(`/api/video-sessions/${sessionId}`);
        const result: SessionResponse = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.error || 'Sessie niet gevonden');
        }

        if (!result.data) {
          throw new Error('Geen sessiegegevens ontvangen');
        }

        setSession(result.data);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Fout bij laden van sessie';
        setError(message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSession();
  }, [sessionId]);

  if (isLoading) {
    return (
      <div className="w-full h-screen bg-warm-offwhite flex items-center justify-center">
        <Card padding="md" className="w-full max-w-md">
          <div className="space-y-4">
            <div className="h-4 bg-[#989F99] rounded animate-pulse"></div>
            <div className="h-4 bg-[#989F99] rounded animate-pulse"></div>
            <div className="h-4 bg-[#989F99] rounded animate-pulse w-2/3"></div>
          </div>
        </Card>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="w-full h-screen bg-warm-offwhite flex items-center justify-center p-4">
        <Card padding="md" className="w-full max-w-md">
          <div className="flex items-start gap-4">
            <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-1" />
            <div>
              <h1 className="text-lg font-semibold text-text-primary mb-2">
                Fout bij laden van sessie
              </h1>
              <p className="text-sm text-text-secondary">
                {error || 'De videosessie kon niet worden geladen.'}
              </p>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  if (callEnded) {
    return (
      <div className="w-full min-h-screen bg-warm-offwhite p-4">
        <div className="max-w-2xl mx-auto">
          <CallNotesForm sessionId={sessionId} />
        </div>
      </div>
    );
  }

  return (
    <VideoCallRoom
      roomUrl={session.daily_room_url}
      durationMinutes={session.duration_minutes}
      sessionId={sessionId}
      onCallEnded={(elapsed) => {
        setElapsedTime(elapsed);
        setCallEnded(true);
      }}
    />
  );
}
