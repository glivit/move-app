'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Plus, Clock, Edit2, Trash2, ToggleRight, ToggleLeft } from 'lucide-react';

export interface Prompt {
  id: string;
  title: string;
  question: string;
  send_day: number;
  send_time: string;
  is_active: boolean;
  created_at: string;
}

const DAYS = ['Zondag', 'Maandag', 'Dinsdag', 'Woensdag', 'Donderdag', 'Vrijdag', 'Zaterdag'];

const DEFAULT_PROMPTS = [
  {
    title: 'Hoe was je week?',
    question: 'Wat waren de hoogtepunten van je afgelopen week?',
    send_day: 1,
    send_time: '09:00',
  },
  {
    title: 'Weekend reflectie',
    question: 'Hoe voelde je lichaam en geest afgelopen weekend?',
    send_day: 5,
    send_time: '18:00',
  },
];

interface PromptsViewProps {
  initialPrompts: Prompt[];
}

export default function PromptsView({ initialPrompts }: PromptsViewProps) {
  const supabase = createClient();
  const [prompts, setPrompts] = useState<Prompt[]>(initialPrompts);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    question: '',
    send_day: '1',
    send_time: '09:00',
    is_active: true,
  });

  const loadPrompts = async () => {
    const { data, error } = await supabase
      .from('prompts')
      .select('*')
      .order('send_day', { ascending: true })
      .order('send_time', { ascending: true });

    if (!error) setPrompts(data || []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim() || !formData.question.trim()) {
      alert('Vul alstublieft alle velden in');
      return;
    }

    try {
      if (editingId) {
        const { error } = await supabase
          .from('prompts')
          .update({
            title: formData.title,
            question: formData.question,
            send_day: parseInt(formData.send_day),
            send_time: formData.send_time,
            is_active: formData.is_active,
          })
          .eq('id', editingId);

        if (error) throw error;
      } else {
        const { error } = await supabase.from('prompts').insert({
          title: formData.title,
          question: formData.question,
          prompt_type: 'custom',
          send_day: parseInt(formData.send_day),
          send_time: formData.send_time,
          is_active: formData.is_active,
        });

        if (error) throw error;
      }

      setFormData({
        title: '',
        question: '',
        send_day: '1',
        send_time: '09:00',
        is_active: true,
      });
      setEditingId(null);
      setShowForm(false);
      await loadPrompts();
    } catch (error) {
      console.error('Error saving prompt:', error);
      alert('Er is een fout opgetreden bij het opslaan');
    }
  };

  const handleEdit = (prompt: Prompt) => {
    setFormData({
      title: prompt.title,
      question: prompt.question,
      send_day: String(prompt.send_day),
      send_time: prompt.send_time,
      is_active: prompt.is_active,
    });
    setEditingId(prompt.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Weet je zeker dat je deze prompt wilt verwijderen?')) return;

    try {
      const { error } = await supabase.from('prompts').delete().eq('id', id);
      if (error) throw error;
      await loadPrompts();
    } catch (error) {
      console.error('Error deleting prompt:', error);
      alert('Er is een fout opgetreden bij het verwijderen');
    }
  };

  const handleToggleActive = async (id: string, currentState: boolean) => {
    try {
      const { error } = await supabase
        .from('prompts')
        .update({ is_active: !currentState })
        .eq('id', id);

      if (error) throw error;
      await loadPrompts();
    } catch (error) {
      console.error('Error updating prompt:', error);
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData({
      title: '',
      question: '',
      send_day: '1',
      send_time: '09:00',
      is_active: true,
    });
  };

  return (
    <div className="min-h-screen bg-client-bg">
      {/* Header */}
      <div className="border-b border-client-border">
        <div className="max-w-6xl mx-auto px-6 py-12">
          <h1 className="text-[32px] font-display text-text-primary mb-2">
            Reflectie Prompts
          </h1>
          <p className="text-[15px] text-client-text-secondary">
            Beheer je reflectie vragen en stuur ze automatisch naar je cliënten
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* New Prompt Button */}
        <div className="mb-8">
          {!showForm && (
            <Button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-2 px-5 py-3 rounded-xl bg-text-primary text-white font-medium transition-all hover:shadow-clean"
            >
              <Plus size={20} strokeWidth={1.5} />
              Nieuwe prompt
            </Button>
          )}
        </div>

        {/* Creation/Edit Form */}
        {showForm && (
          <Card className="mb-8 p-8 bg-white border border-client-border rounded-2xl shadow-clean">
            <h2 className="text-[17px] font-display text-text-primary mb-6">
              {editingId ? 'Bewerk prompt' : 'Nieuwe prompt'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-[13px] font-medium mb-3 text-text-primary">
                  Titel
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  placeholder="Bijv. Wekelijkse reflectie"
                  className="w-full px-4 py-3 rounded-xl border border-client-border bg-white text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-dark transition"
                />
              </div>

              <div>
                <label className="block text-[13px] font-medium mb-3 text-text-primary">
                  Vraag
                </label>
                <textarea
                  value={formData.question}
                  onChange={(e) =>
                    setFormData({ ...formData, question: e.target.value })
                  }
                  placeholder="Stel je reflectie vraag..."
                  rows={4}
                  className="w-full px-4 py-3 rounded-xl border border-client-border bg-white text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-dark transition resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-[13px] font-medium mb-3 text-text-primary">
                    Dag
                  </label>
                  <select
                    value={formData.send_day}
                    onChange={(e) =>
                      setFormData({ ...formData, send_day: e.target.value })
                    }
                    className="w-full px-4 py-3 rounded-xl border border-client-border bg-white text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-dark transition"
                  >
                    {DAYS.map((day, index) => (
                      <option key={index} value={index}>
                        {day}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[13px] font-medium mb-3 text-text-primary">
                    Tijd
                  </label>
                  <input
                    type="time"
                    value={formData.send_time}
                    onChange={(e) =>
                      setFormData({ ...formData, send_time: e.target.value })
                    }
                    className="w-full px-4 py-3 rounded-xl border border-client-border bg-white text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-dark transition"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 p-4 rounded-xl bg-client-surface-muted border border-client-border">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) =>
                    setFormData({ ...formData, is_active: e.target.checked })
                  }
                  id="is_active"
                  className="w-5 h-5 rounded accent-accent-dark"
                />
                <label htmlFor="is_active" className="text-[13px] font-medium cursor-pointer text-text-primary">
                  Deze prompt is actief
                </label>
              </div>

              <div className="flex gap-3 pt-6">
                <Button
                  type="submit"
                  className="flex-1 px-5 py-3 rounded-xl bg-text-primary text-white font-medium transition-all hover:shadow-clean"
                >
                  {editingId ? 'Bijwerken' : 'Aanmaken'}
                </Button>
                <Button
                  type="button"
                  onClick={handleCancel}
                  className="flex-1 px-5 py-3 rounded-xl bg-white border border-client-border text-text-primary font-medium transition-all hover:bg-client-surface-muted"
                >
                  Annuleren
                </Button>
              </div>
            </form>
          </Card>
        )}

        {/* Prompts List */}
        {prompts.length === 0 ? (
          <Card className="text-center py-16 bg-white border border-client-border rounded-2xl shadow-clean">
            <p className="text-[15px] mb-4 text-client-text-secondary">
              Je hebt nog geen reflectie prompts aangemaakt
            </p>
            <p className="text-[13px] mb-6 text-client-text-muted">
              Maak je eerste prompt aan om cliënten regelmatig reflectie vragen toe te sturen
            </p>
            {DEFAULT_PROMPTS.length > 0 && (
              <div className="mt-8 space-y-2">
                <p className="text-[12px] font-semibold mb-4 uppercase tracking-wide text-client-text-muted">
                  Voorbeeld prompts
                </p>
                {DEFAULT_PROMPTS.map((prompt, idx) => (
                  <div
                    key={idx}
                    className="text-[13px] p-3 rounded-xl border border-client-border bg-client-surface-muted text-client-text-secondary"
                  >
                    <div className="font-medium">{prompt.title}</div>
                    <div className="text-[12px] mt-1">{prompt.question}</div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        ) : (
          <div className="space-y-4">
            {prompts.map((prompt) => (
              <Card
                key={prompt.id}
                className="p-6 bg-white border border-client-border rounded-2xl transition-all hover:shadow-clean"
              >
                <div className="flex items-start justify-between gap-4">
                  {/* Prompt Info */}
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <h3 className="text-[15px] font-medium text-text-primary">
                        {prompt.title}
                      </h3>
                      <span
                        className={`text-[12px] font-semibold px-3 py-1 rounded-xl ${
                          prompt.is_active
                            ? 'bg-data-green/10 text-data-green'
                            : 'bg-client-surface-muted text-client-text-muted'
                        }`}
                      >
                        {prompt.is_active ? 'Actief' : 'Inactief'}
                      </span>
                    </div>
                    <p className="mb-4 leading-relaxed text-[13px] text-client-text-secondary">
                      {prompt.question}
                    </p>
                    <div className="flex items-center gap-2 text-[13px]">
                      <Clock size={16} strokeWidth={1.5} className="text-accent-dark" />
                      <span className="text-client-text-secondary">
                        {DAYS[prompt.send_day]} om {prompt.send_time}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleToggleActive(prompt.id, prompt.is_active)}
                      className={`p-2 rounded-xl transition-all hover:shadow-md ${
                        prompt.is_active
                          ? 'bg-client-surface-muted text-accent-dark'
                          : 'bg-client-surface-muted text-client-text-muted'
                      }`}
                      title={prompt.is_active ? 'Deactiveren' : 'Activeren'}
                    >
                      {prompt.is_active ? (
                        <ToggleRight size={20} strokeWidth={1.5} />
                      ) : (
                        <ToggleLeft size={20} strokeWidth={1.5} />
                      )}
                    </button>
                    <button
                      onClick={() => handleEdit(prompt)}
                      className="p-2 rounded-xl transition-all hover:shadow-md bg-client-surface-muted text-accent-dark"
                      title="Bewerken"
                    >
                      <Edit2 size={20} strokeWidth={1.5} />
                    </button>
                    <button
                      onClick={() => handleDelete(prompt.id)}
                      className="p-2 rounded-xl transition-all hover:shadow-md bg-client-surface-muted text-data-red"
                      title="Verwijderen"
                    >
                      <Trash2 size={20} strokeWidth={1.5} />
                    </button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
