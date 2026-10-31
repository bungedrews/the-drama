'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { getSupabaseClient, ensureAttendee } from '@/lib/supabase';
import { EVENT_ID } from '@/lib/constants';
import { confessionScenarios as scenarios } from '@/lib/questions';

const FLAGS = [
  { id: 'green', label: 'Green flag', dot: '#4fbf8a', border: 'rgba(79,191,138,0.4)', bg: '#0e1030' },
  { id: 'yellow', label: 'Yellow flag', dot: '#e8b84a', border: '#232850', bg: '#0e1030' },
  { id: 'red', label: 'Red flag', dot: '#FD513B', border: '#232850', bg: '#0e1030' },
];

// Neutral on purpose: floating flags never reveal what anyone voted.
function FlagIcon({ size }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M6 21V3" stroke="#f3eee6" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M6 4.5c3-1.6 5 1.6 8 0s3.5-.6 4 0v8c-.5-.6-1-1.6-4 0s-5-1.6-8 0z" fill="#f3eee6" />
    </svg>
  );
}

export default function Confessions() {
  const [attendeeId, setAttendeeId] = useState(null);
  const [step, setStep] = useState(0);
  const [picked, setPicked] = useState(null);
  const [voted, setVoted] = useState(false);
  const [votes, setVotes] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [done, setDone] = useState(false);
  const [floaters, setFloaters] = useState([]);

  const supabase = useMemo(() => getSupabaseClient(), []);
  const scenario = scenarios[step];
  const votedRef = useRef(false);
  const idRef = useRef(0);

  useEffect(() => {
    votedRef.current = voted;
  }, [voted]);

  useEffect(() => {
    ensureAttendee(EVENT_ID).then(setAttendeeId).catch((e) => setError(e.message));
  }, []);

  function spawnFlag() {
    const id = idRef.current++;
    const flag = {
      id,
      left: 6 + Math.random() * 84,           // % from the left
      size: 22 + Math.random() * 14,          // px
      duration: 3.8 + Math.random() * 2.2,    // s
      sway: (Math.random() - 0.5) * 70,       // px
    };
    setFloaters((f) => [...f, flag]);
    setTimeout(() => {
      setFloaters((f) => f.filter((x) => x.id !== id));
    }, flag.duration * 1000 + 200);
  }

  async function fetchVotes() {
    const { data, error: fetchError } = await supabase
      .from('confession_votes')
      .select('vote')
      .eq('scenario_id', scenario.id);
    if (!fetchError) setVotes(data || []);
  }

  // If this attendee already voted on this scenario (e.g. page reload), jump to results.
  useEffect(() => {
    if (!attendeeId) return;
    supabase
      .from('confession_votes')
      .select('vote')
      .eq('scenario_id', scenario.id)
      .eq('attendee_id', attendeeId)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setPicked(data.vote);
          setVoted(true);
        }
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attendeeId, scenario.id]);

  // Live: every new vote from anyone sends up a flag; results refresh once you've voted.
  useEffect(() => {
    const channel = supabase
      .channel(`confession-votes-${scenario.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'confession_votes', filter: `scenario_id=eq.${scenario.id}` },
        () => {
          spawnFlag();
          if (votedRef.current) fetchVotes();
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scenario.id]);

  useEffect(() => {
    if (voted) fetchVotes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voted, scenario.id]);

  async function handleSubmit() {
    if (!picked || !attendeeId || voted) return;
    setSaving(true);
    setError(null);

    const { error: insertError } = await supabase.from('confession_votes').insert({
      scenario_id: scenario.id,
      attendee_id: attendeeId,
      vote: picked,
    });

    setSaving(false);
    // 23505 = already voted on this scenario: just show the results
    if (insertError && insertError.code !== '23505') {
      setError(insertError.message);
      return;
    }
    setVoted(true);
  }

  function nextScenario() {
    if (step + 1 < scenarios.length) {
      setStep(step + 1);
      setPicked(null);
      setVoted(false);
      setVotes([]);
    } else {
      setDone(true);
    }
  }

  const total = votes.length || 1;
  const count = (id) => votes.filter((v) => v.vote === id).length;
  const pct = (id) => Math.round((count(id) / total) * 100);

  return (
    <div className="screen" style={{ background: '#050615' }}>
      {/* floating flags: rise from the bottom of the screen to the top */}
      <div className="flag-layer" aria-hidden="true">
        {floaters.map((f) => (
          <div
            key={f.id}
            className="flag-floater"
            style={{
              left: `${f.left}%`,
              animationDuration: `${f.duration}s`,
              '--sway': `${f.sway}px`,
            }}
          >
            <FlagIcon size={f.size} />
          </div>
        ))}
      </div>

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

            <div style={{ marginTop: 20, fontSize: 12, color: 'rgba(243,238,230,0.55)' }}>
              {voted ? '' : 'How bad is it? Pick one, then submit.'}
            </div>

            <div style={{ marginTop: 12, display: 'flex', gap: 10 }}>
              {FLAGS.map((f) => {
                const selected = picked === f.id;
                return (
                  <div
                    key={f.id}
                    onClick={() => !voted && setPicked(f.id)}
                    style={{
                      flex: 1,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 8,
                      padding: '16px 0',
                      border: selected ? `1px solid ${f.dot}` : `1px solid ${f.border}`,
                      background: selected ? 'rgba(253,81,59,0.10)' : f.bg,
                      boxShadow: selected ? `0 0 0 1px ${f.dot}` : 'none',
                      cursor: voted ? 'default' : 'pointer',
                      opacity: voted && !selected ? 0.4 : 1,
                      transition: 'opacity 0.2s',
                    }}
                  >
                    <div style={{ width: 20, height: 20, borderRadius: '50%', background: f.dot }} />
                    <div style={{ fontSize: 12, color: 'rgba(243,238,230,0.8)' }}>{f.label}</div>
                  </div>
                );
              })}
            </div>

            {error && <div style={{ marginTop: 12, fontSize: 12, color: '#ff8a78' }}>{error}</div>}

            {!voted && (
              <>
                <button
                  disabled={!picked || saving || !attendeeId}
                  onClick={handleSubmit}
                  style={{ marginTop: 18 }}
                >
                  {saving ? 'SUBMITTING…' : 'SUBMIT FLAG'}
                </button>
                <div style={{ marginTop: 14, fontSize: 11, color: 'rgba(243,238,230,0.4)' }}>
                  Flags rise as people vote. You'll see how the room voted once you submit.
                </div>
              </>
            )}

            {voted && (
              <div style={{ marginTop: 26, borderTop: '1px solid #232850', paddingTop: 22 }}>
                <div className="label">THE ROOM SO FAR · {votes.length} VOTE{votes.length === 1 ? '' : 'S'}</div>
                <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {FLAGS.map((f) => (
                    <div key={f.id}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, marginBottom: 5 }}>
                        <span>{f.label.replace(' flag', '')}</span>
                        <span style={{ color: 'rgba(243,238,230,0.5)' }}>{pct(f.id)}%</span>
                      </div>
                      <div style={{ height: 6, background: '#151839', overflow: 'hidden' }}>
                        <div style={{ width: `${pct(f.id)}%`, height: '100%', background: f.dot, transition: 'width 0.4s' }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ flex: 1 }} />

            {voted && (
              <button onClick={nextScenario} style={{ marginTop: 20 }}>
                {step + 1 < scenarios.length ? 'NEXT SCENARIO' : 'FINISH'}
              </button>
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
