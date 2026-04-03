import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'
import Anthropic from '@anthropic-ai/sdk'

export const runtime = 'nodejs'
export const maxDuration = 60

/**
 * POST /api/ai/nutrition-plan
 * Generates a personalized AI nutrition plan based on client intake data.
 * Called at the end of onboarding after intake_forms is saved.
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json()
    if (!userId) {
      return NextResponse.json({ error: 'userId is verplicht' }, { status: 400 })
    }

    const db = createAdminClient()

    // Fetch profile + intake data in parallel
    const [profileRes, intakeRes] = await Promise.all([
      db.from('profiles').select('*').eq('id', userId).single(),
      db.from('intake_forms').select('*').eq('client_id', userId).single(),
    ])

    if (profileRes.error || !profileRes.data) {
      return NextResponse.json({ error: 'Profiel niet gevonden' }, { status: 404 })
    }
    if (intakeRes.error || !intakeRes.data) {
      return NextResponse.json({ error: 'Intake niet gevonden' }, { status: 404 })
    }

    const profile = profileRes.data
    const intake = intakeRes.data

    // Calculate age from date_of_birth
    const dob = profile.date_of_birth ? new Date(profile.date_of_birth) : null
    const age = dob
      ? Math.floor((Date.now() - dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000))
      : null

    // Build structured client data for the AI prompt
    const clientData = {
      name: profile.full_name || 'Client',
      sex: profile.sex || intake.sex || 'unknown',
      age,
      height_cm: profile.height_cm || intake.height_cm,
      weight_kg: intake.weight_kg,
      goal_type: intake.goal_type,
      goal_weight_kg: intake.goal_weight_kg,
      goal_description: intake.goal_description,
      goal_pace: intake.goal_pace,
      previous_attempts: intake.previous_attempts,
      previous_attempts_detail: intake.previous_attempts_detail,
      work_type: intake.work_type,
      sleep_hours: intake.sleep_hours_avg,
      stress_level: intake.stress_level,
      alcohol: intake.alcohol,
      caffeine: intake.caffeine,
      meals_per_day: intake.meals_per_day,
      social_context: intake.social_context,
      favorite_meals: intake.favorite_meals || [],
      hated_foods: intake.hated_foods || [],
      allergies: intake.allergies || [],
      cooking_style: intake.cooking_style,
      current_snacks: intake.current_snacks || [],
      snack_reason: intake.snack_reason || [],
      snack_preference: intake.snack_preference,
      evening_snacker: intake.evening_snacker,
      food_adventurousness: intake.food_adventurousness,
      typical_daily_eating: intake.typical_daily_eating || '',
      training_location: intake.training_location,
      home_equipment: intake.home_equipment || [],
      experience_level: intake.experience_level,
      training_frequency: intake.training_frequency,
      training_types: intake.training_types || [],
      session_duration: intake.session_duration,
      has_injuries: intake.has_injuries,
      has_food_relationship_issues: intake.has_food_relationship_issues,
    }

    // Mifflin-St Jeor BMR calculation reference for the AI
    let bmrNote = ''
    if (clientData.weight_kg && clientData.height_cm && age) {
      const w = Number(clientData.weight_kg)
      const h = Number(clientData.height_cm)
      if (clientData.sex === 'male') {
        const bmr = Math.round(10 * w + 6.25 * h - 5 * age + 5)
        bmrNote = `Geschat BMR (Mifflin-St Jeor): ${bmr} kcal/dag.`
      } else if (clientData.sex === 'female') {
        const bmr = Math.round(10 * w + 6.25 * h - 5 * age - 161)
        bmrNote = `Geschat BMR (Mifflin-St Jeor): ${bmr} kcal/dag.`
      }
    }

    const systemPrompt = `Je bent een ervaren sport- en voedingscoach die werkt voor MoveStudio. Je maakt gepersonaliseerde voedingsplannen op basis van wetenschappelijke kennis en praktijkervaring.

Je output is ALTIJD een geldig JSON-object (geen markdown, geen code blocks). Het JSON-object heeft precies deze structuur:

{
  "summary": "Korte samenvatting van het plan en de aanpak (2-3 zinnen)",
  "tdee_estimate": <number>,
  "calorie_target": <number>,
  "macros": {
    "protein_g": <number>,
    "carbs_g": <number>,
    "fat_g": <number>
  },
  "macro_rationale": "Uitleg waarom deze verdeling is gekozen",
  "meal_plan": [
    {
      "day": "Maandag",
      "meals": [
        {
          "type": "ontbijt" | "lunch" | "diner" | "snack",
          "name": "Naam van de maaltijd",
          "description": "Korte beschrijving / ingrediënten",
          "calories": <number>,
          "protein_g": <number>,
          "carbs_g": <number>,
          "fat_g": <number>
        }
      ]
    }
  ],
  "snack_swaps": [
    { "current": "huidige snack", "swap": "gezonder alternatief", "reason": "waarom" }
  ],
  "personal_rules": [
    "Persoonlijke vuistregels / gewoontes om aan te houden (5-8 regels)"
  ],
  "hydration_target_ml": <number>,
  "supplement_recommendations": [
    { "name": "supplement", "dosage": "dosering", "reason": "waarom" }
  ],
  "timeline": "Realistische tijdlijn om het doel te bereiken",
  "weekly_tips": [
    "Weekspecifieke tips voor de eerste 4 weken"
  ],
  "coach_notes": "Interne notities voor de coach met aandachtspunten"
}`

    const userPrompt = `Maak een volledig gepersonaliseerd voedingsplan voor de volgende cliënt:

=== CLIËNTGEGEVENS ===
Naam: ${clientData.name}
Geslacht: ${clientData.sex === 'male' ? 'Man' : clientData.sex === 'female' ? 'Vrouw' : 'Onbekend'}
Leeftijd: ${age ?? 'Onbekend'}
Lengte: ${clientData.height_cm ?? 'Onbekend'} cm
Gewicht: ${clientData.weight_kg ?? 'Onbekend'} kg
${bmrNote}

=== DOEL ===
Type: ${clientData.goal_type || 'Niet opgegeven'}
Streefgewicht: ${clientData.goal_weight_kg || 'Niet opgegeven'} kg
Beschrijving: ${clientData.goal_description || 'Geen'}
Tempo: ${clientData.goal_pace || 'Niet opgegeven'}
Eerdere pogingen: ${clientData.previous_attempts ? 'Ja' : 'Nee'}
${clientData.previous_attempts_detail ? `Detail: ${clientData.previous_attempts_detail}` : ''}

=== LEEFSTIJL ===
Type werk: ${clientData.work_type || 'Niet opgegeven'}
Slaap: ${clientData.sleep_hours ?? 'Onbekend'} uur/nacht
Stress: ${clientData.stress_level || 'Niet opgegeven'}
Alcohol: ${clientData.alcohol || 'Niet opgegeven'}
Cafeïne: ${clientData.caffeine || 'Niet opgegeven'}
Maaltijden per dag: ${clientData.meals_per_day || 'Niet opgegeven'}
Sociale context: ${clientData.social_context || 'Niet opgegeven'}

=== VOEDING ===
Huidig dagelijks eetpatroon: ${clientData.typical_daily_eating || 'Niet beschreven'}
Favoriete maaltijden: ${(clientData.favorite_meals as string[]).length > 0 ? (clientData.favorite_meals as string[]).join(', ') : 'Geen opgegeven'}
Gehate voedingsmiddelen: ${(clientData.hated_foods as string[]).length > 0 ? (clientData.hated_foods as string[]).join(', ') : 'Geen'}
Allergieën/intoleranties: ${(clientData.allergies as string[]).length > 0 ? (clientData.allergies as string[]).join(', ') : 'Geen'}
Kookstijl: ${clientData.cooking_style || 'Niet opgegeven'}
Huidige snacks: ${(clientData.current_snacks as string[]).length > 0 ? (clientData.current_snacks as string[]).join(', ') : 'Geen'}
Snack redenen: ${(clientData.snack_reason as string[]).length > 0 ? (clientData.snack_reason as string[]).join(', ') : 'Geen'}
Snack voorkeur: ${clientData.snack_preference || 'Niet opgegeven'}
Avondsnacker: ${clientData.evening_snacker || 'Niet opgegeven'}
Avontuurlijkheid (1-10): ${clientData.food_adventurousness ?? 5}

=== TRAINING ===
Locatie: ${clientData.training_location || 'Niet opgegeven'}
Thuismateriaal: ${(clientData.home_equipment as string[]).length > 0 ? (clientData.home_equipment as string[]).join(', ') : 'Geen'}
Ervaring: ${clientData.experience_level || 'Niet opgegeven'}
Frequentie: ${clientData.training_frequency ?? 'Niet opgegeven'}x per week
Types: ${(clientData.training_types as string[]).length > 0 ? (clientData.training_types as string[]).join(', ') : 'Niet opgegeven'}
Sessieduur: ${clientData.session_duration || 'Niet opgegeven'}

=== AANDACHTSPUNTEN ===
Blessures: ${clientData.has_injuries ? 'Ja — houd hier rekening mee in het plan' : 'Nee'}
Eetrelatie issues: ${clientData.has_food_relationship_issues ? 'Ja — wees extra voorzichtig, geen strenge restricties' : 'Nee'}

=== INSTRUCTIES ===
1. Bereken TDEE op basis van Mifflin-St Jeor + activiteitsfactor (training + werk)
2. Stel caloriedoel in op basis van het doel (deficit voor afvallen, surplus voor aankomen, onderhoud voor recomp)
3. Macro's: minimaal 1.6-2.2g eiwit/kg, vetten min. 25% van calorieën, rest koolhydraten
4. Maak een 7-dagen maaltijdplan (ma-zo) dat:
   - ALLEEN ingrediënten gebruikt die de cliënt lekker vindt
   - NOOIT gehate voedingsmiddelen of allergenen bevat
   - Past bij de kookstijl en tijdsbesteding
   - Realistisch en haalbaar is voor deze persoon
5. Geef slimme snack-swaps voor de huidige snacks
6. Maak 5-8 persoonlijke vuistregels die passen bij de leefstijl
7. Geef een realistische tijdlijn voor het doel
8. Bereken hydratie target (min. 30ml/kg lichaamsgewicht)
9. Supplementen alleen als er bewijs voor is (vitamine D, omega-3, creatine, etc.)
10. Als er eetrelatie issues zijn: focus op overvloed, niet restrictie

Antwoord ALLEEN met het JSON-object, geen extra tekst.`

    // Call Claude API
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY!,
    })

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      messages: [
        { role: 'user', content: userPrompt },
      ],
      system: systemPrompt,
    })

    // Extract text response
    const textBlock = message.content.find((b) => b.type === 'text')
    if (!textBlock || textBlock.type !== 'text') {
      throw new Error('Geen tekst ontvangen van AI')
    }

    // Parse JSON (strip potential markdown code fences)
    let planJson: Record<string, unknown>
    try {
      let raw = textBlock.text.trim()
      if (raw.startsWith('```')) {
        raw = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
      }
      planJson = JSON.parse(raw)
    } catch {
      console.error('Failed to parse AI response:', textBlock.text.substring(0, 500))
      throw new Error('AI response was not valid JSON')
    }

    // Deactivate any existing active plan
    await db.from('nutrition_plans')
      .update({ is_active: false })
      .eq('client_id', userId)
      .eq('is_active', true)

    // Build meals array from AI plan for the dashboard
    const mealPlan = (planJson as any).meal_plan || []
    const mondayMeals = mealPlan.find((d: any) => d.day === 'Maandag')?.meals || mealPlan[0]?.meals || []
    const meals = mondayMeals.map((m: any, i: number) => ({
      id: `meal-${i}-${(m.type || '').toLowerCase()}`,
      name: m.name || m.type || `Maaltijd ${i + 1}`,
      type: m.type,
      time: m.type === 'ontbijt' ? '08:00' : m.type === 'lunch' ? '12:30' : m.type === 'diner' ? '18:30' : '15:00',
      items: m.description ? [{ name: m.description, grams: null, per100g: { calories: m.calories || 0, protein: m.protein_g || 0, carbs: m.carbs_g || 0, fat: m.fat_g || 0 } }] : [],
    }))

    const macros = (planJson as any).macros || {}

    // Save to nutrition_plans table with all required fields
    const { error: insertError } = await db.from('nutrition_plans').insert({
      client_id: userId,
      title: `Voedingsplan ${profile.full_name?.split(' ')[0] || ''}`.trim(),
      is_active: true,
      calories_target: (planJson as any).calorie_target || null,
      protein_g: macros.protein_g || null,
      carbs_g: macros.carbs_g || null,
      fat_g: macros.fat_g || null,
      meals,
      plan_data: planJson,
      generated_at: new Date().toISOString(),
    })

    if (insertError) {
      console.error('Failed to save nutrition plan:', insertError)
      // Don't fail the request — plan was generated successfully
    }

    return NextResponse.json({ success: true, plan: planJson })
  } catch (err) {
    console.error('Nutrition plan generation failed:', err)
    return NextResponse.json(
      { error: 'Voedingsplan generatie mislukt. Probeer opnieuw.' },
      { status: 500 }
    )
  }
}
