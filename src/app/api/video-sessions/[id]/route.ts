import { createServerSupabaseClient } from '@/lib/supabase-server';
import { createAdminClient } from '@/lib/supabase-admin';
import { NextRequest, NextResponse } from 'next/server';

interface GetSessionParams {
  params: Promise<{ id: string }>;
}

interface PatchSessionParams {
  params: Promise<{ id: string }>;
}

interface UpdateSessionRequest {
  notes?: string;
  status?: 'scheduled' | 'completed' | 'cancelled';
}

/**
 * GET /api/video-sessions/[id]
 * Get a specific video session
 */
export async function GET(request: NextRequest, { params }: GetSessionParams) {
  try {
    const supabase = await createServerSupabaseClient();

    // Verify user is authenticated
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Niet geauthenticeerd' },
        { status: 401 }
      );
    }

    const { id } = await params;

    // Use admin client to bypass RLS for data queries
    let adminDb;
    try {
      adminDb = createAdminClient();
    } catch {
      adminDb = supabase;
    }

    // Get the session
    const { data: session, error: sessionError } = await adminDb
      .from('video_sessions')
      .select('*')
      .eq('id', id)
      .single();

    if (sessionError || !session) {
      return NextResponse.json(
        { success: false, error: 'Sessie niet gevonden' },
        { status: 404 }
      );
    }

    // Verify user has access to this session
    const { data: profile, error: profileError } = await adminDb
      .from('profiles')
      .select('role, coach_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { success: false, error: 'Profiel niet gevonden' },
        { status: 404 }
      );
    }

    // Check access permissions
    let hasAccess = false;

    if (profile.role === 'coach') {
      // Coach can access sessions for their clients
      const { data: client } = await adminDb
        .from('profiles')
        .select('id')
        .eq('id', session.client_id)
        .eq('coach_id', user.id)
        .single();

      hasAccess = !!client;
    } else if (profile.role === 'client') {
      // Client can only access their own sessions
      hasAccess = session.client_id === user.id;
    }

    if (!hasAccess) {
      return NextResponse.json(
        { success: false, error: 'Geen toestemming' },
        { status: 403 }
      );
    }

    return NextResponse.json({ success: true, data: session });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { success: false, error: 'Serverfout' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/video-sessions/[id]
 * Update a video session (notes, status)
 */
export async function PATCH(
  request: NextRequest,
  { params }: PatchSessionParams
) {
  try {
    const supabase = await createServerSupabaseClient();

    // Verify user is authenticated
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Niet geauthenticeerd' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const body = (await request.json()) as UpdateSessionRequest;

    // Use admin client to bypass RLS for data queries
    let adminDb;
    try {
      adminDb = createAdminClient();
    } catch {
      adminDb = supabase;
    }

    // Get the session first
    const { data: session, error: sessionError } = await adminDb
      .from('video_sessions')
      .select('*')
      .eq('id', id)
      .single();

    if (sessionError || !session) {
      return NextResponse.json(
        { success: false, error: 'Sessie niet gevonden' },
        { status: 404 }
      );
    }

    // Verify user has access to this session
    const { data: profile, error: profileError } = await adminDb
      .from('profiles')
      .select('role, coach_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { success: false, error: 'Profiel niet gevonden' },
        { status: 404 }
      );
    }

    // Only coaches can update notes
    if (profile.role !== 'coach') {
      return NextResponse.json(
        { success: false, error: 'Geen toestemming' },
        { status: 403 }
      );
    }

    // Verify coach has access to this session
    const { data: client } = await adminDb
      .from('profiles')
      .select('id')
      .eq('id', session.client_id)
      .eq('coach_id', user.id)
      .single();

    if (!client) {
      return NextResponse.json(
        { success: false, error: 'Geen toestemming' },
        { status: 403 }
      );
    }

    // Prepare update data
    const updateData: Record<string, unknown> = {};

    if (body.notes !== undefined) {
      updateData.notes = body.notes;
    }

    if (body.status !== undefined) {
      updateData.status = body.status;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { success: false, error: 'Geen updategegevens opgegeven' },
        { status: 400 }
      );
    }

    // Update the session
    const { data: updatedSession, error: updateError } = await adminDb
      .from('video_sessions')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Database update error:', updateError);
      return NextResponse.json(
        { success: false, error: 'Fout bij opslaan van gegevens' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data: updatedSession });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { success: false, error: 'Serverfout' },
      { status: 500 }
    );
  }
}
