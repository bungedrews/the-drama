'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { getSupabaseClient, ensureAttendee } from '@/lib/supabase';
import { EVENT_ID } from '@/lib/constants';
import { confessionScenarios } from '@/lib/questions';

export default function Results() {
  const supabase = useMemo(() => getSupabaseClient(), []);
  const [pulseRatings, setPulseRatings] = useState([]);
  const [confessionVotes, setConfessionVotes] = useState([]);
  const [matchResponses, setMatchResponses] = useState([]);
  const [matchTab, setMatchTab] = useState('you');
  const [myId, setMyId] = useState(null);

  useEffect(() => {
    try { setMyId(localStorage.getItem('attendee_id')); } catch (e) {}
  }, []);

  async function fetchAll() {
    const [pulse, confessions, match] = await Promise.all([
      supabase.from('pulse_ratings').select('rating').eq('event_id', EVENT_ID),
      supabase
        .from('confession_votes')
        .select('scenario_id, vote')
        .in('scenario_id', confessionScenarios.map((s) => s.id)),
      supabase.from('character_match_responses').select('attendee_id, question_id, answer, created_at'),
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

  // ---- Film Pulse ----
  const pulseAverage = pulseRatings.length
    ? (pulseRatings.reduce((s, r) => s + r.rating, 0) / pulseRatings.length).toFixed(1)
    : '—';

  const pulseBars = useMemo(() => {
    const counts = Array.from({ length: 10 }, () => 0);
    pulseRatings.forEach((r) => { counts[r.rating - 1] += 1; });
    return counts.map((value, i) => ({ key: i + 1, label: String(i + 1), value }));
  }, [pulseRatings]);

  // ---- Character Match: score the answers into the four personalities ----
  // keep only each person's latest answer per question (so retaking the quiz doesn't double count)
  const latestAnswers = useMemo(() => {
    const byKey = new Map();
    [...matchResponses]
      .sort((x, y) => String(x.created_at || '').localeCompare(String(y.created_at || '')))
      .forEach((r) => byKey.set(`${r.attendee_id}|${r.question_id}`, r));
    return [...byKey.values()];
  }, [matchResponses]);

  const buildBars = (rows) => {
    const counts = { RI: 0, ES: 0, PP: 0, DO: 0 };
    rows.forEach((r) => {
      const type = ANSWER_TYPES[r.question_id]?.[r.answer];
      if (type) counts[type] += 1;
    });
    const total = TYPE_ORDER.reduce((sum, c) => sum + counts[c], 0);
    return TYPE_ORDER.map((code) => ({
      key: code,
      code,
      value: counts[code],
      pct: total ? Math.round((counts[code] / total) * 100) : 0,
      ...PERSONALITIES[code],
    }));
  };

  // highest score wins; a tie goes to the personality of the answer to question 9
  const pickDominant = (bars, tiebreak) => {
    const max = Math.max(...bars.map((b) => b.value));
    if (max === 0) return null;
    const tied = bars.filter((b) => b.value === max);
    return (tiebreak && tied.find((b) => b.code === tiebreak)) || tied[0];
  };

  const myRows = useMemo(
    () => latestAnswers.filter((r) => myId && r.attendee_id === myId),
    [latestAnswers, myId]
  );
  const groupBars = useMemo(() => buildBars(latestAnswers), [latestAnswers]);
  const myBars = useMemo(() => buildBars(myRows), [myRows]);

  const q9Answer = myRows.find((r) => r.question_id === 'q9')?.answer;
  const myTop = pickDominant(myBars, ANSWER_TYPES.q9[q9Answer]);
  const groupTop = pickDominant(groupBars);

  const matchBars = matchTab === 'you' ? myBars : groupBars;
  const matchTop = matchTab === 'you' ? myTop : groupTop;

  // ---- Confessions: most even green/yellow/red split ----
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

  const pct = (n, total) => (total ? Math.round((n / total) * 100) : 0);

  const FLAG_ROWS = [
    { id: 'green', label: 'Green', color: '#4fbf8a' },
    { id: 'yellow', label: 'Yellow', color: '#e8b84a' },
    { id: 'red', label: 'Red', color: RED },
  ];

  return (
    <div className="screen" style={{ background: '#050615' }}>
      <div style={{ width: '100%', maxWidth: 1280, boxSizing: 'border-box', padding: '48px 48px 90px' }}>
        <div className="eyebrow">The Drama · 2026 · Meetup Results</div>
        <div style={{ marginTop: 10, fontFamily: "'Pinyon Script', cursive", fontSize: 56, color: TEXT }}>
          What the room thinks
        </div>
        <div style={{ marginTop: 8, fontSize: 13, color: MUTED }}>
          Live results — updates as people finish the activities.
        </div>

        <div
          style={{
            marginTop: 44,
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: 56,
          }}
        >
          {/* Character Match */}
          <Section title="CHARACTER MATCH" style={{ gridColumn: '1 / -1' }}>
            <div style={{ display: 'flex', gap: 22, marginTop: 12 }}>
              {[
                { id: 'you', label: 'YOU' },
                { id: 'group', label: 'THE GROUP' },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setMatchTab(t.id)}
                  style={{
                    width: 'auto',
                    padding: '6px 0',
                    border: 'none',
                    borderBottom: matchTab === t.id ? `2px solid ${RED}` : '2px solid transparent',
                    background: 'transparent',
                    color: matchTab === t.id ? RED : MUTED,
                    fontSize: 16,
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {!matchTop ? (
              matchTab === 'you' ? (
                <div style={{ marginTop: 26, fontSize: 14, color: MUTED, lineHeight: 1.5 }}>
                  No answers from you yet.{' '}
                  <a href="/character-match" style={{ color: RED, textDecoration: 'underline' }}>
                    Take the Character Match
                  </a>{' '}
                  to see yours here.
                </div>
              ) : (
                <div style={{ marginTop: 26, fontSize: 14, color: MUTED }}>No responses yet.</div>
              )
            ) : (
              <>
                <div style={{ maxWidth: 640 }}>
                  <div style={{ fontSize: 22, fontWeight: 700, marginTop: 20, color: TEXT }}>
                    {matchTab === 'you' ? 'Your personality mix' : 'The room’s personality mix'}
                  </div>
                  <div style={{ fontSize: 12, color: MUTED, marginTop: 6 }}>
                    Hover over a bar (or tap it) to read about that personality.
                  </div>
                  <PersonalityChart bars={matchBars} topCode={matchTop.code} />
                  <div style={{ fontSize: 13, color: MUTED, marginTop: 16 }}>
                    {matchTab === 'you' ? 'You are most like' : 'The room is most like'}{' '}
                    <span style={{ color: TEXT, fontWeight: 700 }}>{matchTop.name}</span> — {matchTop.pct}%
                  </div>
                </div>
                <PersonalityDetail p={matchTop} mode={matchTab} />
              </>
            )}
          </Section>

          {/* Film Pulse */}
          <Section title="FILM PULSE CHECK">
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginTop: 4 }}>
              <div
                style={{
                  fontFamily: "'Bebas Neue', sans-serif",
                  fontSize: 120,
                  lineHeight: 1,
                  color: RED,
                  textShadow: '0 0 40px rgba(253,81,59,0.45)',
                }}
              >
                {pulseAverage}
              </div>
              <div style={{ fontSize: 16, color: MUTED }}>/ 10</div>
            </div>
            <BarChart items={pulseBars} maxPx={90} labelSize={11} />
            <div style={{ fontSize: 12, color: MUTED, marginTop: 16 }}>
              average rating · {pulseRatings.length} vote{pulseRatings.length === 1 ? '' : 's'}
            </div>
          </Section>

          {/* Confessions */}
          <Section title="MOST CONTESTED CONFESSION">
            {mostContested ? (
              <>
                <div style={{ fontSize: 22, fontWeight: 700, marginTop: 10, lineHeight: 1.35, color: TEXT }}>
                  "{mostContested.scenario.text}"
                </div>

                <div style={{ display: 'flex', height: 22, marginTop: 30, boxShadow: '0 0 28px rgba(253,81,59,0.25)' }}>
                  {FLAG_ROWS.map((f) => (
                    <div
                      key={f.id}
                      style={{
                        width: `${pct(mostContested.counts[f.id], mostContested.total)}%`,
                        background: f.color,
                        transition: 'width 0.5s',
                      }}
                    />
                  ))}
                </div>

                <div style={{ display: 'flex', gap: 22, marginTop: 18, flexWrap: 'wrap' }}>
                  {FLAG_ROWS.map((f) => (
                    <div key={f.id}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, color: SOFT }}>
                        <span style={{ width: 9, height: 9, borderRadius: '50%', background: f.color, display: 'inline-block' }} />
                        {f.label}
                      </div>
                      <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 40, lineHeight: 1.1, color: TEXT }}>
                        {pct(mostContested.counts[f.id], mostContested.total)}%
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{ fontSize: 12, color: MUTED, marginTop: 14 }}>
                  {mostContested.total} votes
                </div>
              </>
            ) : (
              <div style={{ marginTop: 14, fontSize: 14, color: MUTED }}>No votes yet.</div>
            )}
          </Section>
        </div>

        <div id="recap" style={{ marginTop: 90, scrollMarginTop: 72 }}>
          <RecapCard
            pulseAverage={pulseAverage}
            pulseCount={pulseRatings.length}
            groupBars={groupBars}
            groupTop={groupTop}
            myTop={myTop}
            mostContested={mostContested}
          />
        </div>

        <div id="photos" style={{ marginTop: 90, scrollMarginTop: 72 }}>
          <PhotoWall />
        </div>

        <div id="takeaways" style={{ marginTop: 90, scrollMarginTop: 72 }}>
          <Takeaways />
        </div>

        <div style={{ marginTop: 80, fontSize: 11, color: 'rgba(243,238,230,0.35)' }}>
          The Deep Dive and The Discourse highlights are added manually closer to the event.
        </div>
      </div>
    </div>
  );
}