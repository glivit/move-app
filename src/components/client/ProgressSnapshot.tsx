'use client';

import React from 'react';

interface ProgressSnapshotProps {
  weight: number | null;
  previousWeight: number | null;
  daysSinceStart: number;
  checkinsCompleted: number;
  nextCheckinDays: number;
}

export function ProgressSnapshot({
  weight,
  previousWeight,
  daysSinceStart,
  checkinsCompleted,
  nextCheckinDays,
}: ProgressSnapshotProps) {
  // Calculate weight delta
  const weightDelta = weight && previousWeight ? weight - previousWeight : null;
  const isDeltaDown = weightDelta !== null && weightDelta < 0;

  return (
    <div className="bg-client-surface rounded-2xl p-5 border border-[rgba(28,30,24,0.10)]">
      {/* Weight section */}
      {weight !== null ? (
        <div className="flex items-baseline gap-3 mb-4">
          <div className="text-2xl font-bold text-primary">
            {weight.toFixed(1)} kg
          </div>

          {weightDelta !== null && (
            <div
              className={`text-[13px] font-semibold px-2 py-1 rounded-full ${
                isDeltaDown
                  ? 'bg-data-green bg-opacity-10 text-data-green'
                  : 'bg-data-orange bg-opacity-10 text-data-orange'
              }`}
            >
              {isDeltaDown ? '-' : '+'}{Math.abs(weightDelta).toFixed(1)} kg
            </div>
          )}
        </div>
      ) : null}

      {/* Stats row */}
      <div className="text-xs text-client-text-muted">
        Dag {daysSinceStart} • {checkinsCompleted} check-ins •{' '}
        {nextCheckinDays > 0
          ? `Volgende over ${nextCheckinDays} dagen`
          : 'Volgende beschikbaar'}
      </div>
    </div>
  );
}
