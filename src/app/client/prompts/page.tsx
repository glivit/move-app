'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';
import { ChevronDown, ChevronUp, Check, MessageSquare } from 'lucide-react';

interface PromptResponse {
  id: string;
  prompt_id: string;
  prompt: {
    question: string;
  };
  response: string | null;
  mood_score: number | null;
  energy_score: number | null;
  sleep_score: number | null;
  created_at: string;
}

interface SubmittedResponse extends PromptResponse {
  is_submitted: boolean;
}

function PromptCardSkeleton() {
  return (
    <div
      className="rounded-2xl p-6 shadow-clean animate-shimmer"
      style={{ backgroundColor: '#FFFFFF' }}
    >
      <div className="h-6 w-3/4 bg-gray-200 rounded animate-shimmer mb-4" />
      <div className="space-y-3 mb-6">
        <div className="h-20 w-full bg-gray-200 rounded animate-shimmer" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div className="h-20 bg-gray-200 rounded animate-shimmer" />
        <div className="h-20 bg-gray-200 rounded animate-shimmer" />
        <div className="h-20 bg-gray-200 rounded animate-shimmer" />
      </div>
    </div>
  );
}

function ScoreSelector({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number | null;
  onChange: (value: number) => void;
}) {
  return (
    <div>
      <label
        className="block text-[13px] font-medium mb-2.5"
        style={{ color: '#1A1A18' }}
      >
        {label}
      </label>
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map((score) => (
          <button
            key={score}
            onClick={() => onChange(score)}
            className="w-10 h-10 rounded-lg font-medium text-sm transition-all border border-transparent"
            style={{
              backgroundColor: value === score ? '#1A1917' : '#FFFFFF',
              color: value === score ? '#FFFFFF' : '#8E8E93',
              borderColor: value === score ? '#1A1917' : '#E5E5E5',
            }}
          >
            {score}
          </button>
        ))}
      </div>
    </div>
  );
}

