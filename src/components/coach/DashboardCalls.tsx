'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Clock, AlertCircle } from 'lucide-react';

interface VideoSession {
  id: string;
  client_id: string;
  daily_room_url: string;
  scheduled_at: string;
  duration_minutes: number;
  status: string;
}

interface ClientProfile {
  id: string;
  name: string;
}

interface SessionWithClient extends VideoSession {
  clientName: string;
}

export function DashboardCalls() {
  const [sessions, setSessions] = useState<SessionWithClient[]>([]);
  const [clientMap, setClientMap] = useState<Record<string, ClientProfile>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSessions = async () => {
      try {
        // Fetch upcoming sessions
        const response = await fetch('/api/video-sessions');
        const result = await response.json();

        if (!result.success) {
          throw new Error(result.error || 'Fout bij ophalen van sessies');
        }

        // Filter for upcoming sessions only
        const now = new Date();
        const allSessions: VideoSession[] = result.data || [];
        const upcoming = allSessions
          .filter((session) => {
            const sessionDate = new Date(session.scheduled_at);
            return sessionDate > now && session.status === 'scheduled';
          })
          .sort(
            (a, b) =>
              new Date(a.scheduled_at).getTime() -
              new Date(b.scheduled_at).getTime()
          )
          .slice(0, 3);

        // Fetch client details
        const clientIds = [...new Set(upcoming.map((s) => s.client_id))];
        const clients: Record<string, ClientProfile> = {};

        if (clientIds.length > 0) {
          for (const clientId of clientIds) {
            const clientResponse = await fetch(
              `/api/profiles/${clientId}`
            ).catch(() => null);
            if (clientResponse?.ok) {
              const clientData = await clientResponse.json();
              if (clientData.data) {
                clients[clientId] = {
                  id: clientData.data.id,
                  name: clientData.data.name || 'Onbekend',
                };
              }
            }
          }
        }

        setClientMap(clients);

        // Map sessions with client names
        const sessionsWithClients = upcoming.map((session) => ({
          ...session,
          clientName: clients[session.client_id]?.name || 'Onbekend',
        }));

        setSessions(sessionsWithClients);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Fout bij laden van gesprekken';
        setError(message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSessions();
    // Refresh every 5 minutes
    const interval = setInterval(fetchSessions, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  if (isLoading) {
    return (
      <Card padding="md">
        <div className="space-y-3">
          <div className="h-20 bg-[#989F99] rounded animate-pulse"></div>
          <div className="h-20 bg-[#989F99] rounded animate-pulse"></div>
          <div className="h-20 bg-[#989F99] rounded animate-pulse"></div>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card padding="md">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-medium text-text-primary">
              Fout bij laden van gesprekken
            </h3>
            <p className="text-sm text-text-secondary mt-1">{error}</p>
          </div>
        </div>
      </Card>
    );
  }

  if (sessions.length === 0) {
    return (
      <Card padding="md" className="text-center py-8">
        <Clock className="w-12 h-12 text-gray-400 mx-auto mb-3 opacity-50" />
        <p className="text-text-secondary">Geen geplande gesprekken</p>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {sessions.map((session) => {
        const scheduledDate = new Date(session.scheduled_at);
        const formattedDate = scheduledDate.toLocaleDateString('nl-NL', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
        });
        const formattedTime = scheduledDate.toLocaleTimeString('nl-NL', {
          hour: '2-digit',
          minute: '2-digit',
        });

        return (
          <Card key={session.id} padding="md">
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1">
                <h3 className="font-semibold text-text-primary">
                  {session.clientName}
                </h3>
                <div className="text-sm text-text-secondary mt-1">
                  <p>
                    {formattedDate} • {formattedTime}
                  </p>
                  <p className="mt-0.5">
                    {session.duration_minutes} minuten
                  </p>
                </div>
              </div>
              <Link
                href={`/coach/video/${session.id}`}
                className="flex-shrink-0"
              >
                <Button variant="primary" size="sm">
                  Starten
                </Button>
              </Link>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
