# Client Workout Tracker - Implementation Guide

## Overview

The Client Workout Tracker is the premium core feature of the MŌVE coaching app. It provides a complete workout experience for clients, from browsing available workouts to logging sets and reviewing history.

## Architecture

### File Structure

```
src/
├── app/client/workout/
│   ├── page.tsx                    # Workout overview / day selector
│   ├── active/
│   │   └── page.tsx               # Active workout experience (CORE)
│   ├── complete/
│   │   └── page.tsx               # Workout completion summary
│   └── history/
│       └── page.tsx               # Workout history & calendar
├── components/client/
│   └── RestTimer.tsx              # Rest timer component (new)
```

## Pages Overview

### 1. Workout Overview (`/client/workout`)

**Purpose**: List available workouts and start new sessions

**Route**: `/client/workout`

**Key Features**:
- Fetches client's active program
- Displays all training days with metadata
- Shows week completion stats
- "Start Workout" button for each day

**Data Flow**:
```
1. Get authenticated user → supabase.auth.getUser()
2. Fetch active program → client_programs (where is_active = true)
3. Get template days → program_template_days (ordered by sort_order)
4. Count exercises per day → program_template_exercises
5. Count completed workouts this week → workout_sessions
```

**UI Components**:
- Header with program name and week number
- Week stats card (Calendar icon, workouts completed count)
- Day cards (name, focus, exercise count, duration, chevron)

---

### 2. Active Workout (`/client/workout/active`)

**Purpose**: The core workout experience - log sets and complete exercises

**Route**: `/client/workout/active?dayId={id}&programId={id}`

**Key Features**:
- Full-screen immersive mode
- Exercise GIF display (multiply blend mode)
- Expandable coach tips and instructions
- Set logging with weight/reps inputs
- Weight pre-fill from last workout
- Rest timer (automatic after set completion)
- Progress bar (exercise count)
- Exercise navigation (prev/next)
- Session creation and set persistence
- Close confirmation dialog

**Data Flow**:
```
1. Parse URL params → dayId, programId
2. Get authenticated user
3. Fetch exercises for day:
   - from program_template_exercises
   - join with exercises table
   - order by sort_order
4. For each exercise, get last workout weight:
   - from workout_sets
   - where exercise_id matches
   - order by created_at DESC, limit 1
5. Create workout_session:
   - insert with client_id, program_id, day_id, started_at
6. On set complete:
   - update local state with weight/reps
   - insert into workout_sets
   - show rest timer
7. On workout close:
   - confirm with user
   - redirect to overview (session stays incomplete)
```

**Session Lifecycle**:
- **Started**: `started_at` is set on page load
- **Sets Logged**: Each set is immediately saved to `workout_sets`
- **Incomplete**: If user closes without finishing, `completed_at` remains null
- **Complete**: Only set when user reaches completion page and saves

**UI Components**:
- Sticky top bar (exercise name, set counter, close button)
- Progress bar (exercise progress)
- Exercise GIF (with multiply blend mode)
- Expandable sections (coach tips, instructions)
- Set logging table (weight, reps, complete checkbox)
- Rest timer (fixed position, top-right)
- Navigation buttons (prev/next exercise)

---

### 3. Workout Completion (`/client/workout/complete`)

**Purpose**: Review session stats and add final touches

**Route**: `/client/workout/complete?sessionId={id}`

**Key Features**:
- Celebratory header
- Stats summary (duration, sets, volume, PRs)
- Mood rating (5 emoji options)
- Optional notes textarea
- Final save button

**Data Flow**:
```
1. Parse URL param → sessionId
2. Fetch workout_session:
   - select with nested workout_sets
3. Calculate stats:
   - duration: (now - started_at)
   - sets: count of workout_sets
   - volume: sum(weight_kg * actual_reps)
   - PRs: count where is_pr = true
4. On save:
   - update workout_session:
     * completed_at = now
     * duration_seconds = calculated
     * mood_rating = selected emoji
     * notes = textarea value
   - redirect to /client/workout
```

**UI Components**:
- Celebratory header (🎉 emoji)
- Stats grid (4 columns: duration, sets, volume, PRs)
- Mood selector (5 emoji buttons)
- Notes textarea
- Save button

---

### 4. Workout History (`/client/workout/history`)

**Purpose**: Review past workouts and track progress

**Route**: `/client/workout/history`

