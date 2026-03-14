import { z } from 'zod'

/**
 * Validation schemas for MŌVE coaching app
 * All schemas return Dutch error messages
 */

// Check-in form validation
export const checkInSchema = z.object({
  date: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'Geldige datum is vereist',
  }),
  client_id: z.string().min(1, 'Cliënt-ID is vereist'),
  mood: z.enum(['😞', '😐', '🙂', '😄', '🤩'], {
    error: 'Geldige stemming selecteren',
  }),
  energy: z.number().int().min(1).max(10).optional(),
  sleep_quality: z.number().int().min(1).max(10).optional(),
  sleep_hours: z.number().min(0).max(24).optional(),
  stress_level: z.number().int().min(1).max(10).optional(),
  motivation: z.number().int().min(1).max(10).optional(),
  notes: z.string().optional(),
  coach_notes: z.string().optional(),
  coach_reviewed: z.boolean().default(false),
})

export type CheckInFormData = z.infer<typeof checkInSchema>

// Message validation
export const messageSchema = z.object({
  sender_id: z.string().min(1, 'Afzender is vereist'),
  recipient_id: z.string().min(1, 'Ontvanger is vereist'),
  content: z.string().min(1, 'Bericht mag niet leeg zijn').max(5000, 'Bericht is te lang'),
  message_type: z.enum(['text', 'image', 'document'], {
    error: 'Ongeldig berichttype',
  }).default('text'),
})

export type MessageData = z.infer<typeof messageSchema>

// Client creation validation
export const clientCreationSchema = z.object({
  full_name: z.string().min(2, 'Naam moet minstens 2 tekens zijn').max(100, 'Naam is te lang'),
  email: z.string().email('Geldig e-mailadres is vereist'),
  phone: z.string().optional().refine(
    (val) => !val || /^[+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}$/im.test(val),
    'Geldig telefoonnummer is vereist'
  ),
  package: z.enum(['essential', 'performance', 'elite'], {
    error: 'Geldig pakket selecteren',
  }),
  start_date: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'Geldige startdatum is vereist',
  }),
})

export type ClientCreationData = z.infer<typeof clientCreationSchema>

// Meal plan validation
export const mealPlanSchema = z.object({
  client_id: z.string().min(1, 'Cliënt-ID is vereist'),
  title: z.string().min(1, 'Titel is vereist').max(200, 'Titel is te lang'),
  description: z.string().optional().refine(
    (val) => !val || val.length <= 1000,
    'Beschrijving is te lang'
  ),
  content: z.string().optional(),
  pdf_url: z.string().url('Geldige URL is vereist').optional(),
  valid_from: z.string().optional(),
  valid_until: z.string().optional(),
  is_active: z.boolean().optional(),
})

export type MealPlanData = z.infer<typeof mealPlanSchema>

// Prompt response validation
export const promptResponseSchema = z.object({
  prompt_id: z.string().min(1, 'Prompt-ID is vereist'),
  client_id: z.string().min(1, 'Cliënt-ID is vereist'),
  response: z.string().min(1, 'Antwoord mag niet leeg zijn').max(5000, 'Antwoord is te lang'),
  submitted_at: z.string().optional(),
  coach_feedback: z.string().optional(),
  coach_reviewed: z.boolean().default(false),
})

export type PromptResponseData = z.infer<typeof promptResponseSchema>

// Profile update validation
export const profileUpdateSchema = z.object({
  full_name: z.string().min(2, 'Naam moet minstens 2 tekens zijn').optional(),
  email: z.string().email('Geldig e-mailadres is vereist').optional(),
  phone: z.string().optional(),
  avatar_url: z.string().url('Geldige URL is vereist').optional(),
  bio: z.string().optional(),
})

export type ProfileUpdateData = z.infer<typeof profileUpdateSchema>

// Video session validation
export const videoSessionSchema = z.object({
  client_id: z.string().min(1, 'Cliënt-ID is vereist'),
  title: z.string().min(1, 'Titel is vereist').max(200, 'Titel is te lang'),
  scheduled_at: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'Geldige datum/tijd is vereist',
  }),
  duration_minutes: z.number().int().min(15).max(480, 'Sessie is te lang'),
  notes: z.string().optional(),
})

export type VideoSessionData = z.infer<typeof videoSessionSchema>

// Broadcast message validation
export const broadcastSchema = z.object({
  title: z.string().min(1, 'Titel is vereist').max(200, 'Titel is te lang'),
  content: z.string().min(1, 'Inhoud is vereist').max(5000, 'Inhoud is te lang'),
  recipient_ids: z.array(z.string()).min(1, 'Ten minste één ontvanger is vereist'),
})

export type BroadcastData = z.infer<typeof broadcastSchema>

// Subscription creation validation
export const subscriptionSchema = z.object({
  client_id: z.string().min(1, 'Cliënt-ID is vereist'),
  package_tier: z.enum(['essential', 'performance', 'elite'], {
    error: 'Geldig pakket selecteren',
  }),
})

export type SubscriptionData = z.infer<typeof subscriptionSchema>
