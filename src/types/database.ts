export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type UserRole = 'coach' | 'client'
export type PackageTier = 'essential' | 'performance' | 'elite'
export type SubscriptionStatus = 'active' | 'past_due' | 'cancelled' | 'trialing'
export type MessageType = 'text' | 'image' | 'video' | 'file'
export type VideoSessionStatus = 'scheduled' | 'completed' | 'cancelled'
export type PromptType = 'weekly_1' | 'weekly_2' | 'custom'
export type ResourceType = 'video' | 'pdf' | 'article' | 'tip'
export type ExerciseCategory = 'strength' | 'cardio' | 'mobility' | 'warmup' | 'cooldown'
export type ProgramDifficulty = 'beginner' | 'intermediate' | 'advanced'
export type RecordType = 'weight' | 'reps' | 'volume'

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          role: UserRole
          full_name: string
          email: string
          phone: string | null
          avatar_url: string | null
          package: PackageTier | null
          start_date: string | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subscription_status: SubscriptionStatus | null
          goals: string | null
          medical_notes: string | null
          created_at: string
        }
        Insert: {
          id: string
          role: UserRole
          full_name: string
          email: string
          phone?: string | null
          avatar_url?: string | null
          package?: PackageTier | null
          start_date?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_status?: SubscriptionStatus | null
          goals?: string | null
          medical_notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          role?: UserRole
          full_name?: string
          email?: string
          phone?: string | null
          avatar_url?: string | null
          package?: PackageTier | null
          start_date?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_status?: SubscriptionStatus | null
          goals?: string | null
          medical_notes?: string | null
          created_at?: string
        }
      }
      checkins: {
        Row: {
          id: string
          client_id: string
          date: string
          weight_kg: number | null
          body_fat_pct: number | null
          muscle_mass_kg: number | null
          visceral_fat_level: number | null
          body_water_pct: number | null
          bmi: number | null
          chest_cm: number | null
          waist_cm: number | null
          hips_cm: number | null
          left_arm_cm: number | null
          right_arm_cm: number | null
          left_thigh_cm: number | null
          right_thigh_cm: number | null
          left_calf_cm: number | null
          right_calf_cm: number | null
          photo_front_url: string | null
          photo_back_url: string | null
          photo_left_url: string | null
          photo_right_url: string | null
          coach_notes: string | null
          coach_reviewed: boolean
          created_at: string
        }
        Insert: {
          id?: string
          client_id: string
          date: string
          weight_kg?: number | null
          body_fat_pct?: number | null
          muscle_mass_kg?: number | null
          visceral_fat_level?: number | null
          body_water_pct?: number | null
          bmi?: number | null
          chest_cm?: number | null
          waist_cm?: number | null
          hips_cm?: number | null
          left_arm_cm?: number | null
          right_arm_cm?: number | null
          left_thigh_cm?: number | null
          right_thigh_cm?: number | null
          left_calf_cm?: number | null
          right_calf_cm?: number | null
          photo_front_url?: string | null
          photo_back_url?: string | null
          photo_left_url?: string | null
          photo_right_url?: string | null
          coach_notes?: string | null
          coach_reviewed?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          client_id?: string
          date?: string
          weight_kg?: number | null
          body_fat_pct?: number | null
          muscle_mass_kg?: number | null
          visceral_fat_level?: number | null
          body_water_pct?: number | null
          bmi?: number | null
          chest_cm?: number | null
          waist_cm?: number | null
          hips_cm?: number | null
          left_arm_cm?: number | null
          right_arm_cm?: number | null
          left_thigh_cm?: number | null
          right_thigh_cm?: number | null
          left_calf_cm?: number | null
          right_calf_cm?: number | null
          photo_front_url?: string | null
          photo_back_url?: string | null
          photo_left_url?: string | null
          photo_right_url?: string | null
          coach_notes?: string | null
          coach_reviewed?: boolean
          created_at?: string
        }
      }
      prompts: {
        Row: {
          id: string
          title: string
          question: string
          prompt_type: PromptType
          is_active: boolean
          send_day: number
          send_time: string
          created_at: string
        }
        Insert: {
          id?: string
          title: string
          question: string
          prompt_type: PromptType
          is_active: boolean
          send_day: number
          send_time: string
          created_at?: string
        }
        Update: {
          id?: string
          title?: string
          question?: string
          prompt_type?: PromptType
          is_active?: boolean
          send_day?: number
          send_time?: string
          created_at?: string
        }
      }
      prompt_responses: {
        Row: {
          id: string
          prompt_id: string
          client_id: string
          response: string
          mood_score: number | null
          energy_score: number | null
          sleep_score: number | null
          coach_seen: boolean
          created_at: string
        }
        Insert: {
          id?: string
          prompt_id: string
          client_id: string
          response: string
          mood_score?: number | null
          energy_score?: number | null
          sleep_score?: number | null
          coach_seen?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          prompt_id?: string
          client_id?: string
          response?: string
          mood_score?: number | null
          energy_score?: number | null
          sleep_score?: number | null
          coach_seen?: boolean
          created_at?: string
        }
      }
      messages: {
        Row: {
          id: string
          sender_id: string
          receiver_id: string
          content: string
          message_type: MessageType
          file_url: string | null
          read_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          sender_id: string
          receiver_id: string
          content: string
          message_type: MessageType
          file_url?: string | null
          read_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          sender_id?: string
          receiver_id?: string
          content?: string
          message_type?: MessageType
          file_url?: string | null
          read_at?: string | null
          created_at?: string
        }
      }
      video_sessions: {
        Row: {
          id: string
          client_id: string
          daily_room_url: string | null
          scheduled_at: string
          duration_minutes: number
          status: VideoSessionStatus
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          client_id: string
          daily_room_url?: string | null
          scheduled_at: string
          duration_minutes?: number
          status?: VideoSessionStatus
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          client_id?: string
          daily_room_url?: string | null
          scheduled_at?: string
          duration_minutes?: number
          status?: VideoSessionStatus
          notes?: string | null
          created_at?: string
        }
      }
      programs: {
        Row: {
          id: string
          client_id: string
          title: string
          description: string | null
          hevy_program_id: string | null
          is_active: boolean
          coach_notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          client_id: string
          title: string
          description?: string | null
          hevy_program_id?: string | null
          is_active?: boolean
          coach_notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          client_id?: string
          title?: string
          description?: string | null
          hevy_program_id?: string | null
          is_active?: boolean
          coach_notes?: string | null
          created_at?: string
        }
      }
      meal_plans: {
        Row: {
          id: string
          client_id: string
          title: string
          description: string | null
          content: Json | null
          pdf_url: string | null
          is_active: boolean
          valid_from: string | null
          valid_until: string | null
          created_at: string
        }
        Insert: {
          id?: string
          client_id: string
          title: string
          description?: string | null
          content?: Json | null
          pdf_url?: string | null
          is_active?: boolean
          valid_from?: string | null
          valid_until?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          client_id?: string
          title?: string
          description?: string | null
          content?: Json | null
          pdf_url?: string | null
          is_active?: boolean
          valid_from?: string | null
          valid_until?: string | null
          created_at?: string
        }
      }
      resources: {
        Row: {
          id: string
          title: string
          description: string | null
          resource_type: ResourceType
          content_url: string | null
          thumbnail_url: string | null
          tags: string[]
          visible_to: string[]
          published: boolean
          created_at: string
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          resource_type: ResourceType
          content_url?: string | null
          thumbnail_url?: string | null
          tags: string[]
          visible_to: string[]
          published?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          resource_type?: ResourceType
          content_url?: string | null
          thumbnail_url?: string | null
          tags?: string[]
          visible_to?: string[]
          published?: boolean
          created_at?: string
        }
      }
      broadcasts: {
        Row: {
          id: string
          title: string
          content: string
          target_clients: string[]
          sent_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          title: string
          content: string
          target_clients: string[]
          sent_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          title?: string
          content?: string
          target_clients?: string[]
          sent_at?: string | null
          created_at?: string
        }
      }
      intake_forms: {
        Row: {
          id: string
          client_id: string
          primary_goal: string | null
          secondary_goals: string[] | null
          training_experience: string | null
          injuries_limitations: string | null
          current_activity_level: string | null
          preferred_training_days: string[] | null
          dietary_preferences: string | null
          dietary_restrictions: string | null
          sleep_hours_avg: number | null
          stress_level: number | null
          motivation_statement: string | null
          completed: boolean
          created_at: string
        }
        Insert: {
          id?: string
          client_id: string
          primary_goal?: string | null
          secondary_goals?: string[] | null
          training_experience?: string | null
          injuries_limitations?: string | null
          current_activity_level?: string | null
          preferred_training_days?: string[] | null
          dietary_preferences?: string | null
          dietary_restrictions?: string | null
          sleep_hours_avg?: number | null
          stress_level?: number | null
          motivation_statement?: string | null
          completed?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          client_id?: string
          primary_goal?: string | null
          secondary_goals?: string[] | null
          training_experience?: string | null
          injuries_limitations?: string | null
          current_activity_level?: string | null
          preferred_training_days?: string[] | null
          dietary_preferences?: string | null
          dietary_restrictions?: string | null
          sleep_hours_avg?: number | null
          stress_level?: number | null
          motivation_statement?: string | null
          completed?: boolean
          created_at?: string
        }
      }
      // ========== TRAINING SYSTEM ==========
      exercises: {
        Row: {
          id: string
          name: string
          name_nl: string | null
          body_part: string
          target_muscle: string
          secondary_muscles: string[]
          equipment: string
          gif_url: string | null
          video_url: string | null
          instructions: string[]
          coach_tips: string | null
          coach_notes: string | null
          category: ExerciseCategory
          is_custom: boolean
          is_visible: boolean
          sort_order: number
          exercisedb_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          name_nl?: string | null
          body_part: string
          target_muscle: string
          secondary_muscles?: string[]
          equipment?: string
          gif_url?: string | null
          video_url?: string | null
          instructions?: string[]
          coach_tips?: string | null
          coach_notes?: string | null
          category?: ExerciseCategory
          is_custom?: boolean
          is_visible?: boolean
          sort_order?: number
          exercisedb_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          name_nl?: string | null
          body_part?: string
          target_muscle?: string
          secondary_muscles?: string[]
          equipment?: string
          gif_url?: string | null
          video_url?: string | null
          instructions?: string[]
          coach_tips?: string | null
          coach_notes?: string | null
          category?: ExerciseCategory
          is_custom?: boolean
          is_visible?: boolean
          sort_order?: number
          exercisedb_id?: string | null
          created_at?: string
        }
      }
      program_templates: {
        Row: {
          id: string
          name: string
          description: string | null
          duration_weeks: number
          days_per_week: number
          difficulty: ProgramDifficulty
          tags: string[]
          is_archived: boolean
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          duration_weeks?: number
          days_per_week?: number
          difficulty?: ProgramDifficulty
          tags?: string[]
          is_archived?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          duration_weeks?: number
          days_per_week?: number
          difficulty?: ProgramDifficulty
          tags?: string[]
          is_archived?: boolean
          created_at?: string
        }
      }
      program_template_days: {
        Row: {
          id: string
          template_id: string
          day_number: number
          name: string
          focus: string | null
          estimated_duration_min: number
          sort_order: number
        }
        Insert: {
          id?: string
          template_id: string
          day_number: number
          name: string
          focus?: string | null
          estimated_duration_min?: number
          sort_order?: number
        }
        Update: {
          id?: string
          template_id?: string
          day_number?: number
          name?: string
          focus?: string | null
          estimated_duration_min?: number
          sort_order?: number
        }
      }
      program_template_exercises: {
        Row: {
          id: string
          template_day_id: string
          exercise_id: string
          sort_order: number
          sets: number
          reps_min: number
          reps_max: number | null
          rest_seconds: number
          tempo: string | null
          rpe_target: number | null
          weight_suggestion: string | null
          notes: string | null
          superset_group: string | null
        }
        Insert: {
          id?: string
          template_day_id: string
          exercise_id: string
          sort_order?: number
          sets?: number
          reps_min?: number
          reps_max?: number | null
          rest_seconds?: number
          tempo?: string | null
          rpe_target?: number | null
          weight_suggestion?: string | null
          notes?: string | null
          superset_group?: string | null
        }
        Update: {
          id?: string
          template_day_id?: string
          exercise_id?: string
          sort_order?: number
          sets?: number
          reps_min?: number
          reps_max?: number | null
          rest_seconds?: number
          tempo?: string | null
          rpe_target?: number | null
          weight_suggestion?: string | null
          notes?: string | null
          superset_group?: string | null
        }
      }
      client_programs: {
        Row: {
          id: string
          client_id: string
          template_id: string
          name: string
          start_date: string
          end_date: string | null
          current_week: number
          is_active: boolean
          coach_notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          client_id: string
          template_id: string
          name: string
          start_date: string
          end_date?: string | null
          current_week?: number
          is_active?: boolean
          coach_notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          client_id?: string
          template_id?: string
          name?: string
          start_date?: string
          end_date?: string | null
          current_week?: number
          is_active?: boolean
          coach_notes?: string | null
          created_at?: string
        }
      }
      workout_sessions: {
        Row: {
          id: string
          client_id: string
          client_program_id: string | null
          template_day_id: string | null
          started_at: string
          completed_at: string | null
          duration_seconds: number | null
          notes: string | null
          mood_rating: number | null
          created_at: string
        }
        Insert: {
          id?: string
          client_id: string
          client_program_id?: string | null
          template_day_id?: string | null
          started_at?: string
          completed_at?: string | null
          duration_seconds?: number | null
          notes?: string | null
          mood_rating?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          client_id?: string
          client_program_id?: string | null
          template_day_id?: string | null
          started_at?: string
          completed_at?: string | null
          duration_seconds?: number | null
          notes?: string | null
          mood_rating?: number | null
          created_at?: string
        }
      }
      workout_sets: {
        Row: {
          id: string
          workout_session_id: string
          exercise_id: string
          set_number: number
          prescribed_reps: number | null
          actual_reps: number | null
          weight_kg: number | null
          rpe: number | null
          is_warmup: boolean
          is_pr: boolean
          completed: boolean
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          workout_session_id: string
          exercise_id: string
          set_number?: number
          prescribed_reps?: number | null
          actual_reps?: number | null
          weight_kg?: number | null
          rpe?: number | null
          is_warmup?: boolean
          is_pr?: boolean
          completed?: boolean
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          workout_session_id?: string
          exercise_id?: string
          set_number?: number
          prescribed_reps?: number | null
          actual_reps?: number | null
          weight_kg?: number | null
          rpe?: number | null
          is_warmup?: boolean
          is_pr?: boolean
          completed?: boolean
          notes?: string | null
          created_at?: string
        }
      }
      nutrition_plans: {
        Row: {
          id: string
          client_id: string
          title: string
          calories_target: number | null
          protein_g: number | null
          carbs_g: number | null
          fat_g: number | null
          meals: Json
          guidelines: string | null
          is_active: boolean
          valid_from: string | null
          valid_until: string | null
          created_at: string
        }
        Insert: {
          id?: string
          client_id: string
          title: string
          calories_target?: number | null
          protein_g?: number | null
          carbs_g?: number | null
          fat_g?: number | null
          meals?: Json
          guidelines?: string | null
          is_active?: boolean
          valid_from?: string | null
          valid_until?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          client_id?: string
          title?: string
          calories_target?: number | null
          protein_g?: number | null
          carbs_g?: number | null
          fat_g?: number | null
          meals?: Json
          guidelines?: string | null
          is_active?: boolean
          valid_from?: string | null
          valid_until?: string | null
          created_at?: string
        }
      }
      personal_records: {
        Row: {
          id: string
          client_id: string
          exercise_id: string
          record_type: RecordType
          value: number
          achieved_at: string
          workout_set_id: string | null
        }
        Insert: {
          id?: string
          client_id: string
          exercise_id: string
          record_type: RecordType
          value: number
          achieved_at?: string
          workout_set_id?: string | null
        }
        Update: {
          id?: string
          client_id?: string
          exercise_id?: string
          record_type?: RecordType
          value?: number
          achieved_at?: string
          workout_set_id?: string | null
        }
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}