**Key Features**:
- Month calendar view
- Green dots for completed workouts
- Today highlighted
- Recent workouts list (expandable)
- Set breakdown grid
- Month navigation

**Data Flow**:
```
1. Get authenticated user
2. Fetch workout_sessions:
   - where completed_at IS NOT null
   - join workout_sets
   - order by completed_at DESC
   - limit 100
3. Generate calendar:
   - for each day in month
   - check if workout exists on that date
   - mark with green dot
4. On expand:
   - show notes
   - show set breakdown grid
```

**UI Components**:
- Month header with navigation
- Calendar grid (7 columns for days of week)
- Recent workouts list (date, day name, duration, volume, mood)
- Expandable details (notes, set grid)

---

## Components

### RestTimer Component

**Location**: `/src/components/client/RestTimer.tsx`

**Props**:
```typescript
interface RestTimerProps {
  initialSeconds: number
  onComplete?: () => void
  onDismiss?: () => void
}
```

**Features**:
- Fixed position (top-right corner)
- MM:SS countdown display
- Progress bar
- Pulse animation when complete
- Dismissible with X button
- "Volgende set" button when finished

**Integration**:
```tsx
// In active workout page
<RestTimer
  initialSeconds={restSeconds}
  onDismiss={() => setShowRestTimer(false)}
/>
```

---

## Database Integration

### Tables Used

| Table | Purpose | Key Fields |
|-------|---------|-----------|
| `client_programs` | Active workout program | id, client_id, template_id, current_week, is_active |
| `program_template_days` | Days in program | id, template_id, name, focus, estimated_duration_min |
| `program_template_exercises` | Exercise prescriptions | id, template_day_id, exercise_id, sets, reps_min, reps_max, rest_seconds, weight_suggestion |
| `exercises` | Exercise library | id, name, name_nl, gif_url, instructions, coach_tips |
| `workout_sessions` | Workout tracking | id, client_id, client_program_id, template_day_id, started_at, completed_at, duration_seconds, mood_rating, notes |
| `workout_sets` | Set logging | id, workout_session_id, exercise_id, set_number, prescribed_reps, actual_reps, weight_kg, is_pr, completed |

### Key Queries

#### 1. Get Active Program
```typescript
const { data: program } = await supabase
  .from('client_programs')
  .select('*')
  .eq('client_id', userId)
  .eq('is_active', true)
  .single()
```

#### 2. Get Days for Program
```typescript
const { data: days } = await supabase
  .from('program_template_days')
  .select('*')
  .eq('template_id', templateId)
  .order('sort_order')
```

#### 3. Get Exercises for Day
```typescript
const { data: exercises } = await supabase
  .from('program_template_exercises')
  .select('*, exercises(*)')
  .eq('template_day_id', dayId)
  .order('sort_order')
```

#### 4. Get Last Workout Weight
```typescript
const { data: lastSet } = await supabase
  .from('workout_sets')
  .select('weight_kg')
  .eq('exercise_id', exerciseId)
  .eq('completed', true)
  .order('created_at', { ascending: false })
  .limit(1)
  .single()
```

#### 5. Create Workout Session
```typescript
const { data: session } = await supabase
  .from('workout_sessions')
  .insert({
    client_id: userId,
    client_program_id: programId,
    template_day_id: dayId,
    started_at: new Date().toISOString(),
  })
  .select()
  .single()
```

#### 6. Log a Set
```typescript
const { data: set } = await supabase
  .from('workout_sets')
  .insert({
    workout_session_id: sessionId,
    exercise_id: exerciseId,
    set_number: setIndex,
    prescribed_reps: reps,
    actual_reps: actualReps,
    weight_kg: weight,
    completed: true,
    is_pr: isPR,
  })
  .select()
  .single()
```

#### 7. Complete Workout
```typescript
await supabase
  .from('workout_sessions')
  .update({
    completed_at: new Date().toISOString(),
    duration_seconds: seconds,
    mood_rating: moodValue,
    notes: notesText,
  })
  .eq('id', sessionId)
```

---

## Design System

### Colors
- **Background**: `#FAFAFA`
- **Cards**: White (`#FFFFFF`) with `rounded-2xl`
- **Borders**: `#F0F0ED`
- **Accent**: `#8B6914`
- **Accent BG**: `#F5F0E8`
- **Success**: `#34C759`
- **Warning**: `#FF9500`
- **Error**: `#FF3B30`

