'use client';

import { useEffect, useMemo, useState } from 'react';
import { getSupabaseClient, ensureAttendee } from '@/lib/supabase';
import { EVENT_ID } from '@/lib/constants';
import { characterMatchQuestions as questions } from '@/lib/questions';

export default function CharacterMatch() {
  const [attendeeId, setAttendeeId] = useState(null);
  const [step, setStep] = useState(0);
  const [picked, setPicked] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [done, setDone] = useState(false);

  const supabase = useMemo(() => getSupabaseClient(), []);
  const question = questions[step];
  const progress = ((step + (picked ? 1 : 0)) / questions.length) * 100;

  useEffect(() => {
    ensureAttendee(EVENT_ID).then(setAttendeeId).catch((e) => setError(e.message));
  }, []);

  async function handleNext() {
    if (!picked || !attendeeId) return;
    setSaving(true);
    setError(null);

    const { error: insertError } = await supabase.from('character_match_responses').insert({
      attendee_id: attendeeId,
      question_id: question.id,
      answer: picked,
    });

    setSaving(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }

    setPicked(null);
    if (step + 1 < questions.length) {
      setStep(step + 1);
    } else {
      setDone(true);
    }
  }

  return (
    <div className="screen" style={{ background: '#050615' }}>
      <div className="screen-inner">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="label">CHARACTER MATCH</div>
          <div style={{ fontSize: 11, color: 'rgba(243,238,230,0.4)' }}>
            Q{Math.min(step + 1, questions.length)} / {questions.length}
          </div>
        </div>

        <div className="progress-track" style={{ marginTop: 16 }}>
          <div className="progress-fill" style={{ width: `${progress}%` }} />
        </div>

        {!done && (
          <>
            <div style={{ marginTop: 30, fontSize: 12, fontWeight: 700, letterSpacing: 1.2, color: '#FD513B' }}>
              {question.title}
            </div>

            <div style={{ marginTop: 8, fontSize: 21, fontWeight: 600, lineHeight: 1.4 }}>
              {question.text}
            </div>

            <div style={{ marginTop: 26, marginBottom: 36, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {question.options.map((opt) => (
                <div
                  key={opt.id}
                  onClick={() => setPicked(opt.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 14,
                    padding: '14px 16px',
                    border: picked === opt.id ? '1px solid #FD513B' : '1px solid #232850',
                    background: picked === opt.id ? 'rgba(253,81,59,0.12)' : '#0e1030',
                    cursor: 'pointer',
                  }}
                >
                  <span style={{ fontFamily: "'Bebas Neue', sans-serif", color: '#FD513B', fontSize: 16 }}>
                    {opt.id.toUpperCase()}
                  </span>
                  <span style={{ marginfontSize: 13.5, color: 'rgba(243,238,230,0.85)' }}>{opt.text}</span>
                </div>
              ))}
            </div>

            {error && <div style={{ marginBottom: 24, marginTop: 12, fontSize: 12, color: '#ff8a78' }}>{error}</div>}

            <div style={{ flex: 1 }} />

           

            <button disabled={!picked || saving} onClick={handleNext}>
              {saving ? 'SAVING…' : step + 1 < questions.length ? 'NEXT QUESTION' : 'FINISH'}
            </button>
          </>
        )}

        {done && (
          <>
            <div style={{ marginTop: 40, fontSize: 20, fontWeight: 600, textAlign: 'center' }}>
              That's everything — your persona will be revealed on your souvenir card.
            </div>
            <div style={{ flex: 1 }} />
            <a href="/confessions" className="btn" style={{ textAlign: 'center', display: 'block' }}>
              NEXT — CONFESSIONS &amp; RED FLAGS
            </a>
          </>
        )}
      </div>
    </div>
  );
}
