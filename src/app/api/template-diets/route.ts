import { createServerSupabaseClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'
import { TEMPLATE_DIETS, getTemplateDiet } from '@/lib/template-diets'

// Force dynamic — never let Vercel/Next.js statically cache this route
export const dynamic = 'force-dynamic'

/**
 * GET /api/template-diets
 * List all available template diets (for coach selection UI)
 */
export async function GET() {
  // Return summaries (without full meal details for the list view)
  const summaries = TEMPLATE_DIETS.map(({ id, title, description, calories_target, protein_g, carbs_g, fat_g, tags, meals }) => ({
    id,
    title,
    description,
    calories_target,
    protein_g,
    carbs_g,
    fat_g,
    tags,
    mealsCount: meals.length,
  }))

  const response = NextResponse.json(summaries)
  response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate')
  return response
}

/**
 * POST /api/template-diets
 * Assign a template diet to a client
 * Body: { templateId: string, clientId: string }
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Verify coach role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'coach') {
      return NextResponse.json({ error: 'Alleen coaches kunnen templates toewijzen' }, { status: 403 })
    }

    const { templateId, clientId } = await request.json()
    if (!templateId || !clientId) {
      return NextResponse.json({ error: 'templateId en clientId zijn verplicht' }, { status: 400 })
    }

    const template = getTemplateDiet(templateId)
    if (!template) {
      return NextResponse.json({ error: 'Template niet gevonden' }, { status: 404 })
    }

    // Get client name
    const { data: clientProfile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', clientId)
      .single()

    // Deactivate existing active plans
    await supabase
      .from('nutrition_plans')
      .update({ is_active: false })
      .eq('client_id', clientId)
      .eq('is_active', true)

    // Insert new plan from template
    const { data: plan, error: insertError } = await supabase
      .from('nutrition_plans')
      .insert({
        client_id: clientId,
        title: template.title,
        is_active: true,
        calories_target: template.calories_target,
        protein_g: template.protein_g,
        carbs_g: template.carbs_g,
        fat_g: template.fat_g,
        meals: template.meals,
        guidelines: template.description,
      })
      .select()
      .single()

    if (insertError) {
      console.error('Template diet assign error:', insertError)
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      plan,
      message: `${template.title} toegewezen aan ${clientProfile?.full_name || 'cliënt'}`,
    })
  } catch (err) {
    console.error('Template diet error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
