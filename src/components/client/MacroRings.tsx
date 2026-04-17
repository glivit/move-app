'use client';

import React from 'react';

interface MacroRingsProps {
  protein: {
    current: number;
    target: number;
  };
  carbs: {
    current: number;
    target: number;
  };
  fat: {
    current: number;
    target: number;
  };
}

interface RingProps {
  label: string;
  current: number;
  target: number;
  color: string;
}

// v6 Orion — zachte warm neutrals voor macro-semantiek, geen v3 shout-kleuren
const TRACK = 'rgba(255,255,255,0.14)';
const INK = '#FDFDFE';
const INK_FAINT = 'rgba(253,253,254,0.62)';
const PROTEIN = '#D9A645';   // warm amber (eiwit)
const CARBS = '#B56A53';     // earthy terracotta (koolhydraten)
const FAT = '#8A7BA8';       // muted plum (vet)

function MacroRing({ label, current, target, color }: RingProps) {
  const size = 52;
  const strokeWidth = 4;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const percentage = Math.min(current / target, 1);
  const strokeDashoffset = circumference - circumference * percentage;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Background track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={TRACK}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />

        {/* Fill circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          style={{
            transition: 'stroke-dashoffset 500ms ease-out',
            transform: 'rotate(-90deg)',
            transformOrigin: `${size / 2}px ${size / 2}px`,
          }}
        />

        {/* Center text */}
        <text
          x={size / 2}
          y={size / 2}
          textAnchor="middle"
          dy="0.32em"
          fontSize="14"
          fontWeight="600"
          fill={INK}
          style={{ fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.01em' }}
        >
          {Math.round(current)}
        </text>
      </svg>

      {/* Label */}
      <div
        style={{
          fontSize: 12,
          color: INK_FAINT,
          marginTop: 6,
          letterSpacing: '-0.005em',
        }}
      >
        {label}
      </div>
    </div>
  );
}

export function MacroRings({ protein, carbs, fat }: MacroRingsProps) {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', gap: 32 }}>
      <MacroRing label="Eiwit" current={protein.current} target={protein.target} color={PROTEIN} />
      <MacroRing label="Koolh." current={carbs.current} target={carbs.target} color={CARBS} />
      <MacroRing label="Vet" current={fat.current} target={fat.target} color={FAT} />
    </div>
  );
}
