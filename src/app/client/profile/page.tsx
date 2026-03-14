'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import {
  User,
  Bell,
  Target,
  UtensilsCrossed,
  AlertCircle,
  CreditCard,
  Receipt,
  HelpCircle,
  Shield,
  Info,
  ChevronRight,
  LogOut,
} from 'lucide-react';

interface Profile {
  id: string;
  full_name: string;
  email: string;
  role: string;
  package: string;
  created_at: string;
  avatar_url?: string;
}

export default function ProfilePage() {
  const router = useRouter();
  const supabase = createClient();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [signingOut, setSigningOut] = useState(false);

  // Get initials from full name
  const getInitials = (name?: string) => {
    if (!name) return '?';
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  // Format date in Dutch
  const formatMemberSince = (dateString: string) => {
    const date = new Date(dateString);
    const months = [
      'januari',
      'februari',
      'maart',
      'april',
      'mei',
      'juni',
      'juli',
      'augustus',
      'september',
      'oktober',
      'november',
      'december',
    ];
    return `${months[date.getMonth()]} ${date.getFullYear()}`;
  };

  // Get package color
  const getPackageColor = (pkg?: string) => {
    const packageLower = pkg?.toLowerCase() || '';
    if (packageLower.includes('elite')) return 'bg-accent text-white';
    if (packageLower.includes('premium')) return 'bg-data-purple bg-opacity-10 text-data-purple';
    if (packageLower.includes('pro')) return 'bg-data-blue bg-opacity-10 text-data-blue';
    return 'bg-accent-light text-accent';
  };

  // Load profile data
  useEffect(() => {
    const loadProfile = async () => {
      try {
        setLoading(true);

        // Get current user
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          router.replace('/');
          return;
        }

        setUserEmail(user.email || null);

        // Load profile from database
        const { data: profileData } = await supabase
          .from('profiles')
          .select('id, full_name, email, role, package, created_at, avatar_url')
          .eq('id', user.id)
          .single();

        if (profileData) {
          setProfile(profileData);
        }
      } catch (err) {
        console.error('Profile load error:', err);
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [supabase, router]);

  // Handle logout
  const handleLogout = async () => {
    try {
      setSigningOut(true);
      await supabase.auth.signOut();
      router.replace('/');
    } catch (err) {
      console.error('Logout error:', err);
      setSigningOut(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Skeleton for header */}
        <div className="flex flex-col items-center space-y-4">
          <div className="w-20 h-20 bg-white rounded-full animate-shimmer" />
          <div className="h-6 w-40 bg-white rounded-lg animate-shimmer" />
          <div className="h-4 w-48 bg-white rounded-lg animate-shimmer" />
        </div>

        {/* Skeleton for menu groups */}
        {[1, 2, 3, 4].map((group) => (
          <div key={group} className="bg-white rounded-2xl overflow-hidden shadow-clean space-y-0">
            {[1, 2].map((item) => (
              <div
                key={item}
                className="flex items-center justify-between px-5 py-4 border-b border-client-border last:border-0"
              >
                <div className="h-4 w-32 bg-client-surface-muted rounded animate-shimmer" />
                <div className="h-4 w-4 bg-client-surface-muted rounded animate-shimmer" />
              </div>
            ))}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      {/* Profile Header */}
      <div className="bg-white rounded-2xl shadow-clean p-8 flex flex-col items-center text-center">
        {/* Avatar */}
        <div className="w-20 h-20 rounded-full bg-accent text-white flex items-center justify-center mb-4 text-2xl font-semibold">
          {profile?.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt={profile.full_name}
              className="w-full h-full rounded-full object-cover"
            />
          ) : (
            getInitials(profile?.full_name)
          )}
        </div>

        {/* Name */}
        <h1 className="text-xl font-semibold text-text-primary mb-1">
          {profile?.full_name || 'Profiel'}
        </h1>

        {/* Email */}
        <p className="text-client-text-secondary text-[13px] mb-3">
          {userEmail || profile?.email}
        </p>

        {/* Package Badge */}
        <div className={`${getPackageColor(profile?.package)} px-3 py-1 rounded-full text-[12px] font-semibold mb-4`}>
          {profile?.package?.toUpperCase() || 'STANDAARD'}
        </div>

        {/* Member Since */}
        <p className="text-client-text-secondary text-[13px]">
          Lid sinds {formatMemberSince(profile?.created_at || '')}
        </p>
      </div>

      {/* Account Group */}
      <div className="bg-white rounded-2xl overflow-hidden shadow-clean divide-y divide-client-border">
        <a
          href="/client/profile/edit"
          className="flex items-center justify-between px-5 py-4 hover:bg-client-surface-muted transition-colors"
        >
          <div className="flex items-center gap-3">
            <User size={20} strokeWidth={1.5} className="text-accent" />
            <span className="text-[15px] text-text-primary">Persoonlijke gegevens</span>
          </div>
          <ChevronRight size={18} strokeWidth={1.5} className="text-client-text-secondary" />
        </a>
        <a
          href="/client/profile/notifications"
          className="flex items-center justify-between px-5 py-4 hover:bg-client-surface-muted transition-colors"
        >
          <div className="flex items-center gap-3">
            <Bell size={20} strokeWidth={1.5} className="text-accent" />
            <span className="text-[15px] text-text-primary">Meldingen</span>
          </div>
          <ChevronRight size={18} strokeWidth={1.5} className="text-client-text-secondary" />
        </a>
      </div>

      {/* Training & Nutrition Group */}
      <div className="bg-white rounded-2xl overflow-hidden shadow-clean divide-y divide-client-border">
        <a
          href="/client/profile/goals"
          className="flex items-center justify-between px-5 py-4 hover:bg-client-surface-muted transition-colors"
        >
          <div className="flex items-center gap-3">
            <Target size={20} strokeWidth={1.5} className="text-accent" />
            <span className="text-[15px] text-text-primary">Mijn doelen</span>
          </div>
          <ChevronRight size={18} strokeWidth={1.5} className="text-client-text-secondary" />
        </a>
        <a
          href="/client/profile/diet"
          className="flex items-center justify-between px-5 py-4 hover:bg-client-surface-muted transition-colors"
        >
          <div className="flex items-center gap-3">
            <UtensilsCrossed size={20} strokeWidth={1.5} className="text-accent" />
            <span className="text-[15px] text-text-primary">Voedingsvoorkeuren</span>
          </div>
          <ChevronRight size={18} strokeWidth={1.5} className="text-client-text-secondary" />
        </a>
        <a
          href="/client/profile/health"
          className="flex items-center justify-between px-5 py-4 hover:bg-client-surface-muted transition-colors"
        >
          <div className="flex items-center gap-3">
            <AlertCircle size={20} strokeWidth={1.5} className="text-accent" />
            <span className="text-[15px] text-text-primary">Blessures & beperkingen</span>
          </div>
          <ChevronRight size={18} strokeWidth={1.5} className="text-client-text-secondary" />
        </a>
      </div>

      {/* Subscription Group */}
      <div className="bg-white rounded-2xl overflow-hidden shadow-clean divide-y divide-client-border">
        <div className="flex items-center justify-between px-5 py-4">
          <div className="flex items-center gap-3">
            <CreditCard size={20} strokeWidth={1.5} className="text-accent" />
            <span className="text-[15px] text-text-primary">Huidig pakket</span>
          </div>
          <span className="text-[15px] text-text-primary font-semibold">
            {profile?.package?.toUpperCase() || 'STANDAARD'}
          </span>
        </div>
        <a
          href="/client/profile/invoices"
          className="flex items-center justify-between px-5 py-4 hover:bg-client-surface-muted transition-colors"
        >
          <div className="flex items-center gap-3">
            <Receipt size={20} strokeWidth={1.5} className="text-accent" />
            <span className="text-[15px] text-text-primary">Facturen</span>
          </div>
          <ChevronRight size={18} strokeWidth={1.5} className="text-client-text-secondary" />
        </a>
      </div>

      {/* About Group */}
      <div className="bg-white rounded-2xl overflow-hidden shadow-clean divide-y divide-client-border">
        <a
          href="/client/profile/help"
          className="flex items-center justify-between px-5 py-4 hover:bg-client-surface-muted transition-colors"
        >
          <div className="flex items-center gap-3">
            <HelpCircle size={20} strokeWidth={1.5} className="text-accent" />
            <span className="text-[15px] text-text-primary">Help & FAQ</span>
          </div>
          <ChevronRight size={18} strokeWidth={1.5} className="text-client-text-secondary" />
        </a>
        <a
          href="/client/profile/privacy"
          className="flex items-center justify-between px-5 py-4 hover:bg-client-surface-muted transition-colors"
        >
          <div className="flex items-center gap-3">
            <Shield size={20} strokeWidth={1.5} className="text-accent" />
            <span className="text-[15px] text-text-primary">Privacy beleid</span>
          </div>
          <ChevronRight size={18} strokeWidth={1.5} className="text-client-text-secondary" />
        </a>
        <div className="flex items-center justify-between px-5 py-4">
          <div className="flex items-center gap-3">
            <Info size={20} strokeWidth={1.5} className="text-accent" />
            <span className="text-[15px] text-text-primary">App versie</span>
          </div>
          <span className="text-[15px] text-client-text-secondary">v1.0.0</span>
        </div>
      </div>

      {/* Logout Button */}
      <button
        onClick={handleLogout}
        disabled={signingOut}
        className="w-full bg-white rounded-2xl shadow-clean px-5 py-4 flex items-center justify-center gap-2 text-data-red font-semibold text-[15px] hover:bg-client-surface-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <LogOut size={18} strokeWidth={1.5} />
        {signingOut ? 'Afmelden...' : 'Afmelden'}
      </button>
    </div>
  );
}
