'use client';

import { useEffect, useMemo, useState } from 'react';
import { getSupabaseClient } from '@/lib/supabase';
import { EVENT_ID } from '@/lib/constants';
import { confessionScenarios } from '@/lib/questions';

export default function Results() {
  const supabase = useMemo(() => getSupabaseClient(), []);
  const [pulseRatings, setPulseRatings] = useState([]);
  const [confessionVotes, setConfessionVotes] = useState([]);
  const [matchResponses, setMatchResponses] = useState([]);

  async function fetchAll() {
    const [pulse, confessions, match] = await Promise.all([
      supabase.from('pulse_ratings').select('rating').eq('event_id', EVENT_ID),
      supabase
        .from('confession_votes')
        .select('scenario_id, vote')
        .in('scenario_id', confessionScenarios.map((s) => s.id)),
      supabase.from('character_match_responses').select('question_id, answer'),
    ]);
    setPulseRatings(pulse.data || []);
    setConfessionVotes(confessions.data || []);
    setMatchResponses(match.data || []);
  }

  useEffect(() => {
    fetchAll();
    const channel = supabase
      .channel('results-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pulse_ratings' }, fetchAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'confession_votes' }, fetchAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'character_match_responses' }, fetchAll)
      .subscribe();
    return () => supabase.removeChannel(channel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pulseAverage = pulseRatings.length
    ? (pulseRatings.reduce((s, r) => s + r.rating, 0) / pulseRatings.length).toFixed(1)
    : '—';

  // Most-contested confession: the scenario with the most even green/yellow/red split.
  const mostContested = useMemo(() => {
    let best = null;
    confessionScenarios.forEach((scenario) => {
      const votes = confessionVotes.filter((v) => v.scenario_id === scenario.id);
      if (!votes.length) return;
      const counts = { green: 0, yellow: 0, red: 0 };
      votes.forEach((v) => { counts[v.vote] = (counts[v.vote] || 0) + 1; });
      const total = votes.length;
      const spread = Math.max(counts.green, counts.yellow, counts.red) / total;
      if (!best || spread < best.spread) best = { scenario, counts, total, spread };
    });
    return best;
  }, [confessionVotes]);

  const answerCounts = useMemo(() => {
    const counts = {};
    matchResponses.forEach((r) => { counts[r.answer] = (counts[r.answer] || 0) + 1; });
    return counts;
  }, [matchResponses]);

  return (
    <div className="screen" style={{ background: '#050615' }}>
      <div style={{ width: '100%', maxWidth: 1280, boxSizing: 'border-box', padding: '56px 48px 80px' }}>
        <div className="eyebrow">The Drama · 2026 · Meetup Results</div>
        <div style={{ marginTop: 10, fontFamily: "'Pinyon Script', cursive", fontSize: 48 }}>
          What the room thinks
        </div>
        <div style={{ marginTop: 10, fontSize: 13, color: 'rgba(243,238,230,0.55)', fontStyle: 'italic' }}>
          Live results — updates as people finish the activities.
        </div>

        <div
          style={{
            marginTop: 36,
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 22,
          }}
        >
          <div className="card" style={{ minHeight: 180 }}>
            <div className="eyebrow" style={{ color: '#c23a27' }}>Film Pulse Check</div>
            <div style={{ fontFamily: "'Pinyon Script', cursive", fontSize: 48, marginTop: 10 }}>
              {pulseAverage}
            </div>
            <div style={{ fontSize: 11, color: '#8a7362', marginTop: 4, fontStyle: 'italic' }}>
              average rating out of 10 · {pulseRatings.length} votes
            </div>
          </div>

          <div className="card" style={{ minHeight: 180 }}>
            <div className="eyebrow" style={{ color: '#c23a27' }}>Character Match</div>
            <div style={{ marginTop: 10, fontSize: 13, color: '#5c4c40' }}>
              {Object.keys(answerCounts).length === 0 && 'No responses yet.'}
              {Object.entries(answerCounts).map(([answer, count]) => (
                <div key={answer} style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                  <span>Option {answer.toUpperCase()}</span>
                  <span>{count}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="card" style={{ minHeight: 180 }}>
            <div className="eyebrow" style={{ color: '#c23a27' }}>Most contested confession</div>
            {mostContested ? (
              <>
                <div style={{ fontSize: 15, fontWeight: 600, marginTop: 10, lineHeight: 1.4 }}>
                  "{mostContested.scenario.text}"
                </div>
                <div style={{ fontSize: 10.5, color: '#8a7362', marginTop: 10 }}>
                  {Math.round((mostContested.counts.green / mostContested.total) * 100)}% green ·{' '}
                  {Math.round((mostContested.counts.yellow / mostContested.total) * 100)}% yellow ·{' '}
                  {Math.round((mostContested.counts.red / mostContested.total) * 100)}% red
                </div>
              </>
            ) : (
              <div style={{ marginTop: 10, fontSize: 13, color: '#8a7362' }}>No votes yet.</div>
            )}
          </div>
        </div>

        <div style={{ marginTop: 52, fontSize: 11, color: 'rgba(243,238,230,0.4)' }}>
          The Deep Dive, The Discourse, the photo wall and the souvenir gallery are curated
          manually and added here closer to the event — ask Claude to wire those up once the
          format for each is settled.
        </div>
      </div>
    </div>
  );
}
