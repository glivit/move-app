/**
 * MŌVE Progression Engine
 * Calculates suggested weights/reps for the next week based on progression rules
 */

interface ProgressionRule {
  id: string
  template_exercise_id: string
  progression_type: string
  config: Record<string, any>
}

interface WorkoutHistory {
  weight_kg: number | null
  actual_reps: number | null
  set_number: number
  rpe?: number | null
}

interface ProgressionSuggestion {
  suggested_weight: number | null
  suggested_reps: number
  suggested_sets: number
  is_deload: boolean
  deload_message?: string
  confidence: 'high' | 'medium' | 'low'
  reasoning: string
}

/**
 * Calculate estimated 1RM using Epley formula
 * 1RM = weight × (1 + reps / 30)
 */
export function calculateEpley1RM(weight: number, reps: number): number {
  if (reps <= 0 || weight <= 0) return 0
  if (reps === 1) return weight
  return Math.round(weight * (1 + reps / 30) * 100) / 100
}

/**
 * Calculate estimated 1RM using Brzycki formula
 * 1RM = weight × (36 / (37 - reps))
 */
export function calculateBrzycki1RM(weight: number, reps: number): number {
  if (reps <= 0 || weight <= 0 || reps >= 37) return 0
  if (reps === 1) return weight
  return Math.round(weight * (36 / (37 - reps)) * 100) / 100
}

/**
 * Get the best estimated 1RM from a set of workout data (average of Epley & Brzycki)
 */
export function estimateBest1RM(sets: WorkoutHistory[]): number {
  let best = 0
  for (const set of sets) {
    if (!set.weight_kg || !set.actual_reps || set.actual_reps <= 0) continue
    const epley = calculateEpley1RM(set.weight_kg, set.actual_reps)
    const brzycki = calculateBrzycki1RM(set.weight_kg, set.actual_reps)
    const avg = (epley + brzycki) / 2
    if (avg > best) best = avg
  }
  return Math.round(best * 100) / 100
}

/**
 * Check if current week is a deload week
 */
export function isDeloadWeek(
  currentWeek: number,
  deloadConfig: { every_n_weeks?: number } | null
): boolean {
  if (!deloadConfig || !deloadConfig.every_n_weeks) return false
  return currentWeek > 0 && currentWeek % deloadConfig.every_n_weeks === 0
}

/**
 * Calculate next-week targets based on progression rule
 */
