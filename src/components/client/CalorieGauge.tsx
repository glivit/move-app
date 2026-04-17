'use client';

import React from 'react';

interface CalorieGaugeProps {
  consumed: number;
  target: number;
  meals: number;
}

// v6 Orion tokens
const INK = '#FDFDFE';
const INK_FAINT = 'rgba(253,253,254,0.62)';
const TRACK = 'rgba(255,255,255,0.12)';

export function CalorieGauge({ consumed, target, meals }: CalorieGaugeProps) {
  const remaining = Math.max(0, target - consumed);
  const percentage = Math.min(consumed / target, 1);

  // SVG dimensions
  const size = 280;
  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = Math.PI * radius; // semicircle

  // Arc calculations for semicircle
  const arcLength = circumference * percentage;
  const strokeDashoffset = circumference - arcLength;

  return (
    <div style={{ width: '100%', maxWidth: 300, margin: '0 auto' }}>
      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        {/* SVG Gauge */}
        <svg
          width={size}
          height={size / 2 + 20}
          viewBox={`0 0 ${size} ${size / 2 + 20}`}
          style={{ overflow: 'visible' }}
        >
          <defs>
            {/* v6: tonale warm-gradient ipv v3-regenboog */}
            <linearGradient id="calorieGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#E8D7A0" />
              <stop offset="40%" stopColor="#D9A645" />
              <stop offset="75%" stopColor="#B56A53" />
              <stop offset="100%" stopColor="#8A7BA8" />
            </linearGradient>
          </defs>

          {/* Background track (semicircle) */}
          <path
            d={`M ${strokeWidth / 2} ${size / 2} A ${radius} ${radius} 0 0 1 ${size - strokeWidth / 2} ${size / 2}`}
            fill="none"
            stroke={TRACK}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />

          {/* Fill arc (semicircle) */}
          <path
            d={`M ${strokeWidth / 2} ${size / 2} A ${radius} ${radius} 0 0 1 ${size - strokeWidth / 2} ${size / 2}`}
            fill="none"
            stroke="url(#calorieGradient)"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            style={{ transition: 'stroke-dashoffset 500ms ease-out' }}
          />
        </svg>

        {/* Center values */}
        <div style={{ position: 'absolute', top: 96, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ textAlign: 'center' }}>
            <div
              style={{
                fontSize: 56,
                fontWeight: 500,
                color: INK,
                letterSpacing: '-0.04em',
                fontFamily: 'var(--font-display, Outfit), Outfit, sans-serif',
                fontVariantNumeric: 'tabular-nums',
                lineHeight: 1,
              }}
            >
              {Math.round(remaining)}
            </div>
            <div style={{ fontSize: 14, color: INK_FAINT, marginTop: 6, letterSpacing: '-0.005em' }}>
              kcal over
            </div>
          </div>
        </div>
      </div>

      {/* Bottom labels */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 32, padding: '0 16px' }}>
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              fontSize: 20,
              fontWeight: 600,
              color: INK,
              letterSpacing: '-0.02em',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {Math.round(consumed)}
          </div>
          <div style={{ fontSize: 13, color: INK_FAINT, marginTop: 2 }}>Gegeten</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              fontSize: 20,
              fontWeight: 600,
              color: INK,
              letterSpacing: '-0.02em',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {meals}
          </div>
          <div style={{ fontSize: 13, color: INK_FAINT, marginTop: 2 }}>Maaltijden</div>
        </div>
      </div>
    </div>
  );
}
