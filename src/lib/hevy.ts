/**
 * HEVY Coach API client
 * Handles integration with HEVY Coach API for program management
 */

const HEVY_API_BASE_URL = 'https://api.hevyapp.com/v1'

export interface HevyProgram {
  id: string
  title: string
  description?: string
  weeks?: number
  is_public?: boolean
}

export interface HevyWorkout {
  id: string
  day: string
  exercises: HevyExercise[]
}

export interface HevyExercise {
  id: string
  name: string
  sets: number
  reps: string
  rest_seconds?: number
}

/**
 * Check if HEVY API is configured
 */
export function isHevyConfigured(): boolean {
  return !!process.env.HEVY_API_KEY
}

/**
 * Get all HEVY programs
 */
export async function getPrograms(): Promise<HevyProgram[]> {
  if (!isHevyConfigured()) {
    console.warn('HEVY_API_KEY not configured, returning mock data')
    return getMockPrograms()
  }

  try {
    const response = await fetch(`${HEVY_API_BASE_URL}/programs`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Api-Key': process.env.HEVY_API_KEY!,
      },
    })

    if (!response.ok) {
      console.error(`HEVY API error: ${response.status}`)
      return getMockPrograms()
    }

    const data = await response.json()
    return data.programs || []
  } catch (error) {
    console.error('Error fetching HEVY programs:', error)
    return getMockPrograms()
  }
}

/**
 * Assign a HEVY program to a client
 * Note: This stores the hevy_program_id in the database; actual assignment
 * to the user in HEVY happens through their interface
 */
export async function assignProgram(
  clientId: string,
  programId: string
): Promise<{ success: boolean; message: string }> {
  if (!isHevyConfigured()) {
    return { success: true, message: 'Mock assignment (HEVY not configured)' }
  }

  try {
    const response = await fetch(`${HEVY_API_BASE_URL}/programs/${programId}/assign`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Api-Key': process.env.HEVY_API_KEY!,
      },
      body: JSON.stringify({ user_id: clientId }),
    })

    if (!response.ok) {
      return { success: false, message: `Assignment failed: ${response.statusText}` }
    }

    return { success: true, message: 'Program assigned successfully' }
  } catch (error) {
    console.error('Error assigning HEVY program:', error)
    return {
      success: false,
      message: 'Failed to assign program. The hevy_program_id has been saved to the database.',
    }
  }
}

/**
 * Get workouts from HEVY for a client
 */
export async function getClientWorkouts(clientId: string): Promise<HevyWorkout[]> {
  if (!isHevyConfigured()) {
    console.warn('HEVY_API_KEY not configured, returning mock data')
    return getMockWorkouts()
  }

  try {
    const response = await fetch(`${HEVY_API_BASE_URL}/users/${clientId}/workouts`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Api-Key': process.env.HEVY_API_KEY!,
      },
    })

    if (!response.ok) {
      console.error(`HEVY API error: ${response.status}`)
      return getMockWorkouts()
    }

    const data = await response.json()
    return data.workouts || []
  } catch (error) {
    console.error('Error fetching HEVY workouts:', error)
    return getMockWorkouts()
  }
}

/**
 * Mock data for when HEVY API is not configured
 */
function getMockPrograms(): HevyProgram[] {
  return [
    {
      id: 'hevy-1',
      title: 'Upper Body Focus',
      description: 'Advanced upper body strength and hypertrophy program',
      weeks: 12,
    },
    {
      id: 'hevy-2',
      title: 'Lower Body Focus',
      description: 'Comprehensive lower body training program',
      weeks: 10,
    },
    {
      id: 'hevy-3',
      title: 'Full Body Strength',
      description: 'Complete body strength training for all levels',
      weeks: 8,
    },
  ]
}

function getMockWorkouts(): HevyWorkout[] {
  return [
    {
      id: 'workout-1',
      day: 'Monday',
      exercises: [
        { id: '1', name: 'Bench Press', sets: 4, reps: '6-8', rest_seconds: 180 },
        { id: '2', name: 'Incline Dumbbell Press', sets: 3, reps: '8-10', rest_seconds: 120 },
        { id: '3', name: 'Barbell Rows', sets: 4, reps: '6-8', rest_seconds: 180 },
      ],
    },
    {
      id: 'workout-2',
      day: 'Wednesday',
      exercises: [
        { id: '4', name: 'Squats', sets: 4, reps: '6-8', rest_seconds: 180 },
        { id: '5', name: 'Leg Press', sets: 3, reps: '8-10', rest_seconds: 120 },
        { id: '6', name: 'Leg Curls', sets: 3, reps: '10-12', rest_seconds: 90 },
      ],
    },
  ]
}
