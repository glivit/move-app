/**
 * Daily.co API client
 * Handles room creation, deletion, and retrieval for video calls
 */

const DAILY_API_KEY = process.env.DAILY_API_KEY;
const API_BASE = 'https://api.daily.co/v1';

interface DailyRoom {
  name: string;
  url: string;
  created_at: string;
  privacy?: string;
  properties?: {
    exp?: number;
    max_participants?: number;
  };
}

interface DailyRoomResponse {
  data: DailyRoom;
  errors?: string[];
}

interface DailyRoomListResponse {
  data: {
    rooms: DailyRoom[];
  };
  errors?: string[];
}

/**
 * Create a new Daily.co room
 * @param name - Room name (should be unique)
 * @returns Room URL or mock data if API key not set
 */
export async function createRoom(name: string): Promise<string> {
  if (!DAILY_API_KEY) {
    console.warn('DAILY_API_KEY not set, returning mock room URL');
    return `https://moove-coaching.daily.co/${name}`;
  }

  try {
    const response = await fetch(`${API_BASE}/rooms`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${DAILY_API_KEY}`,
      },
      body: JSON.stringify({
        name,
        privacy: 'private',
        properties: {
          exp: Math.floor(Date.now() / 1000) + 86400, // 24 hour expiry
          max_participants: 2,
        },
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Daily.co API error:', response.status, errorData);
      throw new Error(`Failed to create room: ${response.statusText}`);
    }

    const data: DailyRoomResponse = await response.json();

    if (data.errors && data.errors.length > 0) {
      throw new Error(`Daily.co error: ${data.errors.join(', ')}`);
    }

    return data.data.url;
  } catch (error) {
    console.error('Error creating Daily.co room:', error);
    // Fallback to mock URL if API fails
    return `https://moove-coaching.daily.co/${name}`;
  }
}

/**
 * Get details for a specific room
 * @param name - Room name
 * @returns Room details or null if not found
 */
export async function getRoom(name: string): Promise<DailyRoom | null> {
  if (!DAILY_API_KEY) {
    return null;
  }

  try {
    const response = await fetch(`${API_BASE}/rooms/${name}`, {
      headers: {
        Authorization: `Bearer ${DAILY_API_KEY}`,
      },
    });

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      throw new Error(`Failed to get room: ${response.statusText}`);
    }

    const data: DailyRoomResponse = await response.json();

    if (data.errors && data.errors.length > 0) {
      return null;
    }

    return data.data;
  } catch (error) {
    console.error('Error getting Daily.co room:', error);
    return null;
  }
}

/**
 * Delete a Daily.co room
 * @param name - Room name
 * @returns true if successful, false otherwise
 */
export async function deleteRoom(name: string): Promise<boolean> {
  if (!DAILY_API_KEY) {
    console.warn('DAILY_API_KEY not set, skipping room deletion');
    return true;
  }

  try {
    const response = await fetch(`${API_BASE}/rooms/${name}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${DAILY_API_KEY}`,
      },
    });

    if (response.status === 404) {
      // Room doesn't exist, treat as success
      return true;
    }

    if (!response.ok) {
      throw new Error(`Failed to delete room: ${response.statusText}`);
    }

    return true;
  } catch (error) {
    console.error('Error deleting Daily.co room:', error);
    return false;
  }
}
