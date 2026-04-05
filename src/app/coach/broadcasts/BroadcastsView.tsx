'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase';
import { BroadcastForm } from '@/components/coach/BroadcastForm';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { formatDistanceToNow, format } from 'date-fns';
import { nl } from 'date-fns/locale';
import { Send, Trash2, Users, Clock } from 'lucide-react';
import { sendPushToClient } from '@/lib/push-notifications';

export interface Client {
  id: string;
  full_name: string;
  avatar_url?: string;
  email?: string;
}

export interface Broadcast {
  id: string;
  title: string;
  message: string;
  sentAt: string;
  recipientCount: number;
}

interface BroadcastsViewProps {
  initialClients: Client[];
  initialBroadcasts: Broadcast[];
}

export default function BroadcastsView({ initialClients, initialBroadcasts }: BroadcastsViewProps) {
  const [clients] = useState<Client[]>(initialClients);
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>(initialBroadcasts);
  const [isSending, setIsSending] = useState(false);
  const supabase = createClient();

  const handleBroadcastSend = async (
    selectedClientIds: string[],
    title: string,
    message: string
  ) => {
    setIsSending(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        console.error('Gebruiker niet geauthenticeerd');
        return;
      }

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

      const bcId = broadcastData.id;
      selectedClientIds.forEach((clientId) => {
        sendPushToClient(clientId, title || 'MŌVE', message.substring(0, 100), `/client/notifications/${bcId}`);
      });

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
    } catch (error) {
      console.error('Fout bij verzenden van broadcast:', error);
    } finally {
      setIsSending(false);
    }
  };

  const handleDeleteBroadcast = async (broadcastId: string) => {
    if (!confirm('Weet je zeker dat je deze broadcast wilt verwijderen?')) return;

    try {
      const { error } = await supabase
        .from('broadcasts')
        .delete()
        .eq('id', broadcastId);

      if (error) {
        console.error('Fout bij verwijderen van broadcast:', error);
        return;
      }

      setBroadcasts((prev) => prev.filter((b) => b.id !== broadcastId));
    } catch (error) {
      console.error('Fout:', error);
    }
  };

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
