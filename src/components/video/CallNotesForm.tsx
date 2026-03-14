'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { CheckCircle, AlertCircle } from 'lucide-react';

interface CallNotesFormProps {
  sessionId: string;
  initialNotes?: string;
  onSaved?: () => void;
}

interface SaveResponse {
  success: boolean;
  error?: string;
}

export function CallNotesForm({
  sessionId,
  initialNotes = '',
  onSaved,
}: CallNotesFormProps) {
  const [notes, setNotes] = useState(initialNotes);
  const [isLoading, setIsLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!notes.trim()) {
      setError('Voer alstublieft notities in');
      return;
    }

    setIsLoading(true);
    setError(null);
    setSaved(false);

    try {
      const response = await fetch(`/api/video-sessions/${sessionId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          notes: notes.trim(),
        }),
      });

      const result: SaveResponse = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Fout bij opslaan van notities');
      }

      setSaved(true);
      onSaved?.();

      // Clear success message after 3 seconds
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Er is een fout opgetreden';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card padding="md">
      <h2 className="text-xl font-semibold text-text-primary mb-4">
        Notities voor dit gesprek
      </h2>

      {error && (
        <div className="flex items-start gap-3 mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {saved && (
        <div className="flex items-start gap-3 mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-green-700">Notities opgeslagen!</p>
        </div>
      )}

      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Voer hier notities in over het gesprek..."
        className="w-full px-4 py-3 border border-gray-300 rounded-lg text-text-primary placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent resize-none"
        rows={6}
      />

      <div className="mt-4 flex gap-3">
        <Button
          variant="primary"
          onClick={handleSave}
          disabled={isLoading || !notes.trim()}
          className="flex-1"
        >
          {isLoading ? 'Bezig met opslaan...' : 'Notities opslaan'}
        </Button>
      </div>
    </Card>
  );
}