function PromptCard({
  promptResponseId,
  question,
  currentResponse,
  onSubmit,
}: {
  promptResponseId: string;
  question: string;
  currentResponse: {
    response: string;
    mood_score: number | null;
    energy_score: number | null;
    sleep_score: number | null;
  };
  onSubmit: (
    promptResponseId: string,
    response: string,
    moodScore: number | null,
    energyScore: number | null,
    sleepScore: number | null
  ) => void;
}) {
  const [response, setResponse] = useState(currentResponse.response);
  const [moodScore, setMoodScore] = useState(currentResponse.mood_score);
  const [energyScore, setEnergyScore] = useState(currentResponse.energy_score);
  const [sleepScore, setSleepScore] = useState(currentResponse.sleep_score);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!response.trim()) {
      alert('Vul alstublieft je antwoord in');
      return;
    }

    try {
      setIsSubmitting(true);
      await onSubmit(promptResponseId, response, moodScore, energyScore, sleepScore);
      setResponse('');
      setMoodScore(null);
      setEnergyScore(null);
      setSleepScore(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="rounded-2xl p-6 shadow-clean overflow-hidden"
      style={{ backgroundColor: '#FFFFFF' }}
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Question */}
        <div>
          <h3
            className="text-lg font-semibold mb-4"
            style={{ color: '#1A1A18' }}
          >
            {question}
          </h3>

          {/* Answer Textarea */}
          <textarea
            value={response}
            onChange={(e) => setResponse(e.target.value)}
            placeholder="Schrijf hier je gedachten en gevoelens op..."
            rows={4}
            className="w-full px-4 py-3 border-0 rounded-2xl focus:outline-none focus:ring-2 transition-all"
            style={{
              backgroundColor: '#F5F5F3',
              color: '#1A1A18',
              outlineColor: '#1A1917',
            }}
          />
        </div>

        {/* Scores */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <ScoreSelector
            label="Stemming"
            value={moodScore}
            onChange={setMoodScore}
          />
          <ScoreSelector
            label="Energie"
            value={energyScore}
            onChange={setEnergyScore}
          />
          <ScoreSelector
            label="Slaap"
            value={sleepScore}
            onChange={setSleepScore}
          />
        </div>

        {/* Submit Button */}
        <div className="pt-4 border-t" style={{ borderColor: '#E5E5E5' }}>
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full px-6 py-3 rounded-2xl font-medium transition-all flex items-center justify-center gap-2"
            style={{
              backgroundColor: '#1A1A18',
              color: '#FFFFFF',
              opacity: isSubmitting ? 0.6 : 1,
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
            }}
          >
            {isSubmitting ? 'Opslaan...' : 'Opslaan'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function ClientPromptsPage() {
  const supabase = createClient();
  const [unansweredPrompts, setUnansweredPrompts] = useState<PromptResponse[]>(
    []
  );
  const [answeredPrompts, setAnsweredPrompts] = useState<SubmittedResponse[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [showAnswered, setShowAnswered] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  useEffect(() => {
    loadPrompts();
  }, []);

  const loadPrompts = async () => {
    try {
      setLoading(true);

      // Get current user
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        console.error('Error getting user:', userError);
        return;
      }

      // Load unanswered prompts (empty or null response)
      const { data: unanswered, error: unansweredError } = await supabase
        .from('prompt_responses')
        .select(
          `
          id,
          prompt_id,
          response,
          mood_score,
          energy_score,
          sleep_score,
          created_at,
          prompt:prompts(question)
        `
        )
        .eq('client_id', user.id)
        .or('response.is.null,response.eq.')
        .order('created_at', { ascending: false });

      if (unansweredError) {
        console.error('Error loading unanswered prompts:', unansweredError);
      } else {
        // Normalize joined data (Supabase returns joins as arrays)
        const normalized = (unanswered || []).map((item: any) => ({
          ...item,
          prompt: Array.isArray(item.prompt) ? item.prompt[0] : item.prompt,
        })) as PromptResponse[];
        setUnansweredPrompts(normalized);
      }

      // Load answered prompts (last 5)
      const { data: answered, error: answeredError } = await supabase
        .from('prompt_responses')
        .select(
          `
          id,
          prompt_id,
          response,
          mood_score,
          energy_score,
          sleep_score,
          created_at,
          prompt:prompts(question)
        `
        )
        .eq('client_id', user.id)
        .neq('response', '')
        .not('response', 'is', null)
        .order('created_at', { ascending: false })
        .limit(5);

      if (answeredError) {
        console.error('Error loading answered prompts:', answeredError);
      } else {
        setAnsweredPrompts(
          (answered || []).map((p: any) => ({
            ...p,
            prompt: Array.isArray(p.prompt) ? p.prompt[0] : p.prompt,
            is_submitted: true,
          }))
        );
      }
    } catch (error) {
      console.error('Error loading prompts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitResponse = async (
    promptResponseId: string,
    responseText: string,
    moodScore: number | null,
    energyScore: number | null,
    sleepScore: number | null
  ) => {
    try {
      const { error } = await supabase
        .from('prompt_responses')
        .update({
          response: responseText,
          mood_score: moodScore,
          energy_score: energyScore,
          sleep_score: sleepScore,
        })
        .eq('id', promptResponseId);

      if (error) throw error;

      setSubmitSuccess(true);
      setTimeout(() => setSubmitSuccess(false), 3000);

      // Reload prompts
      await loadPrompts();
    } catch (error) {
      console.error('Error submitting response:', error);
      alert('Er is een fout opgetreden bij het opslaan');
    }
  };

  return (
    <div className="min-h-screen p-6" style={{ backgroundColor: '#FAFAFA' }}>
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2" style={{ color: '#1A1A18' }}>
            Reflectie vragen
          </h1>
          <p className="text-[15px]" style={{ color: '#8E8E93' }}>
            Deel je gedachten met je coach
          </p>
        </div>

        {/* Success Message */}
        {submitSuccess && (
          <div
            className="rounded-2xl p-4 mb-6 shadow-clean flex items-center gap-3 border-l-4"
            style={{
              backgroundColor: '#F0FDF4',
              borderLeftColor: '#22C55E',
            }}
          >
            <Check size={20} style={{ color: '#22C55E' }} strokeWidth={1.5} />
            <div>
              <p style={{ color: '#22C55E' }} className="font-medium text-[14px]">
                Bedankt! Coach bekijkt je antwoord binnenkort.
              </p>
            </div>
          </div>
        )}

        {/* Empty State or Prompts */}
        {loading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <PromptCardSkeleton key={i} />
            ))}
          </div>
        ) : unansweredPrompts.length === 0 ? (
          <div
            className="rounded-2xl p-12 text-center shadow-clean"
            style={{ backgroundColor: '#FFFFFF' }}
          >
            <MessageSquare
              size={48}
              style={{ color: '#1A1917' }}
              className="mx-auto mb-4"
              strokeWidth={1.5}
            />
            <p
              className="text-[15px] font-medium mb-2"
              style={{ color: '#1A1A18' }}
            >
              Geen openstaande reflectie vragen
            </p>
            <p className="text-[13px]" style={{ color: '#8E8E93' }}>
              Je bent helemaal bij met je vragen!
            </p>
          </div>
        ) : (
          <>
            {/* Unanswered Prompts */}
            <div className="space-y-4 mb-8">
              {unansweredPrompts.map((prompt) => (
                <PromptCard
                  key={prompt.id}
                  promptResponseId={prompt.id}
                  question={prompt.prompt.question}
                  currentResponse={{
                    response: prompt.response || '',
                    mood_score: prompt.mood_score,
                    energy_score: prompt.energy_score,
                    sleep_score: prompt.sleep_score,
                  }}
                  onSubmit={handleSubmitResponse}
                />
              ))}
            </div>

            {/* Answered Prompts Section */}
            {answeredPrompts.length > 0 && (
              <div>
                <button
                  onClick={() => setShowAnswered(!showAnswered)}
                  className="w-full flex items-center justify-between px-6 py-4 rounded-2xl transition-all shadow-clean"
                  style={{
                    backgroundColor: '#FFFFFF',
                    color: '#1A1A18',
                  }}
                >
                  <span className="font-semibold text-[15px]">
                    Eerdere antwoorden ({answeredPrompts.length})
                  </span>
                  {showAnswered ? (
                    <ChevronUp size={20} style={{ color: '#1A1917' }} strokeWidth={1.5} />
                  ) : (
                    <ChevronDown
                      size={20}
                      style={{ color: '#1A1917' }}
                      strokeWidth={1.5}
                    />
                  )}
                </button>

                {showAnswered && (
                  <div className="mt-4 space-y-4">
                    {answeredPrompts.map((prompt) => (
                      <div
                        key={prompt.id}
                        className="rounded-2xl p-6 shadow-clean"
                        style={{ backgroundColor: '#FFFFFF' }}
                      >
                        <p
                          className="text-sm font-medium mb-3"
                          style={{ color: '#1A1A18' }}
                        >
                          {prompt.prompt.question}
                        </p>
                        <p
                          className="text-[14px] mb-4"
                          style={{ color: '#8E8E93' }}
                        >
                          {prompt.response}
                        </p>
                        <div
                          className="flex gap-4 text-[12px]"
                          style={{ color: '#1A1917' }}
                        >
                          {prompt.mood_score && (
                            <span>Stemming: {prompt.mood_score}/5</span>
                          )}
                          {prompt.energy_score && (
                            <span>Energie: {prompt.energy_score}/5</span>
                          )}
                          {prompt.sleep_score && (
                            <span>Slaap: {prompt.sleep_score}/5</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
