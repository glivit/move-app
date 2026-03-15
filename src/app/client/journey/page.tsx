'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';
import {
  Dumbbell,
  UtensilsCrossed,
  MessageCircle,
  TrendingUp,
  Calendar,
  Zap,
  CheckCircle2,
} from 'lucide-react';
import Link from 'next/link';

interface Profile {
  id: string;
  created_at: string;
}

interface CheckIn {
  id: string;
  created_at: string;
  weight?: number;
}

function StatSkeleton() {
  return (
    <div
      className="bg-white rounded-2xl p-4 shadow-clean animate-shimmer"
      style={{ minHeight: '100px' }}
    />
  );
}

function TimelineItemSkeleton() {
  return (
    <div className="flex gap-4 pb-6">
      <div className="flex flex-col items-center">
        <div className="w-3 h-3 rounded-full bg-gray-200 animate-shimmer" />
        <div className="w-0.5 h-12 bg-gray-200 animate-shimmer mt-2" />
      </div>
      <div className="flex-1 pt-1">
        <div className="h-4 w-32 bg-gray-200 rounded animate-shimmer" />
        <div className="h-3 w-20 bg-gray-200 rounded animate-shimmer mt-2" />
      </div>
    </div>
  );
}

interface QuickAccessCard {
  title: string;
  subtitle: string;
  href: string;
  icon: React.ComponentType<any>;
  bgColor: string;
  accentColor: string;
}

