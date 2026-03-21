import { createServerSupabaseClient } from '@/lib/supabase-server';
import { Card } from '@/components/ui/Card';
import { Eye, EyeOff, MessageSquare } from 'lucide-react';
import Link from 'next/link';

interface PromptResponse {
  id: string;
  client_id: string;
  prompt_id: string;
  response: string;
  mood_score: number | null;
  energy_score: number | null;
  sleep_score: number | null;
  coach_seen: boolean;
  created_at: string;
  profile: {
    full_name: string;
    avatar_url: string | null;
  };
  prompt: {
    question: string;
  };
}

function getScoreBadgeClass(score: number | null): string {
  if (score === null) return 'hidden';
  if (score <= 2) return 'bg-data-red/10 text-data-red';
  if (score === 3) return 'bg-data-orange/10 text-data-orange';
  return 'bg-data-green/10 text-data-green';
}

function ScoreBadge({ label, score }: { label: string; score: number | null }) {
  if (score === null) return null;

  return (
    <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[13px] font-medium ${getScoreBadgeClass(score)}`}>
      {label}: {score}/5
    </div>
  );
}

async function PromptResponsesServer() {
  const supabase = await createServerSupabaseClient();

  try {
    const { data: responses, error } = await supabase
      .from('prompt_responses')
      .select(
        `
        id,
        client_id,
        prompt_id,
        response,
        mood_score,
        energy_score,
        sleep_score,
        coach_seen,
        created_at,
        profile:profiles(full_name, avatar_url),
        prompt:prompts(question)
      `
      )
      .not('response', 'is', null)
      .neq('response', '')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching responses:', error);
      return (
        <div className="text-center py-12 text-client-text-secondary">
          Er is een fout opgetreden bij het laden van de responses
        </div>
      );
    }

    if (!responses || responses.length === 0) {
      return (
        <Card className="p-8 bg-white border border-client-border rounded-2xl shadow-clean text-center">
          <p className="text-text-primary mb-2 font-medium">
            Geen client responses beschikbaar
          </p>
          <p className="text-[13px] text-client-text-secondary">
            Client antwoorden verschijnen hier zodra ze hun reflectie vragen beantwoorden
          </p>
        </Card>
      );
    }

    // Normalize joined data (Supabase returns single-row joins as arrays)
    const normalized: PromptResponse[] = (responses || []).map((r: any) => ({
      ...r,
      profile: Array.isArray(r.profile) ? r.profile[0] : r.profile,
      prompt: Array.isArray(r.prompt) ? r.prompt[0] : r.prompt,
    }))

    return (
      <div className="space-y-4">
        {normalized.map((response) => (
          <Card key={response.id} className="p-6 bg-white border border-client-border rounded-2xl shadow-clean">
            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-[15px] font-medium text-text-primary">
                    {response.profile.full_name}
                  </h3>
                  <p className="text-[13px] mt-1 text-client-text-secondary">
                    {new Date(response.created_at).toLocaleDateString('nl-NL', {
                      weekday: 'short',
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
                <button
                  onClick={async () => {
                    const supabase = await createServerSupabaseClient();
                    await supabase
                      .from('prompt_responses')
                      .update({ coach_seen: !response.coach_seen })
                      .eq('id', response.id);
                  }}
                  className={`p-2 rounded-xl transition-colors ${
                    response.coach_seen
                      ? 'bg-accent-light text-accent-dark'
                      : 'bg-client-surface-muted text-client-text-muted'
                  }`}
                  title={response.coach_seen ? 'Markeer als ongelezen' : 'Markeer als gelezen'}
                >
                  {response.coach_seen ? (
                    <Eye size={20} strokeWidth={1.5} />
                  ) : (
                    <EyeOff size={20} strokeWidth={1.5} />
                  )}
                </button>
              </div>

              <div>
                <p className="font-medium mb-2 text-text-primary">
                  {response.prompt.question}
                </p>
                <p className="text-[13px] leading-relaxed text-client-text-secondary">
                  {response.response}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <ScoreBadge label="Stemming" score={response.mood_score} />
                <ScoreBadge label="Energie" score={response.energy_score} />
                <ScoreBadge label="Slaap" score={response.sleep_score} />
              </div>

              <div className="pt-4 border-t border-client-border">
                <Link
                  href={`/coach/messages?client=${response.client_id}`}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-text-primary text-white font-medium transition-all hover:shadow-clean"
                >
                  <MessageSquare size={16} strokeWidth={1.5} />
                  Beantwoord
                </Link>
              </div>
            </div>
          </Card>
        ))}
      </div>
    );
  } catch (error) {
    console.error('Unexpected error:', error);
    return (
      <div className="text-center py-12 text-client-text-secondary">
        Er is een onverwachte fout opgetreden
      </div>
    );
  }
}

export default async function CoachPromptResponsesPage() {
  return (
    <div className="min-h-screen bg-client-bg p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-[32px] font-display text-text-primary mb-8">
          Client Responses
        </h1>

        <PromptResponsesServer />
      </div>
    </div>
  );
}
