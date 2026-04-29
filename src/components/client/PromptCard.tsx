'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Send } from 'lucide-react';

interface PromptCardProps {
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
}

interface ScoreSelectorProps {
  label: string;
  value: number | null;
  onChange: (value: number) => void;
}

function ScoreSelector({ label, value, onChange }: ScoreSelectorProps) {
  return (
    <div>
      <label className="block text-sm font-medium mb-2" style={{ color: '#1a1a1a' }}>
        {label}
      </label>
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map((score) => (
          <button
            key={score}
            onClick={() => onChange(score)}
            className="w-10 h-10 rounded-lg font-medium text-sm transition-colors border-2 border-gray-300"
            style={{
              backgroundColor: value === score ? '#1C1E18' : '#fff',
              color: value === score ? '#fff' : '#999',
              borderColor: value === score ? '#1C1E18' : '#ddd',
            }}
          >
            {score}
          </button>
        ))}
      </div>
    </div>
  );
}

export function PromptCard({
  promptResponseId,
  question,
  currentResponse,
  onSubmit,
}: PromptCardProps) {
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
    <Card className="p-6 border-0 shadow-sm">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold mb-4" style={{ color: '#1a1a1a' }}>
            {question}
          </h3>
          <textarea
            value={response}
            onChange={(e) => setResponse(e.target.value)}
            placeholder="Schrijf hier je gedachten en gevoelens op..."
            rows={4}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2"
            style={{ outlineColor: '#1C1E18' }}
          />
        </div>

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

        <div className="flex gap-3 pt-4">
          <Button
            type="submit"
            disabled={isSubmitting}
            className="flex items-center gap-2"
            style={{
              backgroundColor: '#1C1E18',
              color: '#fff',
              opacity: isSubmitting ? 0.6 : 1,
            }}
          >
            <Send size={16} />
            {isSubmitting ? 'Opslaan...' : 'Opslaan'}
          </Button>
        </div>
      </form>
    </Card>
  );
}
