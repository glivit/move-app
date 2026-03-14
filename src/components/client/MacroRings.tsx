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

function MacroRing({ label, current, target, color }: RingProps) {
  const size = 52;
  const strokeWidth = 4;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const percentage = Math.min(current / target, 1);
  const strokeDashoffset = circumference - circumference * percentage;

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Background track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#F0F0ED"
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
            transition: 'stroke-dashoffset 0.5s ease-out',
            transform: 'rotate(-90deg)',
            transformOrigin: `${size / 2}px ${size / 2}px`,
          }}
        />

        {/* Center text */}
        <text
          x={size / 2}
          y={size / 2}
          textAnchor="middle"
          dy="0.3em"
          className="text-[15px] font-bold text-primary"
          fill="currentColor"
        >
          {Math.round(current)}
        </text>
      </svg>

      {/* Label */}
      <div className="text-[12px] text-client-text-secondary mt-2">
        {label}
      </div>
    </div>
  );
}

export function MacroRings({ protein, carbs, fat }: MacroRingsProps) {
  return (
    <div className="flex justify-center gap-8">
      <MacroRing
        label="Eiwit"
        current={protein.current}
        target={protein.target}
        color="#FF9500"
      />
      <MacroRing
        label="Koolh."
        current={carbs.current}
        target={carbs.target}
        color="#FF3B30"
      />
      <MacroRing
        label="Vet"
        current={fat.current}
        target={fat.target}
        color="#AF52DE"
      />
    </div>
  );
}
