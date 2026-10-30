import { createClient } from '@supabase/supabase-js';

let client = null;

export function getSupabaseClient() {
  if (client) return client;
  client = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
  return client;
}

// Ensures the current browser has an anonymous session and an `attendees`
// row, and returns that attendee's id. Caches the id in localStorage so
// repeat visits (next screen, page refresh) reuse the same attendee.
export async function ensureAttendee(eventId) {
  const supabase = getSupabaseClient();
  const cached = typeof window !== 'undefined' ? localStorage.getItem('attendee_id') : null;
  if (cached) {
    // Make sure the cached attendee still exists in THIS database
    // (stale ids from older projects/tests would break foreign keys).
    const { data: existing } = await supabase
      .from('attendees')
      .select('id')
      .eq('id', cached)
      .maybeSingle();
    if (existing) return cached;
    localStorage.removeItem('attendee_id');
  }

  let { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData?.session) {
    const { data, error } = await supabase.auth.signInAnonymously();
    if (error) throw error;
    sessionData = data;
  }

  const userId = sessionData.session.user.id;

  const { data: attendee, error: attendeeError } = await supabase
    .from('attendees')
    .insert({ event_id: eventId, user_id: userId })
    .select()
    .single();

  if (attendeeError) throw attendeeError;

  localStorage.setItem('attendee_id', attendee.id);
  return attendee.id;
}
