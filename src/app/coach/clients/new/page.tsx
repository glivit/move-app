'use client';

import { useState } from 'react';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

interface FieldErrors {
  [key: string]: string[];
}

export default function NewClientPage() {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    package: 'essential' as 'essential' | 'performance' | 'elite',
    start_date: new Date().toISOString().split('T')[0],
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setFieldErrors({});

    try {
      const res = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.fields) {
          setFieldErrors(data.fields);
          setError('Controleer de onderstaande velden.');
        } else {
          throw new Error(data.error || 'Er ging iets mis');
        }
        return;
      }

      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Er ging iets mis');
    } finally {
      setLoading(false);
    }
  };

  const getFieldError = (fieldName: string): string | undefined => {
    return fieldErrors[fieldName]?.[0];
  };

  if (success) {
    return (
      <div className="min-h-screen bg-client-bg">
        <div className="max-w-md mx-auto px-6 py-12">
          <div className="bg-[#A6ADA7] rounded-2xl shadow-clean p-8 text-center">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 bg-client-surface-muted">
              <CheckCircle2 size={32} strokeWidth={1.5} className="text-data-green" />
            </div>
            <h2 className="text-2xl font-semibold mb-3 text-text-primary">
              Uitnodiging verstuurd
            </h2>
            <p className="text-client-text-secondary mb-6">
              Een inloglink is verstuurd naar <strong>{formData.email}</strong>. De cliënt kan nu inloggen en aan de slag gaan.
            </p>
            <div className="space-y-3">
              <button
                onClick={() => {
                  setSuccess(false);
                  setFormData({
                    full_name: '',
                    email: '',
                    phone: '',
                    package: 'essential',
                    start_date: new Date().toISOString().split('T')[0],
                  });
                }}
                className="w-full px-6 py-3 rounded-xl font-medium transition-all hover:shadow-clean bg-client-surface-muted text-text-primary"
              >
                Nog een cliënt
              </button>
              <Link href="/coach/clients" className="block">
                <button
                  className="w-full px-6 py-3 rounded-xl font-medium transition-all hover:bg-text-primary/90 bg-text-primary text-white"
                >
                  Naar overzicht
                </button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-client-bg">
      <div className="max-w-md mx-auto px-6 py-12">
        {/* Back Button */}
        <div className="mb-8">
          <Link href="/coach/clients">
            <button className="flex items-center gap-2 px-4 py-2 rounded-xl transition text-[13px] text-client-text-secondary hover:text-text-primary">
              <ArrowLeft size={18} strokeWidth={1.5} />
              Terug naar cliënten
            </button>
          </Link>
        </div>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-[28px] font-display text-text-primary mb-2">
            Nieuwe cliënt uitnodigen
          </h1>
          <p className="text-[13px] text-client-text-secondary">
            Voeg een nieuwe cliënt toe en stuur een inloguitnodiging
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-[#A6ADA7] rounded-2xl shadow-clean p-6">
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-data-red/10">
              <p className="text-[13px] text-data-red">
                {error}
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Full Name */}
            <div>
              <label className="block text-[13px] font-medium mb-2 text-text-primary">
                Volledige naam
              </label>
              <input
                type="text"
                required
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                placeholder="Jan Janssens"
                className="w-full px-4 py-3 rounded-xl border-0 bg-client-surface-muted text-[15px] text-text-primary placeholder-client-text-secondary focus:outline-none focus:ring-2 focus:ring-accent/30 transition"
              />
              {getFieldError('full_name') && (
                <p className="text-[13px] text-data-red mt-2">
                  {getFieldError('full_name')}
                </p>
              )}
            </div>

            {/* Email */}
            <div>
              <label className="block text-[13px] font-medium mb-2 text-text-primary">
                E-mailadres
              </label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="jan@email.be"
                className="w-full px-4 py-3 rounded-xl border-0 bg-client-surface-muted text-[15px] text-text-primary placeholder-client-text-secondary focus:outline-none focus:ring-2 focus:ring-accent/30 transition"
              />
              {getFieldError('email') && (
                <p className="text-[13px] text-data-red mt-2">
                  {getFieldError('email')}
                </p>
              )}
            </div>

            {/* Phone */}
            <div>
              <label className="block text-[13px] font-medium mb-2 text-text-primary">
                Telefoonnummer (optioneel)
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+32 4XX XX XX XX"
                className="w-full px-4 py-3 rounded-xl border-0 bg-client-surface-muted text-[15px] text-text-primary placeholder-client-text-secondary focus:outline-none focus:ring-2 focus:ring-accent/30 transition"
              />
            </div>

            {/* Package Selection */}
            <div>
              <label className="block text-[13px] font-medium mb-3 text-text-primary">
                Selecteer een pakket
              </label>
              <div className="space-y-3">
                {[
                  { value: 'essential', label: 'MŌVE Essential', price: '297' },
                  { value: 'performance', label: 'MŌVE Performance', price: '497' },
                  { value: 'elite', label: 'MŌVE Elite', price: '797' },
                ].map((pkg) => (
                  <label
                    key={pkg.value}
                    className={`flex items-center p-4 rounded-xl cursor-pointer border transition ${
                      formData.package === pkg.value
                        ? 'bg-accent-light border-accent'
                        : 'bg-[#A6ADA7] border-client-border hover:border-client-border-strong'
                    }`}
                  >
                    <input
                      type="radio"
                      name="package"
                      value={pkg.value}
                      checked={formData.package === pkg.value}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          package: e.target.value as 'essential' | 'performance' | 'elite',
                        })
                      }
                      className="w-4 h-4 cursor-pointer"
                    />
                    <div className="ml-4 flex-1">
                      <p className="font-medium text-[13px] text-text-primary">
                        {pkg.label}
                      </p>
                      <p className="text-[13px] text-client-text-secondary">
                        €{pkg.price}/maand
                      </p>
                    </div>
                  </label>
                ))}
              </div>
              {getFieldError('package') && (
                <p className="text-[13px] text-data-red mt-2">
                  {getFieldError('package')}
                </p>
              )}
            </div>

            {/* Start Date */}
            <div>
              <label className="block text-[13px] font-medium mb-2 text-text-primary">
                Startdatum
              </label>
              <input
                type="date"
                required
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border-0 bg-client-surface-muted text-[15px] text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/30 transition"
              />
              {getFieldError('start_date') && (
                <p className="text-[13px] text-data-red mt-2">
                  {getFieldError('start_date')}
                </p>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full px-6 py-3 rounded-xl font-medium transition-all hover:bg-text-primary/90 bg-text-primary text-white disabled:opacity-50"
            >
              {loading ? 'Laden...' : 'Uitnodiging versturen'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
