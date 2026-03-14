import { createServerSupabaseClient } from '@/lib/supabase-server';
import { createRoom } from '@/lib/daily';
import { videoSessionSchema } from '@/lib/validation';
import { NextRequest, NextResponse } from 'next/server';

interface CreateSessionRequest {
  client_id: string;
  scheduled_at: string;
  duration_minutes?: number;
}

interface VideoSession {
  id: string;
  client_id: string;
  daily_room_url: string;
  scheduled_at: string;
  duration_minutes: number;
  status: string;
  notes: string | null;
  created_at: string;
}

/**
 * POST /api/video-sessions
 * Create a new video session with Daily.co room
 */
export async function POST(request: NextRequest) {
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

    // Verify user is a coach
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile || profile.role !== 'coach') {
      return NextResponse.json(
        { success: false, error: 'Geen toestemming' },
        { status: 403 }
      );
    }

    const body = (await request.json()) as CreateSessionRequest;

    // Validate request body with zod
    const validation = videoSessionSchema.safeParse({
      ...body,
      title: body.client_id, // title is required by schema
      duration_minutes: body.duration_minutes || 20,
    });

    if (!validation.success) {
      const errors = validation.error.flatten().fieldErrors;
      return NextResponse.json(
        {
          success: false,
          error: 'Validatiefout',
          fields: errors,
        },
        { status: 400 }
      );
    }

    const { client_id, scheduled_at, duration_minutes } = validation.data as any;

    // Verify client exists and belongs to this coach
    const { data: client, error: clientError } = await supabase
      .from('profiles')
      .select('id, name')
      .eq('id', client_id)
      .eq('coach_id', user.id)
      .eq('role', 'client')
      .single();

    if (clientError || !client) {
      return NextResponse.json(
        { success: false, error: 'Client niet gevonden' },
        { status: 404 }
      );
    }

    // Create Daily.co room
    const roomName = `session-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    const roomUrl = await createRoom(roomName);

    // Save to database
    const { data: session, error: insertError } = await supabase
      .from('video_sessions')
      .insert({
        client_id,
        daily_room_url: roomUrl,
        scheduled_at,
        duration_minutes,
        status: 'scheduled',
      })
      .select()
      .single();

    if (insertError) {
      console.error('Database insert error:', insertError);
      return NextResponse.json(
        { success: false, error: 'Fout bij opslaan van sessie' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          id: session.id,
          daily_room_url: session.daily_room_url,
          scheduled_at: session.scheduled_at,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { success: false, error: 'Serverfout' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/video-sessions
 * List video sessions, optionally filtered by client_id
 */
export async function GET(request: NextRequest) {
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

    // Get user role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { success: false, error: 'Profiel niet gevonden' },
        { status: 404 }
      );
    }

    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('client_id');

    let query = supabase.from('video_sessions').select('*');

    // Coaches see their clients' sessions
    if (profile.role === 'coach') {
      // Get clients for this coach
      const { data: clients, error: clientsError } = await supabase
        .from('profiles')
        .select('id')
        .eq('coach_id', user.id)
        .eq('role', 'client');

      if (clientsError || !clients || clients.length === 0) {
        return NextResponse.json({ success: true, data: [] });
      }

      const clientIds = clients.map((c) => c.id);
      query = query.in('client_id', clientIds);

      if (clientId) {
        query = query.eq('client_id', clientId);
      }
    } else if (profile.role === 'client') {
      // Clients only see their own sessions
      query = query.eq('client_id', user.id);
    } else {
      return NextResponse.json(
        { success: false, error: 'Geen toestemming' },
        { status: 403 }
      );
    }

    const { data: sessions, error: queryError } = await query.order(
      'scheduled_at',
      { ascending: true }
    );

    if (queryError) {
      console.error('Query error:', queryError);
      return NextResponse.json(
        { success: false, error: 'Fout bij ophalen van sessies' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data: sessions });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { success: false, error: 'Serverfout' },
      { status: 500 }
    );
  }
}
