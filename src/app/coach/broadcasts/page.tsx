'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';
import { BroadcastForm } from '@/components/coach/BroadcastForm';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { formatDistanceToNow, format } from 'date-fns';
import { nl } from 'date-fns/locale';
import { Send, Trash2, Users, Clock } from 'lucide-react';
import { sendPushToClient } from '@/lib/push-notifications';

interface Client {
  id: string;
  full_name: string;
  avatar_url?: string;
  email?: string;
}

interface Broadcast {
  id: string;
  title: string;
  message: string;
  sentAt: string;
  recipientCount: number;
}

export default function BroadcastsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    const loadClientsAndBroadcasts = async () => {
      try {
        setIsLoading(true);

        // Load all clients
        const { data: clientsData, error: clientsError } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url, email')
          .eq('role', 'client')
          .order('full_name');

        if (clientsError) {
          console.error('Fout bij laden van clients:', clientsError);
        } else {
          setClients(clientsData || []);
        }

        // Load broadcast history
        const { data: broadcastsData, error: broadcastsError } = await supabase
          .from('broadcasts')
          .select('id, title, content, created_at, target_clients')
          .order('created_at', { ascending: false })
          .limit(20);

        if (broadcastsError) {
          console.error('Fout bij laden van broadcasts:', broadcastsError);
        } else {
          setBroadcasts(
            (broadcastsData || []).map((b: any) => ({
              id: b.id,
              title: b.title,
              message: b.content,
              sentAt: b.created_at,
              recipientCount: Array.isArray(b.target_clients) ? b.target_clients.length : 0,
            }))
          );
        }
      } catch (error) {
        console.error('Fout bij laden van gegevens:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadClientsAndBroadcasts();
  }, [supabase]);

  const handleBroadcastSend = async (
    selectedClientIds: string[],
    title: string,
    message: string
  ) => {
    setIsSending(true);

    try {
      // Get current user (coach)
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        console.error('Gebruiker niet geauthenticeerd');
        return;
      }

      // Create broadcast record
      const { data: broadcastData, error: broadcastError } = await supabase
        .from('broadcasts')
        .insert({
          title,
          content: message,
          target_clients: selectedClientIds,
          sent_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (broadcastError) {
        console.error('Fout bij aanmaken van broadcast:', broadcastError);
        return;
      }

      // Send push notification to each client (fire & forget)
      // Broadcasts are NOT chat messages — they show in /client/notifications
      selectedClientIds.forEach((clientId) => {
        sendPushToClient(clientId, title || 'MŌVE', message.substring(0, 100), '/client/notifications')
      });

      // Add to broadcasts list
      setBroadcasts([
        {
          id: broadcastData.id,
          title,
          message,
          sentAt: broadcastData.created_at || new Date().toISOString(),
          recipientCount: selectedClientIds.length,
        },
        ...broadcasts,
      ]);

      // Show success message
      console.log(`Broadcast verzonden naar ${selectedClientIds.length} klanten`);
    } catch (error) {
      console.error('Fout bij verzenden van broadcast:', error);
    } finally {
      setIsSending(false);
    }
  };

  const handleDeleteBroadcast = async (broadcastId: string) => {
    if (!confirm('Weet je zeker dat je deze broadcast wilt verwijderen?')) {
      return;
    }

    try {
      // Delete broadcast and its messages
      const { error } = await supabase
        .from('broadcasts')
        .delete()
        .eq('id', broadcastId);

      if (error) {
        console.error('Fout bij verwijderen van broadcast:', error);
        return;
      }

      // Update local state
      setBroadcasts((prev) => prev.filter((b) => b.id !== broadcastId));
    } catch (error) {
      console.error('Fout:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-client-bg">
        <div className="text-center">
          <div className="animate-pulse text-lg text-client-text-secondary">
            Laden...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-client-bg">
      {/* Header */}
      <div className="border-b border-client-border">
        <div className="max-w-6xl mx-auto px-6 py-12">
          <h1 className="text-[32px] font-display text-text-primary mb-2">
            Broadcasts
          </h1>
          <p className="text-[15px] text-client-text-secondary">
            Stuur berichten naar meerdere cliënten tegelijk
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Broadcast Form */}
        <Card className="p-8 bg-white border border-client-border rounded-2xl shadow-clean mb-8">
          <h2 className="text-[17px] font-display text-text-primary mb-6">
            Nieuwe broadcast
          </h2>
          <BroadcastForm
            clients={clients}
            onSend={handleBroadcastSend}
            isSending={isSending}
          />
        </Card>

        {/* Broadcast History */}
        <div>
          <h2 className="text-[17px] font-display text-text-primary mb-6">
            Verzendgeschiedenis
          </h2>

          {broadcasts.length === 0 ? (
            <Card className="p-12 text-center bg-white border border-client-border rounded-2xl shadow-clean">
              <div className="flex justify-center mb-4">
                <div className="p-4 rounded-2xl bg-accent-light">
                  <Send size={32} strokeWidth={1.5} className="text-accent-dark" />
                </div>
              </div>
              <p className="text-[15px] font-medium mb-2 text-client-text-secondary">
                Nog geen broadcasts verzonden
              </p>
              <p className="text-[13px] text-client-text-muted">
                Stuur je eerste broadcast met het formulier hierboven
              </p>
            </Card>
          ) : (
            <div className="space-y-4">
              {broadcasts.map((broadcast) => (
                <Card
                  key={broadcast.id}
                  className="p-6 bg-white border border-client-border rounded-2xl transition-all hover:shadow-clean"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-[15px] font-medium text-text-primary">
                          {broadcast.title}
                        </h3>
                      </div>
                      <p className="line-clamp-2 mb-4 text-[13px] text-client-text-secondary">
                        {broadcast.message}
                      </p>
                      <div className="flex items-center gap-4 flex-wrap text-[13px]">
                        <div className="flex items-center gap-2 text-client-text-secondary">
                          <Users size={16} strokeWidth={1.5} className="text-accent-dark" />
                          <span>
                            {broadcast.recipientCount} {broadcast.recipientCount === 1 ? 'cliënt' : 'cliënten'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-client-text-secondary">
                          <Clock size={16} strokeWidth={1.5} className="text-accent-dark" />
                          <span>
                            {formatDistanceToNow(
                              new Date(broadcast.sentAt),
                              {
                                addSuffix: true,
                                locale: nl,
                              }
                            )}
                          </span>
                        </div>
                        <span className="text-client-text-muted">
                          {format(new Date(broadcast.sentAt), 'd MMM HH:mm', {
                            locale: nl,
                          })}
                        </span>
                      </div>
                    </div>

                    <Button
                      onClick={() => handleDeleteBroadcast(broadcast.id)}
                      className="p-2 rounded-xl transition-all hover:shadow-md bg-client-surface-muted text-data-red border-0"
                      title="Verwijderen"
                    >
                      <Trash2 size={20} strokeWidth={1.5} />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
