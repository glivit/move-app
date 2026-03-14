'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Edit2, Trash2, X, Check } from 'lucide-react';

interface Prompt {
  id: string;
  title: string;
  question: string;
  send_day: number;
  send_time: string;
  is_active: boolean;
  created_at: string;
}

interface PromptConfigurationProps {
  prompt: Prompt;
  onDelete: (id: string) => void;
  onToggleActive: (id: string, currentState: boolean) => void;
}

const DAYS = ['Zondag', 'Maandag', 'Dinsdag', 'Woensdag', 'Donderdag', 'Vrijdag', 'Zaterdag'];

export function PromptConfiguration({
  prompt,
  onDelete,
  onToggleActive,
}: PromptConfigurationProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    title: prompt.title,
    question: prompt.question,
    send_day: prompt.send_day.toString(),
    send_time: prompt.send_time,
  });

  const handleSaveEdit = async () => {
    // Edit functionality would go here
    // For now, just close the editing mode
    setIsEditing(false);
  };

  return (
    <Card className="p-6 border-0 shadow-sm">
      {isEditing ? (
        <form onSubmit={(e) => {
          e.preventDefault();
          handleSaveEdit();
        }} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: '#1a1a1a' }}>
              Titel
            </label>
            <Input
              type="text"
              value={editData.title}
              onChange={(e) =>
                setEditData({ ...editData, title: e.target.value })
              }
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: '#1a1a1a' }}>
              Vraag
            </label>
            <textarea
              value={editData.question}
              onChange={(e) =>
                setEditData({ ...editData, question: e.target.value })
              }
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: '#1a1a1a' }}>
                Dag
              </label>
              <select
                value={editData.send_day}
                onChange={(e) =>
                  setEditData({ ...editData, send_day: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                {DAYS.map((day, index) => (
                  <option key={index} value={index}>
                    {day}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: '#1a1a1a' }}>
                Tijd
              </label>
              <Input
                type="time"
                value={editData.send_time}
                onChange={(e) =>
                  setEditData({ ...editData, send_time: e.target.value })
                }
              />
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              type="submit"
              style={{
                backgroundColor: '#8B6914',
                color: '#fff',
              }}
            >
              <Check size={16} className="mr-2" />
              Opslaan
            </Button>
            <Button
              type="button"
              onClick={() => setIsEditing(false)}
              variant="secondary"
            >
              Annuleren
            </Button>
          </div>
        </form>
      ) : (
        <div className="space-y-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="text-lg font-semibold mb-2" style={{ color: '#1a1a1a' }}>
                {prompt.title}
              </h3>
              <p className="text-sm mb-3" style={{ color: '#666' }}>
                {prompt.question}
              </p>
              <div className="flex items-center gap-4 text-sm" style={{ color: '#999' }}>
                <span>
                  {DAYS[prompt.send_day]} om {prompt.send_time}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => onToggleActive(prompt.id, prompt.is_active)}
                className="px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                style={{
                  backgroundColor: prompt.is_active ? '#8B6914' : '#e0e0e0',
                  color: prompt.is_active ? '#fff' : '#999',
                }}
              >
                {prompt.is_active ? 'Actief' : 'Inactief'}
              </button>
            </div>
          </div>

          <div className="flex gap-2 pt-2 border-t border-gray-200">
            <Button
              onClick={() => setIsEditing(true)}
              variant="secondary"
              className="flex items-center gap-2 text-sm"
            >
              <Edit2 size={16} />
              Bewerken
            </Button>
            <Button
              onClick={() => onDelete(prompt.id)}
              variant="secondary"
              className="flex items-center gap-2 text-sm text-red-600 hover:bg-red-50"
            >
              <Trash2 size={16} />
              Verwijderen
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
