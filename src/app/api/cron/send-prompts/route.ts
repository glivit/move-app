import { createAdminClient } from '@/lib/supabase-admin'
import { sendPushToUsers } from '@/lib/push-server'
import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('Authorization')
    const cronSecret = process.env.CRON_SECRET

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const supabase = createAdminClient()

    // Get current day of week (0 = Sunday, 6 = Saturday)
    const now = new Date();
    const currentDayOfWeek = now.getDay();
    const currentHour = now.getHours();

    // Query active prompts that should be sent today
    const { data: prompts, error: promptError } = await supabase
      .from('prompts')
      .select('id, send_time, is_active')
      .eq('send_day', currentDayOfWeek)
      .eq('is_active', true);

    if (promptError) {
      console.error('Error fetching prompts:', promptError);
      return NextResponse.json(
        { error: 'Failed to fetch prompts' },
        { status: 500 }
      );
    }

    // Filter prompts by hour
    const promptsToSend = prompts.filter((prompt) => {
      const [hour] = prompt.send_time.split(':').map(Number);
      return hour === currentHour;
    });

    if (promptsToSend.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No prompts to send at this hour',
        count: 0,
      });
    }

    // Get all active clients
    const { data: clients, error: clientError } = await supabase
      .from('profiles')
      .select('id')
      .eq('role', 'client')

    if (clientError) {
      console.error('Error fetching clients:', clientError);
      return NextResponse.json(
        { error: 'Failed to fetch clients' },
        { status: 500 }
      );
    }

    if (!clients || clients.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No active clients',
        count: 0,
      });
    }

    // Create prompt_response entries for each prompt and client
    const responsesToCreate = [];

    for (const prompt of promptsToSend) {
      for (const client of clients) {
        responsesToCreate.push({
          prompt_id: prompt.id,
          client_id: client.id,
          response: '',
          mood_score: null,
          energy_score: null,
          sleep_score: null,
          coach_seen: false,
        });
      }
    }

    if (responsesToCreate.length > 0) {
      const { error: insertError } = await supabase
        .from('prompt_responses')
        .insert(responsesToCreate);

      if (insertError) {
        console.error('Error creating prompt responses:', insertError);
        return NextResponse.json(
          { error: 'Failed to create prompt responses' },
          { status: 500 }
        );
      }

      // Send push notifications to all clients (fire & forget)
      const clientIds = clients.map((c) => c.id)
      sendPushToUsers(clientIds, {
        title: 'Vraag van je coach',
        body: 'Er staat een nieuwe vraag voor je klaar',
        url: '/client/prompts',
      }).catch((err) => console.error('Push send error:', err))
    }

    return NextResponse.json({
      success: true,
      message: `Created ${responsesToCreate.length} prompt responses`,
      count: responsesToCreate.length,
      promptsCount: promptsToSend.length,
      clientsCount: clients.length,
    });
  } catch (error) {
    console.error('Unexpected error in send-prompts cron:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