### Typography
- **Display (h1)**: Cormorant Garamond, semibold
- **Body**: DM Sans, regular
- **Font size (body)**: 15px
- **Font size (labels)**: 13-14px

### Shadows
- **Clean**: `shadow-[0_1px_3px_rgba(0,0,0,0.04)]`
- **Clean Hover**: `shadow-[0_4px_12px_rgba(0,0,0,0.06)]`

### Border Radius
- **Default**: `rounded-2xl` (1.25rem)
- **Secondary**: `rounded-xl` (1rem)
- **Small**: `rounded-lg` (0.75rem)

---

## State Management

### Active Workout Page State
```typescript
const [user, setUser] = useState<any>(null)
const [exercises, setExercises] = useState<ProgramTemplateExercise[]>([])
const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0)
const [sets, setSets] = useState<Record<string, SetData[]>>({})
const [lastWorkoutWeights, setLastWorkoutWeights] = useState<Record<string, number | null>>({})
const [loading, setLoading] = useState(true)
const [session, setSession] = useState<WorkoutSession | null>(null)
const [showRestTimer, setShowRestTimer] = useState(false)
const [restSeconds, setRestSeconds] = useState(0)
const [expandedTips, setExpandedTips] = useState(false)
const [expandedInstructions, setExpandedInstructions] = useState(false)
const [closeConfirm, setCloseConfirm] = useState(false)
```

---

## Performance Considerations

1. **Pre-fetch Weights**: Load last workout weights on page load to avoid delays
2. **Lazy Load GIFs**: GIFs are loaded from URLs, may need optimization for mobile
3. **Immediate Persistence**: Sets are saved to DB immediately, not batched
4. **Memoization**: Use `useCallback` for event handlers with dependencies

---

## Accessibility

- **ARIA Labels**: All buttons have `aria-label`
- **Focus Management**: Proper focus on interactive elements
- **Keyboard Nav**: Support for arrow keys in date navigation
- **Color Contrast**: Meets WCAG AA standards
- **Semantic HTML**: Proper heading hierarchy

---

## Localization (nl-BE)

All UI text is in Dutch (Flemish). Number and date formatting uses `nl-BE` locale:

```typescript
// Dates
workoutDate.toLocaleDateString('nl-BE', {
  weekday: 'short',
  month: 'short',
  day: 'numeric',
})

// Numbers
volume.toLocaleString('nl-BE') // Uses comma as decimal separator
```

---

## Mobile Optimization

1. **Full-screen Mode**: Active workout is full-screen on mobile
2. **Touch Targets**: Buttons are min 44px tall
3. **Fixed Elements**: Rest timer uses fixed positioning
4. **Safe Area**: Consider safe-area-inset for notches
5. **Responsive Inputs**: Number inputs work with mobile keyboards

---

## Error Handling

All async operations are wrapped in try-catch:
- Failed data fetches show empty states
- Failed saves show error messages
- User redirects to login if not authenticated

---

## Testing Checklist

- [ ] Load workout overview page
- [ ] Verify week stats calculation
- [ ] Start a workout (navigates to active page)
- [ ] Log a set (weight + reps)
- [ ] Verify pre-filled weight from last workout
- [ ] Complete a set (shows rest timer)
- [ ] Dismiss rest timer
- [ ] Navigate between exercises
- [ ] Close workout with confirmation
- [ ] Complete workout (navigation to complete page)
- [ ] View stats (duration, volume, PRs)
- [ ] Set mood rating
- [ ] Add notes
- [ ] Save workout
- [ ] View workout history
- [ ] Check calendar with dots
- [ ] Expand workout details

---

## Deployment Notes

1. Ensure Supabase tables exist with correct schema
2. Configure GIF URLs in ExerciseDB or similar service
3. Test with real Supabase credentials
4. Verify Dutch translations with native speakers
5. Test rest timer on various devices
6. Monitor database query performance

---

## Future Enhancements

1. **Video Playback**: Embed exercise videos inline
2. **RPE Selector**: Visual RPE scale (1-10)
3. **Warmup Tracking**: Special handling for warmup sets
4. **Export**: PDF workout report generation
5. **Sharing**: Share workout results with coach
6. **Notifications**: Push notifications for workout reminders
7. **Offline Mode**: Cache workouts for offline access
8. **Advanced Analytics**: Charts and trends over time

