/**
 * Shared workout types — gebruikt door page.tsx + extracted components
 * (ExercisePickerModal, FormCheckModal, etc).
 */

export interface Exercise {
  id: string
  name: string
  name_nl: string
  body_part: string
  target_muscle: string
  equipment: string
  gif_url: string
  video_url: string | null
  instructions: string
  coach_tips: string
  category?: string
}

export type SetType = 'normal' | 'warmup' | 'failure' | 'dropset'

export interface SetData {
  id: string
  set_number: number
  prescribed_reps: number | null
  actual_reps: number | null
  weight_kg: number | null
  is_warmup: boolean
  completed: boolean
  is_pr: boolean
  set_type?: SetType
  rest_seconds?: number
}

export const BODY_PART_OPTIONS = [
  'chest', 'back', 'shoulders', 'legs', 'arms', 'core', 'full body',
] as const

export const EQUIPMENT_OPTIONS = [
  'barbell', 'dumbbell', 'machine', 'cable', 'kettlebell',
  'body weight', 'band', 'other',
] as const
