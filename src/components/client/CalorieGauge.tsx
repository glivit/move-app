'use client';

import React from 'react';

interface CalorieGaugeProps {
  consumed: number;
  target: number;
  meals: number;
}

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
    <div className="w-full max-w-[300px] mx-auto">
      <div className="relative flex flex-col items-center">
        {/* SVG Gauge */}
        <svg
          width={size}
          height={size / 2 + 20}
          viewBox={`0 0 ${size} ${size / 2 + 20}`}
          className="overflow-visible"
        >
          <defs>
            <linearGradient id="calorieGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#FFCC00" />
              <stop offset="33%" stopColor="#FF9500" />
              <stop offset="66%" stopColor="#FF3B30" />
              <stop offset="100%" stopColor="#AF52DE" />
            </linearGradient>
          </defs>

          {/* Background track (semicircle) */}
          <path
            d={`M ${strokeWidth / 2} ${size / 2} A ${radius} ${radius} 0 0 1 ${size - strokeWidth / 2} ${size / 2}`}
            fill="none"
            stroke="#F0F0ED"
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
            style={{ transition: 'stroke-dashoffset 0.5s ease-out' }}
          />
        </svg>

        {/* Center values - positioned absolutely over the gauge bottom */}
        <div className="absolute top-24 flex flex-col items-center">
          <div className="text-center">
            <div className="text-[56px] font-bold text-primary">
              {Math.round(remaining)}
            </div>
            <div className="text-[15px] text-client-text-secondary">
              kcal over
            </div>
          </div>
        </div>
      </div>

      {/* Bottom labels */}
      <div className="flex justify-between items-end mt-8 px-4">
        {/* Left: Consumed */}
        <div className="text-center">
          <div className="text-[20px] font-bold text-primary">
            {Math.round(consumed)}
          </div>
          <div className="text-[13px] text-client-text-secondary">
            Gegeten
          </div>
        </div>

        {/* Right: Meals */}
        <div className="text-center">
          <div className="text-[20px] font-bold text-primary">
            {meals}
          </div>
          <div className="text-[13px] text-client-text-secondary">
            Maaltijden
          </div>
        </div>
      </div>
    </div>
  );
}