export function calculateNextWeekTargets(
  rule: ProgressionRule,
  lastWeekSets: WorkoutHistory[],
  currentWeek: number,
  estimated1RM: number | null,
  templateExercise: { sets: number; reps_min: number; reps_max: number | null; rpe_target: number | null },
  deloadConfig: { every_n_weeks?: number; volume_reduction_pct?: number; intensity_reduction_pct?: number } | null
): ProgressionSuggestion {
  const config = rule.config || {}
  const baseReps = templateExercise.reps_min
  const baseSets = templateExercise.sets
  const deload = isDeloadWeek(currentWeek, deloadConfig)

  // Get last week's average weight
  const validSets = lastWeekSets.filter(s => s.weight_kg && s.weight_kg > 0)
  const lastWeight = validSets.length > 0
    ? validSets.reduce((sum, s) => sum + (s.weight_kg || 0), 0) / validSets.length
    : null

  const lastReps = validSets.length > 0
    ? Math.round(validSets.reduce((sum, s) => sum + (s.actual_reps || 0), 0) / validSets.length)
    : baseReps

  // Deload override
  if (deload && deloadConfig) {
    const volReduction = (deloadConfig.volume_reduction_pct || 40) / 100
    const intReduction = (deloadConfig.intensity_reduction_pct || 20) / 100

    return {
      suggested_weight: lastWeight ? Math.round((lastWeight * (1 - intReduction)) * 2) / 2 : null,
      suggested_reps: baseReps,
      suggested_sets: Math.max(2, Math.round(baseSets * (1 - volReduction))),
      is_deload: true,
      deload_message: 'Deload week — focus op herstel en techniek',
      confidence: 'high',
      reasoning: `Deload week ${currentWeek}: volume -${deloadConfig.volume_reduction_pct}%, intensiteit -${deloadConfig.intensity_reduction_pct}%`,
    }
  }

  switch (rule.progression_type) {
    case 'linear_weight': {
      const increment = config.increment_kg || 2.5
      const newWeight = lastWeight ? lastWeight + increment : null
      return {
        suggested_weight: newWeight ? Math.round(newWeight * 2) / 2 : null, // Round to nearest 0.5kg
        suggested_reps: baseReps,
        suggested_sets: baseSets,
        is_deload: false,
        confidence: lastWeight ? 'high' : 'low',
        reasoning: `Lineaire progressie: +${increment}kg per week`,
      }
    }

    case 'percentage_weight': {
      const incrementPct = config.increment_pct || 5
      const newWeight = lastWeight ? lastWeight * (1 + incrementPct / 100) : null
      return {
        suggested_weight: newWeight ? Math.round(newWeight * 2) / 2 : null,
        suggested_reps: baseReps,
        suggested_sets: baseSets,
        is_deload: false,
        confidence: lastWeight ? 'high' : 'low',
        reasoning: `Procentuele progressie: +${incrementPct}% per week`,
      }
    }

    case 'linear_reps': {
      const incrementReps = config.increment_reps || 1
      const maxReps = templateExercise.reps_max || baseReps + 6
      let newReps = lastReps + incrementReps

      // If we exceed max reps, increase weight and reset reps
      if (newReps > maxReps && lastWeight) {
        return {
          suggested_weight: Math.round((lastWeight + (config.weight_jump_kg || 2.5)) * 2) / 2,
          suggested_reps: baseReps,
          suggested_sets: baseSets,
          is_deload: false,
          confidence: 'medium',
          reasoning: `Rep maximum bereikt (${maxReps}), gewicht verhoogd en reps gereset naar ${baseReps}`,
        }
      }

      return {
        suggested_weight: lastWeight ? Math.round(lastWeight * 2) / 2 : null,
        suggested_reps: Math.min(newReps, maxReps),
        suggested_sets: baseSets,
        is_deload: false,
        confidence: 'high',
        reasoning: `Lineaire rep progressie: +${incrementReps} reps per week`,
      }
    }

    case 'wave': {
      const waveWeeks = config.wave_weeks || 3
      const deloadPct = config.deload_pct || 60
      const incrementPerWave = config.increment_per_wave_kg || 2.5
      const wavePosition = ((currentWeek - 1) % (waveWeeks + 1))

      if (wavePosition === waveWeeks) {
        // Deload week in wave
        return {
          suggested_weight: lastWeight ? Math.round((lastWeight * deloadPct / 100) * 2) / 2 : null,
          suggested_reps: baseReps,
          suggested_sets: Math.max(2, baseSets - 1),
          is_deload: true,
          deload_message: 'Wave cyclus deload — lichtere week voor herstel',
          confidence: 'high',
          reasoning: `Wave cyclus deload (${deloadPct}% van werkgewicht)`,
        }
      }

      // Progressive wave
      const wavesCompleted = Math.floor((currentWeek - 1) / (waveWeeks + 1))
      const weekInWave = wavePosition
      const baseIncrement = wavesCompleted * incrementPerWave
      const weeklyBump = weekInWave * (incrementPerWave / waveWeeks)

      return {
        suggested_weight: lastWeight
          ? Math.round(((lastWeight + weeklyBump) * 2) / 2)
          : null,
        suggested_reps: baseReps,
        suggested_sets: baseSets,
        is_deload: false,
        confidence: 'medium',
        reasoning: `Wave progressie: week ${weekInWave + 1}/${waveWeeks}, golf ${wavesCompleted + 1}`,
      }
    }

    case 'rpe_based': {
      const targetRPE = config.target_rpe || 8
      const adjustKg = config.adjust_kg || 2.5

      // Get last RPE from the most recent sets
      const lastRPE = validSets.length > 0 && validSets[0].rpe
        ? validSets.reduce((sum, s) => sum + (s.rpe || targetRPE), 0) / validSets.length
        : null

      if (!lastRPE || !lastWeight) {
        return {
          suggested_weight: lastWeight,
          suggested_reps: baseReps,
          suggested_sets: baseSets,
          is_deload: false,
          confidence: 'low',
          reasoning: 'Geen RPE data beschikbaar — gebruik vorige gewichten',
        }
      }

      let weightAdjust = 0
      if (lastRPE < targetRPE - 0.5) {
        weightAdjust = adjustKg // Too easy, increase
      } else if (lastRPE > targetRPE + 0.5) {
        weightAdjust = -adjustKg // Too hard, decrease
      }

      return {
        suggested_weight: Math.round((lastWeight + weightAdjust) * 2) / 2,
        suggested_reps: baseReps,
        suggested_sets: baseSets,
        is_deload: false,
        confidence: 'medium',
        reasoning: `RPE-based: vorige RPE ${lastRPE.toFixed(1)}, doel ${targetRPE}${weightAdjust !== 0 ? `, ${weightAdjust > 0 ? '+' : ''}${weightAdjust}kg` : ', gewicht behouden'}`,
      }
    }

    case 'custom': {
      const weekConfig = config.weeks?.[String(currentWeek)]
      if (!weekConfig) {
        return {
          suggested_weight: lastWeight,
          suggested_reps: baseReps,
          suggested_sets: baseSets,
          is_deload: false,
          confidence: 'low',
          reasoning: `Geen custom configuratie voor week ${currentWeek}`,
        }
      }

      let suggestedWeight = lastWeight
      if (weekConfig.weight_pct && estimated1RM) {
        suggestedWeight = Math.round((estimated1RM * weekConfig.weight_pct / 100) * 2) / 2
      }

      return {
        suggested_weight: suggestedWeight,
        suggested_reps: weekConfig.reps || baseReps,
        suggested_sets: weekConfig.sets || baseSets,
        is_deload: weekConfig.is_deload || false,
        confidence: 'high',
        reasoning: `Custom week ${currentWeek}: ${weekConfig.sets || baseSets}×${weekConfig.reps || baseReps}${weekConfig.weight_pct ? ` @ ${weekConfig.weight_pct}% 1RM` : ''}`,
      }
    }

    default:
      return {
        suggested_weight: lastWeight,
        suggested_reps: baseReps,
        suggested_sets: baseSets,
        is_deload: false,
        confidence: 'low',
        reasoning: 'Geen progressie-regel ingesteld',
      }
  }
}
