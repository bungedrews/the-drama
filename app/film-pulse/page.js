'use client';

import { useEffect, useMemo, useState } from 'react';
import { getSupabaseClient, ensureAttendee } from '@/lib/supabase';
import { EVENT_ID } from '@/lib/constants';

export default function FilmPulse() {
  const [attendeeId, setAttendeeId] = useState(null);
  const [picked, setPicked] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [ratings, setRatings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const supabase = useMemo(() => getSupabaseClient(), []);

  useEffect(() => {
    ensureAttendee(EVENT_ID).then(setAttendeeId).catch((e) => setError(e.message));
  }, []);

  async function fetchRatings() {
    const { data, error: fetchError } = await supabase
      .from('pulse_ratings')
      .select('rating')
      .eq('event_id', EVENT_ID);
    if (!fetchError) setRatings(data || []);
  }

  useEffect(() => {
    if (!submitted) return;
    fetchRatings();

    const channel = supabase
      .channel('pulse-ratings-live')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'pulse_ratings', filter: `event_id=eq.${EVENT_ID}` },
        () => fetchRatings()
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submitted]);

  async function handleSubmit() {
    if (!picked || !attendeeId) return;
    setLoading(true);
    setError(null);
    const { error: insertError } = await supabase.from('pulse_ratings').insert({
      event_id: EVENT_ID,
      attendee_id: attendeeId,
      rating: picked,
    });
    setLoading(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }
    setSubmitted(true);
  }

  const average = ratings.length
    ? (ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length).toFixed(1)
    : '—';

  const distribution = useMemo(() => {
    const counts = {};
    for (let i = 1; i <= 10; i++) counts[i] = 0;
    ratings.forEach((r) => { counts[r.rating] = (counts[r.rating] || 0) + 1; });
    const max = Math.max(1, ...Object.values(counts));
    return { counts, max };
  }, [ratings]);

  return (
    <div className="screen" style={{ background: '#050615' }}>
      <div className="screen-inner">
        <div className="label">FILM PULSE CHECK — LIVE</div>

        <div style={{ marginTop: 12, fontSize: 23, fontWeight: 700 }}>
          Rate the film from 1 to 10
        </div>

        {!submitted && (
          <div style={{ marginTop: 6, fontSize: 12.5, color: 'rgba(243,238,230,0.55)' }}>
            Tap a number, then submit. Results update live for the whole group.
          </div>
        )}

        {!submitted && (
          <>
            <div
              style={{
                marginTop: 22,
                display: 'grid',
                gridTemplateColumns: 'repeat(5, 1fr)',
                gap: 8,
              }}
            >
              {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                <div
                  key={n}
                  onClick={() => setPicked(n)}
                  style={{
                    aspectRatio: '1',
                    border: picked === n ? '1px solid #FD513B' : '1px solid #232850',
                    background: picked === n ? '#FD513B' : '#0e1030',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 15,
                    color: picked === n ? '#f3eee6' : 'rgba(243,238,230,0.6)',
                    cursor: 'pointer',
                  }}
                >
                  {n}
                </div>
              ))}
            </div>

            <button
              disabled={!picked || loading}
              onClick={handleSubmit}
              style={{ marginTop: 18 }}
            >
              {loading ? 'SUBMITTING…' : 'SUBMIT RATING'}
            </button>

            {error && (
              <div style={{ marginTop: 12, fontSize: 12, color: '#ff8a78' }}>{error}</div>
            )}
          </>
        )}

        {submitted && (
          <div style={{ marginTop: 26, borderTop: '1px solid #232850', paddingTop: 22 }}>
            <div className="label">RATING</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 10 }}>
              <div style={{ fontFamily: "'Pinyon Script', cursive", fontSize: 58, lineHeight: 1 }}>
                {average}
              </div>
              <div style={{ fontSize: 13, color: 'rgba(243,238,230,0.5)' }}>/ 10</div>
            </div>
            <div style={{ marginTop: 6, fontSize: 12, color: 'rgba(243,238,230,0.45)' }}>
              based on {ratings.length} rating{ratings.length === 1 ? '' : 's'} so far
            </div>

            <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 7 }}>
              {Array.from({ length: 10 }, (_, i) => 10 - i).map((n) => (
                <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 18, fontSize: 10, color: 'rgba(243,238,230,0.4)' }}>{n}</div>
                  <div style={{ flex: 1, height: 6, background: '#151839', overflow: 'hidden' }}>
                    <div
                      style={{
                        width: `${(distribution.counts[n] / distribution.max) * 100}%`,
                        height: '100%',
                        background: '#FD513B',
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: 24, marginBottom: 24, fontSize: 11, color: 'rgba(243,238,230,0.4)' }}>
              Wait until everyone has submitted their rating before going NEXT.
            </div>
          </div>
        )}

        <div style={{ flex: 1 }} />

        {submitted && (
          <a href="/character-match" className="btn" style={{ textAlign: 'center', display: 'block' }}>
            NEXT — CHARACTER MATCH
          </a>
        )}
      </div>
    </div>
  );
}
