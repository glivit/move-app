'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { CheckCircle, AlertCircle } from 'lucide-react';

interface ScheduleCallFormProps {
  clientId: string;
  clientName: string;
  onSuccess?: () => void;
}

interface ScheduleResponse {
  success: boolean;
  data?: {
    id: string;
    daily_room_url: string;
    scheduled_at: string;
  };
  error?: string;
}

export function ScheduleCallForm({
  clientId,
  clientName,
  onSuccess,
}: ScheduleCallFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [successState, setSuccessState] = useState<{
    sessionId: string;
    roomUrl: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    date: '',
    time: '10:00',
    duration: 20,
  });

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, date: e.target.value }));
  };

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, time: e.target.value }));
  };

  const handleDurationChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFormData((prev) => ({ ...prev, duration: parseInt(e.target.value) }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      if (!formData.date || !formData.time) {
        throw new Error('Voer alstublieft een datum en tijd in');
      }

      const scheduledAt = new Date(`${formData.date}T${formData.time}`);

      if (scheduledAt < new Date()) {
        throw new Error('Voer alstublieft een toekomstig moment in');
      }

      const response = await fetch('/api/video-sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          client_id: clientId,
          scheduled_at: scheduledAt.toISOString(),
          duration_minutes: formData.duration,
        }),
      });

      const result: ScheduleResponse = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.error || 'Fout bij het plannen van het gesprek'
        );
      }

      if (result.data) {
        setSuccessState({
          sessionId: result.data.id,
          roomUrl: result.data.daily_room_url,
        });
        setFormData({ date: '', time: '10:00', duration: 20 });
        onSuccess?.();
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Er is een fout opgetreden';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  if (successState) {
    return (
      <Card padding="md">
        <div className="flex items-start gap-4">
          <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-text-primary mb-2">
              Gesprek geplant!
            </h3>
            <p className="text-sm text-text-secondary mb-4">
              Het video-gesprek met {clientName} is succesvol ingepland.
            </p>
            <div className="bg-warm-offwhite p-3 rounded-lg mb-4">
              <p className="text-xs text-text-secondary mb-2">
                Deelnemerslink:
              </p>
              <a
                href={successState.roomUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent hover:underline break-all font-mono text-sm"
              >
                {successState.roomUrl}
              </a>
            </div>
            <button
              onClick={() => setSuccessState(null)}
              className="text-accent hover:underline text-sm font-medium"
            >
              Nog een gesprek plannen
            </button>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card padding="md">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-text-primary mb-1">
          Gesprek plannen
        </h2>
        <p className="text-sm text-text-secondary">Client: {clientName}</p>
      </div>

      {error && (
        <div className="flex items-start gap-3 mb-6 p-3 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          type="date"
          label="Datum"
          value={formData.date}
          onChange={handleDateChange}
          required
        />

        <Input
          type="time"
          label="Tijd"
          value={formData.time}
          onChange={handleTimeChange}
          required
        />

        <div>
          <label className="block text-sm font-medium text-text-primary mb-2">
            Duur (minuten)
          </label>
          <select
            value={formData.duration}
            onChange={handleDurationChange}
            className="w-full px-3 py-2 border border-[#989F99] rounded-lg text-text-primary bg-[#A6ADA7] focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
          >
            <option value="15">15 minuten</option>
            <option value="20">20 minuten</option>
            <option value="30">30 minuten</option>
            <option value="45">45 minuten</option>
            <option value="60">60 minuten</option>
          </select>
        </div>

        <Button
          variant="primary"
          type="submit"
          disabled={isLoading}
          className="w-full"
        >
          {isLoading ? 'Bezig met plannen...' : 'Gesprek plannen'}
        </Button>
      </form>
    </Card>
  );
}