export default function JourneyPage() {
  const supabase = createClient();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
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

      // Load profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, created_at')
        .eq('id', user.id)
        .single();

      if (profileError) {
        console.error('Error loading profile:', profileError);
      } else {
        setProfile(profileData);
      }

      // Load check-ins
      const { data: checkInsData, error: checkInsError } = await supabase
        .from('check_ins')
        .select('id, created_at, weight')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (checkInsError) {
        console.error('Error loading check-ins:', checkInsError);
      } else {
        setCheckIns(checkInsData || []);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = () => {
    if (!profile) return { daysCount: 0, streakCount: 0, checkInsCount: 0 };

    const createdDate = new Date(profile.created_at);
    const today = new Date();
    const daysCount = Math.floor(
      (today.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Simple streak calculation: count consecutive days with check-ins
    let streakCount = 0;
    if (checkIns.length > 0) {
      const dates = checkIns.map(
        (ci) => new Date(ci.created_at).toDateString()
      );
      const uniqueDates = [...new Set(dates)];
      streakCount = uniqueDates.length;
    }

    return {
      daysCount,
      streakCount,
      checkInsCount: checkIns.length,
    };
  };

  const stats = calculateStats();

  const quickAccessCards: QuickAccessCard[] = [
    {
      title: 'Training',
      subtitle: 'Bekijk je trainingsschema',
      href: '/client/workout',
      icon: Dumbbell,
      bgColor: 'rgba(0, 122, 255, 0.1)',
      accentColor: '#007AFF',
    },
    {
      title: 'Voeding',
      subtitle: 'Bekijk je voedingsplan',
      href: '/client/nutrition',
      icon: UtensilsCrossed,
      bgColor: 'rgba(52, 199, 89, 0.1)',
      accentColor: '#34C759',
    },
    {
      title: 'Berichten',
      subtitle: 'Communiceer met je coach',
      href: '/client/messages',
      icon: MessageCircle,
      bgColor: 'rgba(255, 149, 0, 0.1)',
      accentColor: '#FF9500',
    },
    {
      title: 'Voortgang',
      subtitle: 'Bekijk je statistieken',
      href: '/client/progress',
      icon: TrendingUp,
      bgColor: 'rgba(175, 82, 222, 0.1)',
      accentColor: '#AF52DE',
    },
  ];

  return (
    <div className="min-h-screen p-6" style={{ backgroundColor: '#FAFAFA' }}>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2" style={{ color: '#1A1A18' }}>
            Mijn Reis
          </h1>
          <p className="text-[15px]" style={{ color: '#8E8E93' }}>
            Jouw traject in één overzicht
          </p>
        </div>

        {/* Stats Row */}
        <div className="mb-8 overflow-x-auto pb-2">
          <div className="flex gap-4 min-w-min">
            {loading ? (
              <>
                <StatSkeleton />
                <StatSkeleton />
                <StatSkeleton />
              </>
            ) : (
              <>
                {/* Days Since Signup */}
                <div
                  className="rounded-2xl p-4 shadow-clean flex-shrink-0 min-w-[160px]"
                  style={{ backgroundColor: '#FFFFFF' }}
                >
                  <div className="text-2xl font-bold mb-1" style={{ color: '#1A1A18' }}>
                    {stats.daysCount}
                  </div>
                  <p className="text-[13px]" style={{ color: '#8E8E93' }}>
                    Dag van je reis
                  </p>
                </div>

                {/* Streak */}
                <div
                  className="rounded-2xl p-4 shadow-clean flex-shrink-0 min-w-[160px]"
                  style={{ backgroundColor: '#FFFFFF' }}
                >
                  <div className="text-2xl font-bold mb-1" style={{ color: '#1A1A18' }}>
                    {stats.streakCount}
                  </div>
                  <p className="text-[13px]" style={{ color: '#8E8E93' }}>
                    Actieve dagen
                  </p>
                </div>

                {/* Check-ins */}
                <div
                  className="rounded-2xl p-4 shadow-clean flex-shrink-0 min-w-[160px]"
                  style={{ backgroundColor: '#FFFFFF' }}
                >
                  <div className="text-2xl font-bold mb-1" style={{ color: '#1A1A18' }}>
                    {stats.checkInsCount}
                  </div>
                  <p className="text-[13px]" style={{ color: '#8E8E93' }}>
                    Check-ins totaal
                  </p>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Quick Access Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {quickAccessCards.map((card) => {
            const IconComponent = card.icon;
            return (
              <Link key={card.href} href={card.href}>
                <div
                  className="rounded-2xl p-5 shadow-clean hover:shadow-clean-hover transition-all duration-150 cursor-pointer h-full"
                  style={{ backgroundColor: '#FFFFFF' }}
                >
                  <div
                    className="inline-flex items-center justify-center w-12 h-12 rounded-full mb-4"
                    style={{ backgroundColor: card.bgColor }}
                  >
                    <IconComponent
                      size={24}
                      strokeWidth={1.5}
                      style={{ color: card.accentColor }}
                    />
                  </div>
                  <h3
                    className="font-semibold text-[16px] mb-1"
                    style={{ color: '#1A1A18' }}
                  >
                    {card.title}
                  </h3>
                  <p className="text-[13px] mb-3" style={{ color: '#8E8E93' }}>
                    {card.subtitle}
                  </p>
                  <div className="flex items-center gap-1" style={{ color: '#8B6914' }}>
                    <span className="text-[14px] font-medium">Ga naar</span>
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="9 18 15 12 9 6"></polyline>
                    </svg>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Timeline Section */}
        <div>
          <h2 className="text-lg font-semibold mb-6" style={{ color: '#1A1A18' }}>
            Recente activiteit
          </h2>

          {loading ? (
            <div>
              {[...Array(5)].map((_, i) => (
                <TimelineItemSkeleton key={i} />
              ))}
            </div>
          ) : checkIns.length === 0 ? (
            <div
              className="rounded-2xl p-8 text-center shadow-clean"
              style={{ backgroundColor: '#FFFFFF' }}
            >
              <CheckCircle2
                size={40}
                style={{ color: '#8B6914' }}
                className="mx-auto mb-3"
                strokeWidth={1.5}
              />
              <p className="text-[15px]" style={{ color: '#1A1A18' }}>
                Nog geen check-ins
              </p>
              <p className="text-[13px] mt-1" style={{ color: '#8E8E93' }}>
                Begin vandaag met je eerste check-in
              </p>
            </div>
          ) : (
            <div>
              {checkIns.map((checkIn, index) => {
                const date = new Date(checkIn.created_at);
                const isLast = index === checkIns.length - 1;

                return (
                  <div key={checkIn.id} className="flex gap-4 pb-6">
                    {/* Timeline Line */}
                    <div className="flex flex-col items-center">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: '#8B6914' }}
                      />
                      {!isLast && (
                        <div
                          className="w-0.5 h-12"
                          style={{ backgroundColor: '#E5E5E5' }}
                        />
                      )}
                    </div>

                    {/* Content */}
                    <div className="pt-1 pb-2">
                      <p
                        className="text-[15px] font-medium"
                        style={{ color: '#1A1A18' }}
                      >
                        {date.toLocaleDateString('nl-BE', {
                          weekday: 'long',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </p>
                      {checkIn.weight && (
                        <p
                          className="text-[13px] mt-0.5"
                          style={{ color: '#8E8E93' }}
                        >
                          Gewicht: {checkIn.weight} kg
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
