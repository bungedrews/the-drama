'use client';

import { useEffect, useMemo, useState } from 'react';
import { getSupabaseClient, ensureAttendee } from '@/lib/supabase';
import { EVENT_ID } from '@/lib/constants';
import { confessionScenarios as scenarios } from '@/lib/questions';

const FLAGS = [
  { id: 'green', label: 'Green flag', dot: '#4fbf8a', border: 'rgba(79,191,138,0.4)', bg: 'rgba(79,191,138,0.10)' },
  { id: 'yellow', label: 'Yellow flag', dot: '#e8b84a', border: '#232850', bg: '#0e1030' },
  { id: 'red', label: 'Red flag', dot: '#FD513B', border: '#232850', bg: '#0e1030' },
];

export default function Confessions() {
  const [attendeeId, setAttendeeId] = useState(null);
  const [step, setStep] = useState(0);
  const [voted, setVoted] = useState(false);
  const [votes, setVotes] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [done, setDone] = useState(false);

  const supabase = useMemo(() => getSupabaseClient(), []);
  const scenario = scenarios[step];

  useEffect(() => {
    ensureAttendee(EVENT_ID).then(setAttendeeId).catch((e) => setError(e.message));
  }, []);

  async function fetchVotes() {
    const { data, error: fetchError } = await supabase
      .from('confession_votes')
      .select('vote')
      .eq('scenario_id', scenario.id);
    if (!fetchError) setVotes(data || []);
  }

  useEffect(() => {
    if (!voted) return;
    fetchVotes();

    const channel = supabase
      .channel(`confession-votes-${scenario.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'confession_votes', filter: `scenario_id=eq.${scenario.id}` },
        () => fetchVotes()
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voted, scenario.id]);

  async function handleVote(flagId) {
    if (!attendeeId || voted) return;
    setSaving(true);
    setError(null);

    const { error: insertError } = await supabase.from('confession_votes').insert({
      scenario_id: scenario.id,
      attendee_id: attendeeId,
      vote: flagId,
    });

    setSaving(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }
    setVoted(true);
  }

  function nextScenario() {
    if (step + 1 < scenarios.length) {
      setStep(step + 1);
      setVoted(false);
      setVotes([]);
    } else {
      setDone(true);
    }
  }

  const total = votes.length || 1;
  const pct = (id) => Math.round((votes.filter((v) => v.vote === id).length / total) * 100);

  return (
    <div className="screen" style={{ background: '#050615' }}>
      <div className="screen-inner">
        {!done && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div className="label">CONFESSIONS &amp; RED FLAGS — LIVE</div>
              <div style={{ fontSize: 11, color: 'rgba(243,238,230,0.4)' }}>
                {step + 1} / {scenarios.length}
              </div>
            </div>

            <div style={{ marginTop: 22, padding: 20, border: '1px solid #232850', background: '#0e1030' }}>
              <div style={{ fontFamily: "'Bebas Neue', sans-serif", color: '#FD513B', fontSize: 11, letterSpacing: 1, marginBottom: 10 }}>
                SCENARIO
              </div>
              <div style={{ fontSize: 17, fontWeight: 600, lineHeight: 1.45 }}>{scenario.text}</div>
            </div>

            {!voted && (
              <>
                <div style={{ marginTop: 20, fontSize: 12, color: 'rgba(243,238,230,0.55)' }}>
                  How bad is it?
                </div>
                <div style={{ marginTop: 12, display: 'flex', gap: 10 }}>
                  {FLAGS.map((f) => (
                    <div
                      key={f.id}
                      onClick={() => handleVote(f.id)}
                      style={{
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 8,
                        padding: '16px 0',
                        border: `1px solid ${f.border}`,
                        background: f.bg,
                        cursor: saving ? 'default' : 'pointer',
                        opacity: saving ? 0.6 : 1,
                      }}
                    >
                      <div style={{ width: 20, height: 20, borderRadius: '50%', background: f.dot }} />
                      <div style={{ fontSize: 12, color: 'rgba(243,238,230,0.8)' }}>{f.label}</div>
                    </div>
                  ))}
                </div>
                {error && <div style={{ marginTop: 12, fontSize: 12, color: '#ff8a78' }}>{error}</div>}
              </>
            )}

            {voted && (
              <div style={{ marginTop: 28, borderTop: '1px solid #232850', paddingTop: 22 }}>
                <div className="label">THE ROOM SO FAR</div>
                <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {FLAGS.map((f) => (
                    <div key={f.id}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, marginBottom: 5 }}>
                        <span>{f.label.replace(' flag', '')}</span>
                        <span style={{ color: 'rgba(243,238,230,0.5)' }}>{pct(f.id)}%</span>
                      </div>
                      <div style={{ height: 6, background: '#151839', overflow: 'hidden' }}>
                        <div style={{ width: `${pct(f.id)}%`, height: '100%', background: f.dot }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ flex: 1 }} />

            {voted ? (
              <button onClick={nextScenario}>
                {step + 1 < scenarios.length ? 'NEXT SCENARIO' : 'FINISH'}
              </button>
            ) : (
              <div style={{ fontSize: 11, color: 'rgba(243,238,230,0.4)' }}>
                Most-contested scenario of the night gets flagged on the results page.
              </div>
            )}
          </>
        )}

        {done && (
          <>
            <div style={{ marginTop: 40, fontSize: 20, fontWeight: 600, textAlign: 'center' }}>
              That's every scenario — see how the room voted at the event.
            </div>
            <div style={{ flex: 1 }} />
            <a href="/results" className="btn" style={{ textAlign: 'center', display: 'block' }}>
              SEE EVENT RESULTS
            </a>
          </>
        )}
      </div>
    </div>
  );
}
