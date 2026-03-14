export type {
  Database,
  UserRole,
  PackageTier,
  SubscriptionStatus,
  MessageType,
  VideoSessionStatus,
  PromptType,
  ResourceType,
} from './database'

// Convenience types
export type Profile = Database['public']['Tables']['profiles']['Row']
export type CheckIn = Database['public']['Tables']['checkins']['Row']
export type Prompt = Database['public']['Tables']['prompts']['Row']
export type PromptResponse = Database['public']['Tables']['prompt_responses']['Row']
export type Message = Database['public']['Tables']['messages']['Row']
export type VideoSession = Database['public']['Tables']['video_sessions']['Row']
export type Program = Database['public']['Tables']['programs']['Row']
export type MealPlan = Database['public']['Tables']['meal_plans']['Row']
export type Resource = Database['public']['Tables']['resources']['Row']
export type Broadcast = Database['public']['Tables']['broadcasts']['Row']
export type IntakeForm = Database['public']['Tables']['intake_forms']['Row']

// Import the Database type for the convenience types above
import type { Database } from './database'
