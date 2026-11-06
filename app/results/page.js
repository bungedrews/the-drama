'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { getSupabaseClient, ensureAttendee } from '@/lib/supabase';
import { EVENT_ID } from '@/lib/constants';
import { confessionScenarios } from '@/lib/questions';

const TEXT = '#f3eee6';
const MUTED = 'rgba(243,238,230,0.5)';
const SOFT = 'rgba(243,238,230,0.75)';
const LINE = '#232850';
const RED = '#FD513B';
const BAR_IDLE = '#2b3070';

// ====================== PERSONALITY TYPES ======================
// Put the pictures in your project's  public/characters/  folder as ri.jpg, es.jpg, pp.jpg, do.jpg.
// (A missing picture is fine: that bar just stays plain red.)
const EYEBROW = { fontFamily: "'Bebas Neue', sans-serif", fontStyle: 'normal', fontSize: 17, letterSpacing: 2, color: SOFT };

const TYPE_ORDER = ['RI', 'ES', 'PP', 'DO'];

const PERSONALITIES = {
  RI: {
    name: 'The Relational Idealist',
    character: 'Charlie',
    image: '/characters/ri.png',
    focus: '50% 25%',
    short: 'Loving, loyal, emotionally sensitive, and relationship-oriented. Wants to do the right thing but can be influenced by love and other people’s opinions.',
    tagline: 'The heart wants what the heart believes.',
    psychology: 'You love deeply, value loyalty, and believe in the goodness of people. But when love conflicts with your principles, your emotions can complicate your judgment.',
    strengths: ['Empathy', 'Devotion', 'Loyalty', 'Sensitivity'],
    shadow: ['Idealization', 'People-pleasing', 'Indecision', 'External validation'],
    connectionTitle: 'Your connection to Charlie',
    connection: 'Like Charlie, you may struggle to reconcile your love for someone with information that challenges your perception of them.',
    question: 'When love and morality collide, which one wins?',
  },
  ES: {
    name: 'The Evolving Self',
    character: 'Emma',
    image: '/characters/es.png',
    focus: '50% 30%',
    short: 'Adaptable, spontaneous, and complex. Embraces reinvention, personal growth, and change but may struggle with vulnerability and revealing parts of their past.',
    tagline: 'You are not every version of yourself you’ve ever been.',
    psychology: 'You’re adaptable, complex, and constantly evolving. You embrace reinvention but may protect parts of your story out of fear of being misunderstood.',
    strengths: ['Resilience', 'Adaptability', 'Openness', 'Growth'],
    shadow: ['Secrecy', 'Impulsivity', 'Avoidance', 'Fear of rejection'],
    connectionTitle: 'Your connection to Emma',
    connection: 'Like Emma, you understand the tension between who you were, who you’ve become, and how others perceive you.',
    question: 'How much of your past does someone need to know to truly know you?',
  },
  PP: {
    name: 'The Principled Perfectionist',
    character: 'Rachel',
    image: '/characters/pp.png',
    focus: '50% 35%',
    short: 'Confident, direct, and guided by strong values. Has high standards and clear boundaries but can sometimes be rigid or judgmental.',
    tagline: 'Your standards are not up for negotiation.',
    psychology: 'You value integrity, accountability, and clear boundaries. You’re confident in your convictions, but your high expectations can sometimes leave little room for human complexity.',
    strengths: ['Conviction', 'Honesty', 'Boundaries', 'Accountability'],
    shadow: ['Rigidity', 'Judgment', 'Perfectionism', 'Difficulty forgiving'],
    connectionTitle: 'Your connection to Rachel',
    connection: 'Like Rachel, you may find it difficult to separate someone’s actions from your perception of their character.',
    question: 'At what point do high standards become unfair expectations?',
  },
  DO: {
    name: 'The Detached Observer',
    character: null,
    image: '/characters/do.png',
    focus: '60% 20%',
    short: 'Analytical, curious, and independent. Prefers understanding people’s motivations before making judgments but can sometimes overthink or emotionally detach.',
    tagline: 'You notice what everyone else misses.',
    psychology: 'You’re curious, analytical, and fascinated by human behavior. You prefer understanding motivations over making quick judgments, but sometimes analysis creates emotional distance.',
    strengths: ['Insight', 'Curiosity', 'Independence', 'Objectivity'],
    shadow: ['Overthinking', 'Detachment', 'Indecision', 'Intellectualization'],
    connectionTitle: 'Your connection to The Drama',
    connection: 'You may be more interested in understanding Emma and Charlie than deciding who’s right or wrong.',
    question: 'Can you understand someone’s behavior without justifying it?',
  },
};

// Scoring cheat sheet: which personality each answer gives 1 point to.
const ANSWER_TYPES = {
  q1: { a: 'RI', b: 'ES', c: 'PP', d: 'DO' },
  q2: { a: 'DO', b: 'RI', c: 'ES', d: 'PP' },
  q3: { a: 'PP', b: 'DO', c: 'RI', d: 'ES' },
  q4: { a: 'ES', b: 'PP', c: 'DO', d: 'RI' },
  q5: { a: 'RI', b: 'DO', c: 'ES', d: 'PP' },
  q6: { a: 'PP', b: 'ES', c: 'RI', d: 'DO' },
  q7: { a: 'DO', b: 'PP', c: 'ES', d: 'RI' },
  q8: { a: 'ES', b: 'RI', c: 'DO', d: 'PP' },
  q9: { a: 'RI', b: 'PP', c: 'DO', d: 'ES' },
};

// Vertical bar chart. Default: tallest bar red, the rest deep blue.
// photoTop: every bar is red and the tallest one is filled with its character's photo.
function BarChart({ items, maxPx = 150, labelSize = 12, photoTop = false }) {
  const max = Math.max(1, ...items.map((i) => i.value));
  const top = Math.max(...items.map((i) => i.value));
  const topIdx = items.findIndex((i) => i.value === top);
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, marginTop: 22 }}>
      {items.map((item, idx) => {
        const isTop = photoTop ? top > 0 && idx === topIdx : top > 0 && item.value === top;
        const background = photoTop
          ? isTop && item.image
            ? `url(${item.image}) center 25% / cover no-repeat, ${RED}`
            : RED
          : isTop
            ? RED
            : BAR_IDLE;
        return (
          <div key={item.key} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ fontSize: labelSize, color: isTop ? TEXT : MUTED, fontWeight: isTop ? 700 : 400, height: 18 }}>
              {item.value}
            </div>
            <div
              style={{
                width: '100%',
                height: Math.max(item.value > 0 ? 6 : 2, Math.round((item.value / max) * maxPx)),
                background,
                outline: photoTop && isTop ? `2px solid ${TEXT}` : 'none',
                transition: 'height 0.5s',
              }}
            />
            <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 15, letterSpacing: 1, color: isTop ? RED : MUTED, marginTop: 8 }}>
              {item.label}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Bar chart of the four personalities. Hover (or tap) a bar for a pop-over about that type.
// Every bar is red; the winning bar is filled with its character's picture.
function PersonalityChart({ bars, topCode, maxPx = 180 }) {
  const [hover, setHover] = useState(null);
  const [pinned, setPinned] = useState(null);
  const shown = hover || pinned;
  const max = Math.max(1, ...bars.map((b) => b.value));
  const shownIdx = bars.findIndex((b) => b.code === shown);
  const shownBar = shownIdx >= 0 ? bars[shownIdx] : null;

  // keep the pop-over inside the chart: left half anchors left, right half anchors right
  const slot = (i) => `calc(${i} * (25% + 4px))`;
  const popStyle =
    shownIdx < 2
      ? { left: slot(shownIdx) }
      : { right: `calc(${3 - shownIdx} * (25% + 4px))` };

  return (
    <div style={{ position: 'relative', marginTop: 24 }}>
      {shownBar && (
        <div
          style={{
            position: 'absolute',
            bottom: '100%',
            marginBottom: 6,
            width: 300,
            maxWidth: '100%',
            boxSizing: 'border-box',
            padding: '16px 18px',
            background: '#0e1030',
            border: `1px solid ${RED}`,
            boxShadow: '0 14px 34px rgba(0,0,0,0.65)',
            zIndex: 20,
            pointerEvents: 'none',
            ...popStyle,
          }}
        >
          <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 24, color: RED, lineHeight: 1.1 }}>
            {shownBar.name.toUpperCase()}
          </div>
          {shownBar.character && (
            <div style={{ fontSize: 11, color: MUTED, marginTop: 3 }}>inspired by {shownBar.character}</div>
          )}
          <div style={{ fontSize: 13, color: SOFT, lineHeight: 1.5, marginTop: 10 }}>{shownBar.short}</div>
          <div style={{ fontSize: 12, color: MUTED, marginTop: 10, lineHeight: 1.5 }}>
            <span style={{ color: TEXT }}>Strengths:</span> {shownBar.strengths.join(' · ')}
          </div>
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16 }}>
        {bars.map((b) => {
          const isTop = b.value > 0 && b.value === max; // ties: every top bar shows its photo
          const h = b.value > 0 ? Math.max(8, Math.round((b.value / max) * maxPx)) : 4; // winner is always the tallest, so its photo has room
          return (
            <div
              key={b.code}
              onMouseEnter={() => setHover(b.code)}
              onMouseLeave={() => setHover(null)}
              onClick={() => setPinned((p) => (p === b.code ? null : b.code))}
              style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer' }}
            >
              <div style={{ height: 26, fontSize: 18, fontWeight: 700, color: isTop ? TEXT : SOFT }}>
                {b.pct}%
              </div>
              {/* photo is INSIDE the bar; the winner is clear, the others are tinted red */}
              <div
                style={{
                  width: '100%',
                  height: h,
                  backgroundImage: isTop && b.image ? `url(${b.image})` : 'none',
                  backgroundColor: RED,
                  backgroundSize: 'cover',
                  backgroundPosition: b.focus || 'center 30%',
                  backgroundRepeat: 'no-repeat',
                  outline: isTop ? `2px solid ${TEXT}` : 'none',
                  opacity: shown && shown !== b.code ? 0.5 : 1,
                  transition: 'height 0.5s, opacity 0.15s',
                }}
              />
            </div>
          );
        })}
      </div>

      {/* labels live in their own row, so long names never push a bar out of line */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
        {bars.map((b) => {
          const isTop = b.value > 0 && b.value === max;
          return (
            <div
              key={b.code}
              onMouseEnter={() => setHover(b.code)}
              onMouseLeave={() => setHover(null)}
              onClick={() => setPinned((p) => (p === b.code ? null : b.code))}
              style={{ flex: 1, minWidth: 0, textAlign: 'center', cursor: 'pointer' }}
            >
              <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 24, letterSpacing: 1, color: isTop ? RED : TEXT, marginTop: 8 }}>
                {b.code}
              </div>
              <div style={{ fontSize: 11, color: MUTED, lineHeight: 1.3 }}>{b.name}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Chips({ label, items }) {
  return (
    <div style={{ marginTop: 18 }}>
      <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 18, letterSpacing: 1, color: RED }}>{label}</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
        {items.map((t) => (
          <span key={t} style={{ border: `1px solid ${LINE}`, padding: '5px 12px', fontSize: 13, color: SOFT }}>
            {t}
          </span>
        ))}
      </div>
    </div>
  );
}

// Full write-up of the dominant personality (shown under the chart).
function PersonalityDetail({ p, mode }) {
  const you = mode === 'you';
  return (
    <div style={{ marginTop: 34, borderTop: `1px solid ${LINE}`, paddingTop: 24, maxWidth: 760 }}>
      <div className="label" style={{ fontSize: 15 }}>
        {you ? 'YOUR DOMINANT PERSONALITY' : 'THE ROOM’S DOMINANT PERSONALITY'}
      </div>
      <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 56, lineHeight: 1.05, color: RED, marginTop: 8 }}>
        {p.name.toUpperCase()}
      </div>
      <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 32, color: TEXT, marginTop: 6 }}>
        {p.tagline}
      </div>

      <div style={{ fontSize: 15, lineHeight: 1.65, color: SOFT, marginTop: 18 }}>
        {you ? p.psychology : p.short}
      </div>

      <Chips label={you ? 'YOUR STRENGTHS' : 'STRENGTHS'} items={p.strengths} />
      <Chips label={you ? 'YOUR SHADOW' : 'SHADOW'} items={p.shadow} />

      {you && (
        <div style={{ marginTop: 22 }}>
          <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 18, letterSpacing: 1, color: RED }}>
            {p.connectionTitle.toUpperCase()}
          </div>
          <div style={{ fontSize: 15, lineHeight: 1.65, color: SOFT, marginTop: 8 }}>{p.connection}</div>
        </div>
      )}

      <div style={{ marginTop: 26, borderLeft: `3px solid ${RED}`, paddingLeft: 16 }}>
        <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 18, letterSpacing: 1, color: RED }}>
          {you ? 'YOUR CENTRAL QUESTION' : 'THE QUESTION FOR THE ROOM'}
        </div>
        <div style={{ fontSize: 20, fontWeight: 700, lineHeight: 1.4, color: TEXT, marginTop: 6 }}>{p.question}</div>
      </div>

      <div style={{ fontSize: 11, color: MUTED, marginTop: 22 }}>
        A fun personality quiz, not a scientific measure of personality.
      </div>
    </div>
  );
}

function Section({ title, children, style }) {
  return (
    <div style={{ borderTop: `1px solid ${LINE}`, paddingTop: 22, display: 'flex', flexDirection: 'column', ...style }}>
      <div className="label" style={{ fontSize: 15 }}>{title}</div>
      {children}
    </div>
  );
}

// ====================== SNAPS (photo wall) ======================
const BUCKET = 'event-photos';
const MAX_EDGE = 1600; // photos are shrunk before upload to keep storage small

const pillBtn = { width: 'auto', padding: '11px 18px', fontSize: 14 };

// Shrink + re-encode as JPEG in the browser (also fixes huge phone photos).
function resizeImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const scale = Math.min(1, MAX_EDGE / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      canvas.toBlob(
        (blob) => {
          URL.revokeObjectURL(url);
          blob ? resolve(blob) : reject(new Error('Could not process this photo'));
        },
        'image/jpeg',
        0.85
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Could not read this photo'));
    };
    img.src = url;
  });
}

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

// Stable little tilt per photo, between -5 and +5 degrees.
function tilt(id) {
  let h = 0;
  for (const c of String(id)) h = (h * 31 + c.charCodeAt(0)) | 0;
  return ((Math.abs(h) % 100) / 100) * 10 - 5;
}

function PhotoWall() {
  const supabase = useMemo(() => getSupabaseClient(), []);
  const fileInput = useRef(null);
  const [photos, setPhotos] = useState([]);
  const [status, setStatus] = useState(null); // upload / zip progress text
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [openIndex, setOpenIndex] = useState(null);

  async function fetchPhotos() {
    const { data } = await supabase
      .from('event_photos')
      .select('id, image_url, created_at')
      .eq('event_id', EVENT_ID)
      .order('created_at', { ascending: false });
    setPhotos(data || []);
  }

  useEffect(() => {
    fetchPhotos();
    const channel = supabase
      .channel('event-photos-live')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'event_photos', filter: `event_id=eq.${EVENT_ID}` },
        () => fetchPhotos()
      )
      .subscribe();
    return () => supabase.removeChannel(channel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // lightbox: keyboard + scroll lock
  useEffect(() => {
    if (openIndex === null) return;
    function onKey(e) {
      if (e.key === 'Escape') setOpenIndex(null);
      if (e.key === 'ArrowLeft') setOpenIndex((i) => Math.max(0, i - 1));
      if (e.key === 'ArrowRight') setOpenIndex((i) => Math.min(photos.length - 1, i + 1));
    }
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [openIndex, photos.length]);

  async function handleFiles(fileList) {
    const files = Array.from(fileList || []);
    if (!files.length) return;
    setBusy(true);
    setError(null);
    try {
      const attendeeId = await ensureAttendee(EVENT_ID);
      for (let i = 0; i < files.length; i++) {
        setStatus(`Uploading ${i + 1} of ${files.length}…`);
        const blob = await resizeImage(files[i]);
        const path = `${EVENT_ID}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;

        const { error: upError } = await supabase.storage
          .from(BUCKET)
          .upload(path, blob, { contentType: 'image/jpeg', cacheControl: '31536000' });
        if (upError) throw upError;

        const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
        const { error: insError } = await supabase.from('event_photos').insert({
          event_id: EVENT_ID,
          image_url: data.publicUrl,
          storage_path: path,
          attendee_id: attendeeId,
        });
        if (insError) throw insError;
      }
      await fetchPhotos();
    } catch (e) {
      setError(e.message || 'Upload failed');
    } finally {
      setBusy(false);
      setStatus(null);
      if (fileInput.current) fileInput.current.value = '';
    }
  }

  async function downloadOne(photo) {
    try {
      const res = await fetch(photo.image_url);
      triggerDownload(await res.blob(), `the-drama-snap-${photo.id.slice(0, 6)}.jpg`);
    } catch (e) {
      window.open(photo.image_url, '_blank');
    }
  }

  async function downloadAll() {
    if (!photos.length) return;
    setBusy(true);
    setError(null);
    try {
      const { default: JSZip } = await import('jszip');
      const zip = new JSZip();
      for (let i = 0; i < photos.length; i++) {
        setStatus(`Packing ${i + 1} of ${photos.length}…`);
        const res = await fetch(photos[i].image_url);
        zip.file(`the-drama-snap-${String(i + 1).padStart(3, '0')}.jpg`, await res.blob());
      }
      setStatus('Creating zip…');
      triggerDownload(await zip.generateAsync({ type: 'blob' }), 'the-drama-snaps.zip');
    } catch (e) {
      setError(e.message || 'Could not create the zip');
    } finally {
      setBusy(false);
      setStatus(null);
    }
  }

  const current = openIndex !== null ? photos[openIndex] : null;

  return (
    <section>
      <style>{`
        .polaroid { transition: transform .2s, box-shadow .2s; cursor: pointer; }
        .polaroid:hover { transform: rotate(0deg) scale(1.05) !important; z-index: 2; box-shadow: 0 14px 30px rgba(0,0,0,.6) !important; }
      `}</style>

      <div className="eyebrow" style={EYEBROW}>The Snaps</div>
      <div style={{ marginTop: 8, fontFamily: "'Bebas Neue', sans-serif", fontSize: 52, lineHeight: 1.05, letterSpacing: 1, color: RED }}>
        Snaps from the night
      </div>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', marginTop: 18 }}>
        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          multiple
          style={{ display: 'none' }}
          onChange={(e) => handleFiles(e.target.files)}
        />
        <button style={pillBtn} disabled={busy} onClick={() => fileInput.current?.click()}>
          + ADD SNAPS
        </button>
        <button
          style={{ ...pillBtn, borderColor: LINE, color: TEXT }}
          disabled={busy || photos.length === 0}
          onClick={downloadAll}
        >
          DOWNLOAD ALL{photos.length ? ` (${photos.length})` : ''}
        </button>
        {status && <span style={{ fontSize: 12, color: MUTED }}>{status}</span>}
      </div>
      {error && <div style={{ marginTop: 12, fontSize: 12, color: '#ff8a78' }}>{error}</div>}

      <div
        style={{
          marginTop: 30,
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)', // always 2 per row for a clear overview
          gap: 30,
          maxWidth: 760,
          padding: '8px 4px',
        }}
      >
        {photos.map((p, i) => (
          <div
            key={p.id}
            className="polaroid"
            onClick={() => setOpenIndex(i)}
            style={{
              background: '#f6f1e7',
              padding: '10px 10px 40px',
              boxShadow: '0 6px 16px rgba(0,0,0,0.55)',
              transform: `rotate(${tilt(p.id)}deg)`,
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={p.image_url}
              alt="Snap from the night"
              loading="lazy"
              style={{ width: '100%', aspectRatio: '1 / 1', objectFit: 'cover', display: 'block', background: '#e4dac7' }}
            />
          </div>
        ))}

        {photos.length === 0 &&
          [0, 1, 2, 3].map((n) => (
            <div
              key={n}
              style={{
                border: `1px dashed ${LINE}`,
                padding: '10px 10px 40px',
                transform: `rotate(${[-3, 2, -1.5, 3][n]}deg)`,
              }}
            >
              <div
                style={{
                  aspectRatio: '1 / 1',
                  border: `1px dashed ${LINE}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 12,
                  color: MUTED,
                }}
              >
                {n === 0 ? 'add the first snap' : ''}
              </div>
            </div>
          ))}
      </div>

      {/* lightbox: just the photo, ready to save */}
      {current && (
        <div
          onClick={() => setOpenIndex(null)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            background: 'rgba(5,6,21,0.95)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={current.image_url}
            alt="Snap from the night"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '94vw', maxHeight: '74vh', objectFit: 'contain', display: 'block' }}
          />
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ marginTop: 18, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}
          >
            <button style={{ ...pillBtn, borderColor: LINE }} disabled={openIndex === 0} onClick={() => setOpenIndex(openIndex - 1)}>
              ‹
            </button>
            <button style={pillBtn} onClick={() => downloadOne(current)}>SAVE PHOTO</button>
            <button
              style={{ ...pillBtn, borderColor: LINE }}
              disabled={openIndex === photos.length - 1}
              onClick={() => setOpenIndex(openIndex + 1)}
            >
              ›
            </button>
            <button style={{ ...pillBtn, borderColor: LINE }} onClick={() => setOpenIndex(null)}>CLOSE</button>
          </div>
          <div style={{ marginTop: 12, fontSize: 11, color: MUTED, textAlign: 'center' }}>
            On iPhone: press and hold the photo → Add to Photos.
          </div>
        </div>
      )}
    </section>
  );
}

// ====================== TAKEAWAYS ======================
const MAX = 280;

const fieldStyle = {
  width: '100%',
  boxSizing: 'border-box',
  background: '#0e1030',
  border: `1px solid ${LINE}`,
  color: TEXT,
  padding: '12px 14px',
  fontFamily: 'Helvetica, Arial, sans-serif',
  fontSize: 14,
  outline: 'none',
};

function Takeaways() {
  const supabase = useMemo(() => getSupabaseClient(), []);
  const [items, setItems] = useState([]);
  const [text, setText] = useState('');
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [sent, setSent] = useState(false);

  async function fetchItems() {
    const { data } = await supabase
      .from('takeaways')
      .select('id, text, author_name, from_host, created_at')
      .eq('event_id', EVENT_ID)
      .order('created_at', { ascending: true });
    setItems(data || []);
  }

  useEffect(() => {
    fetchItems();
    const channel = supabase
      .channel('takeaways-live')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'takeaways', filter: `event_id=eq.${EVENT_ID}` },
        () => fetchItems()
      )
      .subscribe();
    return () => supabase.removeChannel(channel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmit() {
    const clean = text.trim();
    if (!clean) return;
    setSaving(true);
    setError(null);
    const { error: insertError } = await supabase.from('takeaways').insert({
      event_id: EVENT_ID,
      text: clean,
      author_name: name.trim() || null,
      from_host: false,
    });
    setSaving(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }
    setText('');
    setSent(true);
    fetchItems();
  }

  const hostItems = items.filter((i) => i.from_host);
  const guestItems = items.filter((i) => !i.from_host).reverse(); // newest first

  return (
    <section>
      {/* from the hosts (only shown when the hosts have added some) */}
      {hostItems.length > 0 && (
        <div style={{ marginBottom: 64 }}>
          <div className="eyebrow" style={EYEBROW}>The Takeaways</div>
          <div style={{ marginTop: 8, fontFamily: "'Bebas Neue', sans-serif", fontSize: 52, lineHeight: 1.05, letterSpacing: 1, color: RED }}>
            What we're taking home
          </div>
      <div style={{ marginTop: 28, display: 'flex', flexDirection: 'column', gap: 22 }}>
        {hostItems.map((item, i) => (
          <div key={item.id} style={{ display: 'flex', gap: 18, alignItems: 'baseline' }}>
            <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 44, lineHeight: 1, color: RED, minWidth: 54 }}>
              {String(i + 1).padStart(2, '0')}
            </div>
            <div style={{ fontSize: 22, fontWeight: 700, lineHeight: 1.35, color: TEXT, maxWidth: 760 }}>
              {item.text}
            </div>
          </div>
        ))}
      </div>

        </div>
      )}

      <div className="eyebrow" style={EYEBROW}>Feedback</div>
      <div style={{ marginTop: 8, fontFamily: "'Bebas Neue', sans-serif", fontSize: 52, lineHeight: 1.05, letterSpacing: 1, color: RED }}>
        Give us feedback
      </div>

      {/* from the room */}
      <div>
        <div className="label" style={{ fontSize: 15 }}></div>
        <div style={{ marginTop: 6, fontSize: 13, color: MUTED }}>
          Leave us a comment: what did you like, what should we do differently next time? Or send us an Email or DM :)
        </div>

        <div style={{ marginTop: 18, maxWidth: 620, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <textarea
            value={text}
            maxLength={MAX}
            rows={3}
            placeholder="Your comment…"
            onChange={(e) => { setText(e.target.value); setSent(false); }}
            style={{ ...fieldStyle, resize: 'vertical' }}
          />
          <input
            value={name}
            maxLength={40}
            placeholder="Your name (optional)"
            onChange={(e) => setName(e.target.value)}
            style={fieldStyle}
          />
          <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
            <button
              disabled={!text.trim() || saving}
              onClick={handleSubmit}
              style={{ width: 'auto', padding: '11px 18px', fontSize: 14 }}
            >
              {saving ? 'SENDING…' : 'POST COMMENT'}
            </button>
            <span style={{ fontSize: 11, color: MUTED }}>{text.length} / {MAX}</span>
          </div>
          {error && <div style={{ fontSize: 12, color: '#ff8a78' }}>{error}</div>}
        </div>

        <div style={{ marginTop: 34, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 22 }}>
          {guestItems.map((item) => (
            <div key={item.id} style={{ borderLeft: `3px solid ${RED}`, paddingLeft: 14 }}>
              <div style={{ fontSize: 15, lineHeight: 1.5, color: SOFT, whiteSpace: 'pre-wrap' }}>{item.text}</div>
              <div style={{ marginTop: 6, fontSize: 11, color: MUTED }}>
                — {item.author_name || 'anonymous'}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ====================== RECAP HELPERS ======================
function wrapText(ctx, text, maxWidth) {
  const words = text.split(' ');
  const lines = [];
  let line = '';
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = w;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

// ====================== RECAP BUILDER (make your own shareable) ======================
// Guests start with a blank canvas and add the results they want with the + buttons.
const THEMES = {
  midnight: { label: 'Midnight', bg: '#050615', accent: '#FD513B', text: '#f3eee6', muted: 'rgba(243,238,230,0.5)', line: '#232850' },
  noir: { label: 'Noir', bg: '#000000', accent: '#f3eee6', text: '#f3eee6', muted: 'rgba(243,238,230,0.5)', line: '#2a2a2a' },
  flame: { label: 'Flame', bg: '#FD513B', accent: '#050615', text: '#050615', muted: 'rgba(5,6,21,0.65)', line: 'rgba(5,6,21,0.35)' },
};

const BLOCK_TYPES = {
  pulse: { label: 'Group film rating', h: 330 },
  matchYou: { label: 'My character match', h: 480 },
  matchGroup: { label: 'The room’s character match', h: 480 },
  confession: { label: 'Confessions & red flags', h: 560 },
  snaps: { label: 'Snaps from the night', h: 400 },
  poster: { label: 'Film poster', h: 700 },
  text: { label: 'My own words', h: 200 },
};
const CANVAS_TOP = 410;
const CANVAS_BOTTOM = 1880;
const CANVAS_ROOM = CANVAS_BOTTOM - CANVAS_TOP - 20;
const MAX_SNAPS = 5;
const POSTER_URL = '/poster.jpg'; // put the film poster at public/poster.jpg
// the snaps block grows to two rows when there are 4 or 5 pictures
const blockH = (type, snapCount = 0) => (type === 'snaps' && snapCount > 3 ? 600 : BLOCK_TYPES[type].h);

// fonts guests can pick for "my own words"
const TEXT_FONTS = {
  script: { label: 'Script', css: "'Pinyon Script', cursive", canvas: '"Pinyon Script"', size: 62, style: '', line: 76 },
  drama: { label: 'THE DRAMA', css: "'Bebas Neue', sans-serif", canvas: '"Bebas Neue"', size: 76, style: '', line: 80 },
  serif: { label: 'Serif', css: "'Cormorant Garamond', serif", canvas: '"Cormorant Garamond"', size: 60, style: 'italic ', line: 70 },
  classic: { label: 'Classic', css: "'EB Garamond', serif", canvas: '"EB Garamond"', size: 54, style: '', line: 68 },
  plain: { label: 'Plain', css: 'Helvetica, Arial, sans-serif', canvas: 'Helvetica, Arial, sans-serif', size: 46, style: 'bold ', line: 62 },
};

async function loadImg(url) {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    const obj = URL.createObjectURL(blob);
    return await new Promise((resolve) => {
      const im = new Image();
      im.onload = () => resolve(im);
      im.onerror = () => resolve(null);
      im.src = obj;
    });
  } catch (e) {
    return null;
  }
}

function drawCover(ctx, im, x, y, w, h, focus) {
  const [fx, fy] = String(focus || '50% 30%')
    .split(' ')
    .map((v) => parseFloat(v) / 100);
  const s = Math.max(w / im.width, h / im.height);
  const dw = im.width * s;
  const dh = im.height * s;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.drawImage(im, x + (w - dw) * (fx || 0.5), y + (h - dh) * (fy || 0.3), dw, dh);
  ctx.restore();
}

// Draws the 1080x1920 (Instagram story size) image from the chosen blocks.
async function drawRecap(canvas, d) {
  try {
    await Promise.all([
      document.fonts.load('170px "Bebas Neue"'),
      document.fonts.load('80px "Pinyon Script"'),
      document.fonts.load('bold 40px Helvetica'),
      document.fonts.load('italic 60px "Cormorant Garamond"'),
      document.fonts.load('54px "EB Garamond"'),
    ]);
  } catch (e) {}

  const T = THEMES[d.themeId] || THEMES.midnight;
  canvas.width = 1080;
  canvas.height = 1920;
  const ctx = canvas.getContext('2d');
  const cx = 540;
  const SANS = 'Helvetica, Arial, sans-serif';

  ctx.fillStyle = T.bg;
  ctx.fillRect(0, 0, 1080, 1920);
  ctx.textAlign = 'center';

  const rule = (y) => {
    ctx.strokeStyle = T.line;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(90, y);
    ctx.lineTo(990, y);
    ctx.stroke();
  };
  const heading = (t, y) => {
    ctx.fillStyle = T.accent;
    ctx.font = '48px "Bebas Neue"';
    ctx.fillText(t, cx, y);
  };

  // title (always there)
  ctx.fillStyle = T.accent;
  ctx.font = '170px "Bebas Neue"';
  ctx.fillText('THE DRAMA', cx, 190);
  ctx.fillStyle = T.text;
  ctx.font = '80px "Pinyon Script"';
  ctx.fillText('film club', cx, 275);
  ctx.fillStyle = T.muted;
  ctx.font = `30px ${SANS}`;
  ctx.fillText('Friday, November 6th 2026 · Hamburg', cx, 335);
  rule(395);

  // load every picture we need first
  const imgs = {};
  const wanted = [];
  [d.myBars, d.groupBars].forEach((bars) => {
    const max = Math.max(...bars.map((b) => b.value));
    bars.forEach((b) => { if (b.value > 0 && b.value === max && b.image) wanted.push(b.image); });
  });
  (d.snapUrls || []).forEach((u) => wanted.push(u));
  if ((d.blocks || []).includes('poster')) wanted.push(POSTER_URL);
  await Promise.all([...new Set(wanted)].map(async (u) => { imgs[u] = await loadImg(u); }));

  // ---- block painters (y = top of the block) ----
  const paintPulse = (y) => {
    heading('GROUP FILM RATING', y + 50);
    ctx.fillStyle = T.accent;
    ctx.font = '260px "Bebas Neue"';
    ctx.fillText(d.pulseAverage, cx, y + 255);
    ctx.fillStyle = T.muted;
    ctx.font = `32px ${SANS}`;
    ctx.fillText(`average rating out of 10 · ${d.pulseCount} vote${d.pulseCount === 1 ? '' : 's'}`, cx, y + 310);
  };

  const paintMatch = (y, bars, who) => {
    heading(`CHARACTER MATCH · ${who}`, y + 50);
    if (!bars.some((b) => b.value > 0)) {
      ctx.fillStyle = T.muted;
      ctx.font = `32px ${SANS}`;
      ctx.fillText('no answers yet', cx, y + 260);
      return;
    }
    const max = Math.max(...bars.map((b) => b.value));
    const base = y + 385;
    const bw = 150;
    const step = 210;
    const x0 = 150;
    bars.forEach((b, i) => {
      const x = x0 + i * step;
      const h = b.value > 0 ? Math.max(10, Math.round((b.value / max) * 250)) : 4;
      const isTop = b.value > 0 && b.value === max;
      ctx.fillStyle = T.accent;
      ctx.fillRect(x, base - h, bw, h);
      if (isTop && imgs[b.image]) drawCover(ctx, imgs[b.image], x, base - h, bw, h, b.focus);
      if (isTop) {
        ctx.strokeStyle = T.text;
        ctx.lineWidth = 4;
        ctx.strokeRect(x, base - h, bw, h);
      }
      ctx.fillStyle = T.text;
      ctx.font = `bold 34px ${SANS}`;
      ctx.fillText(`${b.pct}%`, x + bw / 2, base - h - 14);
      ctx.fillStyle = isTop ? T.text : T.muted;
      ctx.font = '46px "Bebas Neue"';
      ctx.fillText(b.code, x + bw / 2, base + 54);
    });
    const tops = bars.filter((b) => b.value === max);
    ctx.fillStyle = T.muted;
    ctx.font = `32px ${SANS}`;
    ctx.fillText(
      tops.length > 1
        ? `equally like ${tops.map((b) => b.code).join(' · ')}`
        : `${who === 'YOU' ? 'you are' : 'the room is'} most like ${tops[0].name}`,
      cx,
      y + 472
    );
  };

  const paintConfession = (y) => {
    heading('CONFESSIONS & RED FLAGS', y + 50);
    const list = (d.confs || []).filter((c) => c.total > 0);
    if (!list.length) {
      ctx.fillStyle = T.muted;
      ctx.font = `32px ${SANS}`;
      ctx.fillText('no votes yet', cx, y + 240);
      return;
    }
    const flags = [
      { id: 'green', label: 'Green', color: '#4fbf8a' },
      { id: 'yellow', label: 'Yellow', color: '#e8b84a' },
      { id: 'red', label: 'Red', color: '#d8321b' },
    ];
    list.slice(0, 3).forEach((c, i) => {
      const top = y + 105 + i * 150;
      ctx.fillStyle = T.text;
      ctx.font = `bold 25px ${SANS}`;
      let lines = wrapText(ctx, `"${c.text}"`, 880);
      if (lines.length > 2) lines = [lines[0], lines[1].replace(/\s*\S*$/, '') + '…"'];
      lines.forEach((l, k) => ctx.fillText(l, cx, top + k * 32));
      const by = top + 32 * lines.length + 8;
      const best = Math.max(c.green, c.yellow, c.red);
      let bx = 90;
      flags.forEach((f) => {
        const w = (c[f.id] / c.total) * 900;
        ctx.globalAlpha = c[f.id] === best ? 1 : 0.3;
        ctx.fillStyle = f.color;
        ctx.fillRect(bx, by, w, 14);
        bx += w;
      });
      ctx.globalAlpha = 1;
      flags.forEach((f, k) => {
        const win = c[f.id] === best;
        const x = 270 + k * 270;
        ctx.globalAlpha = win ? 1 : 0.4;
        ctx.fillStyle = f.color;
        ctx.beginPath();
        ctx.arc(x - 70, by + 36, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = T.text;
        ctx.textAlign = 'left';
        ctx.font = `${win ? 'bold ' : ''}24px ${SANS}`;
        ctx.fillText(`${f.label} ${Math.round((c[f.id] / c.total) * 100)}%`, x - 56, by + 44);
        ctx.textAlign = 'center';
        ctx.globalAlpha = 1;
      });
    });
  };

  const paintSnaps = (y) => {
    heading('SNAPS FROM THE NIGHT', y + 50);
    const list = (d.snapUrls || []).filter((u) => imgs[u]).slice(0, MAX_SNAPS);
    if (!list.length) {
      ctx.fillStyle = T.muted;
      ctx.font = `32px ${SANS}`;
      ctx.fillText('no snaps yet', cx, y + 220);
      return;
    }
    const big = list.length <= 3;
    const w = big ? 260 : 210;
    const ph = big ? 300 : 244; // polaroid height
    const gap = 30;
    const rows = big ? [list] : [list.slice(0, Math.ceil(list.length / 2)), list.slice(Math.ceil(list.length / 2))];
    const angles = [-0.05, 0.035, -0.03, 0.04, -0.04];
    let n = 0;
    rows.forEach((row, r) => {
      const total = row.length * w + (row.length - 1) * gap;
      row.forEach((u, i) => {
        const x = (1080 - total) / 2 + i * (w + gap);
        const top = y + 95 + r * (ph + 14);
        ctx.save();
        ctx.translate(x + w / 2, top + ph / 2);
        ctx.rotate(angles[n++ % angles.length]);
        ctx.shadowColor = 'rgba(0,0,0,0.45)';
        ctx.shadowBlur = 24;
        ctx.shadowOffsetY = 8;
        ctx.fillStyle = '#f6f1e7';
        ctx.fillRect(-w / 2, -ph / 2, w, ph);
        ctx.shadowColor = 'transparent';
        drawCover(ctx, imgs[u], -w / 2 + 16, -ph / 2 + 16, w - 32, w - 32, '50% 40%');
        ctx.restore();
      });
    });
  };

  const paintPoster = (y) => {
    const im = imgs[POSTER_URL];
    if (!im) {
      ctx.fillStyle = T.muted;
      ctx.font = `30px ${SANS}`;
      ctx.fillText('add the poster at public/poster.jpg', cx, y + 340);
      return;
    }
    const sc = Math.min(520 / im.width, 640 / im.height);
    const w = Math.round(im.width * sc);
    const h = Math.round(im.height * sc);
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 30;
    ctx.shadowOffsetY = 10;
    ctx.drawImage(im, (1080 - w) / 2, y + 30, w, h);
    ctx.restore();
  };

  const paintText = (y) => {
    const F = TEXT_FONTS[d.fontId] || TEXT_FONTS.script;
    const txt = (d.text || '').trim();
    if (!txt) {
      ctx.fillStyle = T.muted;
      ctx.font = `32px ${SANS}`;
      ctx.fillText('write something…', cx, y + 110);
      return;
    }
    ctx.fillStyle = T.text;
    ctx.font = `${F.style}${F.size}px ${F.canvas}`;
    wrapText(ctx, txt, 880)
      .slice(0, 3)
      .forEach((l, i) => ctx.fillText(l, cx, y + 70 + i * F.line));
  };

  // ---- lay the chosen blocks out down the canvas ----
  const blocks = d.blocks || [];
  if (!blocks.length) {
    ctx.strokeStyle = T.line;
    ctx.lineWidth = 3;
    ctx.setLineDash([16, 14]);
    ctx.strokeRect(90, 470, 900, 1300);
    ctx.setLineDash([]);
    ctx.fillStyle = T.accent;
    ctx.font = '260px "Bebas Neue"';
    ctx.fillText('+', cx, 1090);
    ctx.fillStyle = T.muted;
    ctx.font = `34px ${SANS}`;
    ctx.fillText('add your results from the night', cx, 1180);
    return;
  }

  const snapN = (d.snapUrls || []).length;
  const sum = blocks.reduce((s, b) => s + blockH(b, snapN), 0);
  const gap = Math.max(0, Math.min(70, (CANVAS_BOTTOM - CANVAS_TOP - sum) / (blocks.length + 1)));
  let y = CANVAS_TOP + gap;
  blocks.forEach((type, i) => {
    if (type === 'pulse') paintPulse(y);
    if (type === 'matchYou') paintMatch(y, d.myBars, 'YOU');
    if (type === 'matchGroup') paintMatch(y, d.groupBars, 'THE GROUP');
    if (type === 'confession') paintConfession(y);
    if (type === 'snaps') paintSnaps(y);
    if (type === 'poster') paintPoster(y);
    if (type === 'text') paintText(y);
    y += blockH(type, snapN);
    if (i < blocks.length - 1 && gap > 24) rule(y + gap / 2);
    y += gap;
  });
}

const smallBtn = {
  width: 'auto',
  margin: 0,
  padding: '4px 10px',
  fontSize: 12,
  borderColor: LINE,
};

function RecapBuilder({ pulseAverage, pulseCount, myBars, groupBars, confessionStats }) {
  const supabase = useMemo(() => getSupabaseClient(), []);
  const blobRef = useRef(null);
  const [preview, setPreview] = useState(null);
  const [note, setNote] = useState(null);
  const [blocks, setBlocks] = useState([]);
  const [themeId, setThemeId] = useState('midnight');
  const [text, setText] = useState('');
  const [photos, setPhotos] = useState([]);
  const [picked, setPicked] = useState([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [fontId, setFontId] = useState('script');
  const [addOpen, setAddOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [dragging, setDragging] = useState(null);
  const wrapRef = useRef(null);

  const loadPhotos = () =>
    supabase
      .from('event_photos')
      .select('id, image_url')
      .eq('event_id', EVENT_ID)
      .order('created_at', { ascending: false })
      .limit(200)
      .then(({ data }) => setPhotos(data || []));

  useEffect(() => {
    loadPhotos();
    const channel = supabase
      .channel('recap-photos-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'event_photos', filter: `event_id=eq.${EVENT_ID}` }, () => loadPhotos())
      .subscribe();
    return () => supabase.removeChannel(channel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // always show the newest uploads when the picker opens
  useEffect(() => {
    if (pickerOpen) loadPhotos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pickerOpen]);

  const snapCount = blocks.includes('snaps') ? (picked.length || Math.min(3, photos.length)) : 0;
  const used = blocks.reduce((s, b) => s + blockH(b, snapCount), 0);
  const fits = (type) => used + blockH(type, snapCount) <= CANVAS_ROOM;

  const add = (type) => {
    if (blocks.includes(type) || !fits(type)) return;
    setBlocks([...blocks, type]);
    setAddOpen(false);
    if (type === 'snaps' && photos.length) setPickerOpen(true);
  };

  // where each block sits on the 1080x1920 canvas (same maths as drawRecap)
  const gapPx = Math.max(0, Math.min(70, (CANVAS_BOTTOM - CANVAS_TOP - used) / (blocks.length + 1)));
  const slots = [];
  {
    let yy = CANVAS_TOP + gapPx;
    blocks.forEach((type) => {
      const h = blockH(type, snapCount);
      slots.push({ type, y: yy, h });
      yy += h + gapPx;
    });
  }
  const freeTypes = Object.keys(BLOCK_TYPES).filter((t) => !blocks.includes(t));
  const canAddMore = freeTypes.some((t) => fits(t));
  const nextY = slots.length ? slots[slots.length - 1].y + slots[slots.length - 1].h + 10 : CANVAS_TOP + 40;

  const onDragStart = (e, type) => {
    e.preventDefault();
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch (err) {}
    setDragging(type);
  };
  const onDragMove = (e) => {
    if (!dragging || !wrapRef.current) return;
    const r = wrapRef.current.getBoundingClientRect();
    const yc = ((e.clientY - r.top) / r.height) * 1920;
    const others = slots.filter((sl) => sl.type !== dragging);
    let idx = 0;
    others.forEach((sl) => { if (sl.y + sl.h / 2 < yc) idx++; });
    const next = others.map((sl) => sl.type);
    next.splice(idx, 0, dragging);
    if (next.join() !== blocks.join()) setBlocks(next);
  };
  const onDragEnd = () => setDragging(null);
  const remove = (type) => setBlocks(blocks.filter((b) => b !== type));
  const move = (i, dir) => {
    const j = i + dir;
    if (j < 0 || j >= blocks.length) return;
    const next = [...blocks];
    [next[i], next[j]] = [next[j], next[i]];
    setBlocks(next);
  };
  const togglePhoto = (id) => {
    if (picked.includes(id)) {
      setPicked(picked.filter((x) => x !== id));
      return;
    }
    if (picked.length >= MAX_SNAPS) return;
    const others = blocks.filter((b) => b !== 'snaps').reduce((s, b) => s + blockH(b, 0), 0);
    if (others + blockH('snaps', picked.length + 1) > CANVAS_ROOM) {
      setNote('Not enough room for more snaps. Remove another block first.');
      return;
    }
    setNote(null);
    setPicked([...picked, id]);
  };

  const snapUrls = blocks.includes('snaps')
    ? (picked.length ? picked.map((id) => photos.find((p) => p.id === id)).filter(Boolean) : photos.slice(0, 3)).map((p) => p.image_url)
    : [];

  const slim = (bars) => bars.map((b) => ({ code: b.code, name: b.name, value: b.value, pct: b.pct, image: b.image, focus: b.focus }));
  const dataKey = JSON.stringify({
    blocks,
    themeId,
    text,
    fontId,
    snapUrls,
    pulseAverage,
    pulseCount,
    myBars: slim(myBars),
    groupBars: slim(groupBars),
    confs: confessionStats.map((c) => ({
      text: c.scenario.text,
      green: c.counts.green,
      yellow: c.counts.yellow,
      red: c.counts.red,
      total: c.total,
    })),
  });

  // redraw (slightly debounced) whenever something changes
  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => {
      const canvas = document.createElement('canvas');
      drawRecap(canvas, JSON.parse(dataKey)).then(() => {
        if (cancelled) return;
        try {
          setPreview(canvas.toDataURL('image/png'));
          canvas.toBlob((b) => { blobRef.current = b; }, 'image/png');
        } catch (e) {
          setNote('Could not build the image — try removing the snaps block.');
        }
      });
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [dataKey]);

  // Saves the finished recap anonymously (small picture + which blocks/look/font were used).
  // No name and no account id is stored. Counts button taps, not real Instagram posts.
  const loggedRef = useRef(new Set());
  async function logShare(kind) {
    try {
      const key = `${kind}|${dataKey}`;
      if (loggedRef.current.has(key)) return; // same recap + same action: count it once
      loggedRef.current.add(key);
      const cfg = JSON.parse(dataKey);

      let imageUrl = null;
      if (kind !== 'preview' && blobRef.current) {
        const bmp = await createImageBitmap(blobRef.current);
        const c = document.createElement('canvas');
        c.width = 540;
        c.height = 960;
        c.getContext('2d').drawImage(bmp, 0, 0, 540, 960);
        const small = await new Promise((resolve) => c.toBlob(resolve, 'image/jpeg', 0.8));
        const path = `${EVENT_ID}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
        const { error: upError } = await supabase.storage
          .from('event-recaps')
          .upload(path, small, { contentType: 'image/jpeg' });
        if (!upError) imageUrl = supabase.storage.from('event-recaps').getPublicUrl(path).data.publicUrl;
      }

      await supabase.from('recap_results').insert({
        event_id: EVENT_ID,
        action: kind,
        blocks: cfg.blocks,
        theme: cfg.themeId,
        font: cfg.blocks.includes('text') ? cfg.fontId : null,
        snap_count: cfg.snapUrls.length,
        has_text: !!(cfg.blocks.includes('text') && cfg.text.trim()),
        image_url: imageUrl,
      });
    } catch (e) {}
  }

  function openPreview() {
    if (!blobRef.current) return;
    setNote(null);
    setPreviewOpen(true);
    logShare('preview');
  }

  function handleSave() {
    if (!blobRef.current) return;
    triggerDownload(blobRef.current, 'the-drama-recap.png');
    logShare('save');
    setNote('Saved. On iPhone you can also press and hold the image → Add to Photos.');
  }

  async function handleShare() {
    if (!blobRef.current) return;
    const file = new File([blobRef.current], 'the-drama-recap.png', { type: 'image/png' });
    logShare('share'); // tapped Share
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: 'The Drama', text: 'My night at The Drama' });
        logShare('share_done'); // the share sheet finished (they picked an app); which app is not visible to websites
        setNote(null);
      } catch (e) {
        if (e.name !== 'AbortError') setNote('Could not open the share sheet. Use "Save as photo" and post it from Instagram.');
      }
    } else {
      triggerDownload(blobRef.current, 'the-drama-recap.png');
      setNote('Image saved. Open Instagram, tap + and pick it from your photos to post it.');
    }
  }

  const tile = (disabled) => ({
    width: '100%',
    margin: 0,
    boxSizing: 'border-box',
    border: `1px dashed ${disabled ? LINE : RED}`,
    background: 'transparent',
    color: disabled ? MUTED : TEXT,
    padding: '12px 12px',
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    textAlign: 'left',
    fontFamily: 'Helvetica, Arial, sans-serif',
    fontSize: 13,
    letterSpacing: 0,
    cursor: disabled ? 'default' : 'pointer',
    opacity: disabled ? 0.45 : 1,
  });

  const sectionLabel = { fontFamily: "'Bebas Neue', sans-serif", fontSize: 18, letterSpacing: 1, color: RED };

  return (
    <section>
      <div className="eyebrow" style={EYEBROW}>Your Recap</div>
      <div style={{ marginTop: 8, fontFamily: "'Bebas Neue', sans-serif", fontSize: 52, lineHeight: 1.05, letterSpacing: 1, color: RED }}>
        Make your own
      </div>
      <div style={{ marginTop: 8, fontSize: 13, color: MUTED }}>
        Start with a blank canvas, add what you want to remember and share it.
      </div>

      <div style={{ marginTop: 22 }}>
        <div style={sectionLabel}>LOOK</div>
        <div style={{ marginTop: 8, display: 'flex', gap: 10 }}>
          {Object.entries(THEMES).map(([id, t]) => (
            <button
              key={id}
              onClick={() => setThemeId(id)}
              style={{
                margin: 0,
                width: 'auto',
                padding: '8px 14px',
                fontSize: 13,
                letterSpacing: 0,
                fontFamily: 'Helvetica, Arial, sans-serif',
                background: t.bg,
                color: t.accent,
                border: `2px solid ${themeId === id ? TEXT : LINE}`,
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ marginTop: 22, display: 'flex', gap: 40, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <div style={{ width: 300, flexShrink: 0 }}>
          <div ref={wrapRef} style={{ position: 'relative', border: `1px solid ${LINE}`, background: '#0e1030' }}>
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview} alt="Your recap" draggable={false} style={{ width: '100%', display: 'block', userSelect: 'none' }} />
            ) : (
              <div style={{ aspectRatio: '9 / 16', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: MUTED }}>
                building your recap…
              </div>
            )}

            {/* tap target for the empty canvas: invisible, sits on the + the picture already shows */}
            {blocks.length === 0 && (
              <button
                onClick={() => setAddOpen(true)}
                aria-label="Add to your recap"
                style={{
                  position: 'absolute', left: `${(90 / 1080) * 100}%`, width: `${(900 / 1080) * 100}%`,
                  top: `${(470 / 1920) * 100}%`, height: `${(1300 / 1920) * 100}%`,
                  margin: 0, padding: 0, background: 'transparent', border: 'none', cursor: 'pointer',
                }}
              />
            )}

            {/* one box per block: drag the handle to reorder, ✕ to remove */}
            {slots.map((sl) => (
              <div
                key={sl.type}
                onClick={() => { if (sl.type === 'snaps' && photos.length) setPickerOpen(true); }}
                style={{
                  position: 'absolute', left: '4%', right: '4%',
                  top: `${(sl.y / 1920) * 100}%`, height: `${(sl.h / 1920) * 100}%`,
                  border: `1px dashed ${dragging === sl.type ? TEXT : 'rgba(253,81,59,0.55)'}`,
                  background: dragging === sl.type ? 'rgba(253,81,59,0.12)' : 'transparent',
                  boxSizing: 'border-box', transition: dragging ? 'none' : 'top 0.15s',
                }}
              >
                <div
                  onPointerDown={(e) => onDragStart(e, sl.type)}
                  onPointerMove={onDragMove}
                  onPointerUp={onDragEnd}
                  onPointerCancel={onDragEnd}
                  onClick={(e) => e.stopPropagation()}
                  title="Drag to reorder"
                  style={{
                    position: 'absolute', top: 4, right: 40, padding: '3px 8px', background: '#050615', color: TEXT,
                    border: `1px solid ${RED}`, fontSize: 13, lineHeight: 1, cursor: 'grab', touchAction: 'none', userSelect: 'none',
                  }}
                >
                  ⠿
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); remove(sl.type); }}
                  aria-label="Remove"
                  style={{ position: 'absolute', top: 4, right: 4, margin: 0, width: 'auto', padding: '3px 8px', fontSize: 13, background: '#050615', border: `1px solid ${RED}`, lineHeight: 1 }}
                >
                  ✕
                </button>
              </div>
            ))}

            {/* the + under the last block */}
            {blocks.length > 0 && canAddMore && (
              <button
                onClick={() => setAddOpen(true)}
                aria-label="Add more"
                style={{
                  position: 'absolute', left: '4%', right: '4%', top: `${(Math.min(nextY, CANVAS_BOTTOM - 110) / 1920) * 100}%`, height: `${(100 / 1920) * 100}%`,
                  margin: 0, width: 'auto', background: 'rgba(5,6,21,0.55)', border: `1px dashed ${RED}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer', padding: 0,
                }}
              >
                <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 30, lineHeight: 1, color: RED }}>+</span>
                <span style={{ fontSize: 11, letterSpacing: 1, color: TEXT }}>ADD</span>
              </button>
            )}
          </div>
          {blocks.length > 1 && (
            <div style={{ marginTop: 8, fontSize: 11, color: MUTED }}>Drag ⠿ up or down to change the order.</div>
          )}
        </div>

        <div style={{ flex: 1, minWidth: 250, maxWidth: 420 }}>
          {blocks.includes('text') && (
            <div style={{ marginTop: 22 }}>
              <div style={sectionLabel}>YOUR WORDS</div>
              <textarea
                value={text}
                maxLength={110}
                rows={2}
                placeholder="A line to remember the night by…"
                onChange={(e) => setText(e.target.value)}
                style={{ ...fieldStyle, marginTop: 8, resize: 'none', fontFamily: TEXT_FONTS[fontId].css, fontSize: 18 }}
              />
              <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {Object.entries(TEXT_FONTS).map(([id, f]) => (
                  <button
                    key={id}
                    onClick={() => setFontId(id)}
                    style={{
                      margin: 0,
                      width: 'auto',
                      padding: '7px 14px',
                      fontSize: 18,
                      letterSpacing: 0,
                      fontFamily: f.css,
                      fontStyle: f.style.includes('italic') ? 'italic' : 'normal',
                      fontWeight: f.style.includes('bold') ? 700 : 400,
                      border: `1px solid ${fontId === id ? RED : LINE}`,
                      color: fontId === id ? TEXT : MUTED,
                    }}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {blocks.includes('snaps') && (
            <div style={{ marginTop: 22 }}>
              <div style={sectionLabel}>YOUR SNAPS</div>
              <div style={{ marginTop: 8, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                {picked.map((id) => {
                  const ph = photos.find((x) => x.id === id);
                  return ph ? (
                    <span
                      key={id}
                      style={{ width: 48, height: 48, backgroundImage: `url(${ph.image_url})`, backgroundSize: 'cover', backgroundPosition: 'center', border: `1px solid ${LINE}` }}
                    />
                  ) : null;
                })}
                <button
                  onClick={() => setPickerOpen(true)}
                  style={{ margin: 0, width: 'auto', padding: '10px 16px', fontSize: 14 }}
                >
                  {picked.length ? `CHANGE SNAPS (${picked.length} / ${MAX_SNAPS})` : `CHOOSE SNAPS (UP TO ${MAX_SNAPS})`}
                </button>
              </div>
              {!picked.length && photos.length > 0 && (
                <div style={{ marginTop: 6, fontSize: 11, color: MUTED }}>Until you choose, your 3 newest snaps are used.</div>
              )}
            </div>
          )}

          <div style={{ marginTop: 0 }}>
            <button
              onClick={openPreview}
              disabled={!preview || !blocks.length}
              style={{ background: RED, borderColor: RED, color: '#050615', fontWeight: 700, opacity: !preview || !blocks.length ? 0.4 : 1 }}
            >
              PREVIEW AND SHARE
            </button>
            {!blocks.length && <div style={{ fontSize: 12, color: MUTED, marginTop: 8 }}>Add something to your recap first.</div>}
            {note && !previewOpen && <div style={{ fontSize: 12, color: MUTED, lineHeight: 1.5, marginTop: 8 }}>{note}</div>}
          </div>
        </div>
      </div>

      {previewOpen && (
        <div
          onClick={() => setPreviewOpen(false)}
          style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(5,6,21,0.94)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ width: '100%', maxWidth: 380, maxHeight: '94vh', display: 'flex', flexDirection: 'column', background: '#0b0d28', border: `1px solid ${LINE}`, boxShadow: '0 24px 60px rgba(0,0,0,0.7)' }}
          >
            <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: `1px solid ${LINE}` }}>
              <div style={{ flex: 1, fontFamily: "'Bebas Neue', sans-serif", fontSize: 26, letterSpacing: 1, color: RED, lineHeight: 1 }}>YOUR RECAP</div>
              <button onClick={() => setPreviewOpen(false)} style={{ margin: 0, width: 'auto', padding: '8px 14px', fontSize: 13 }}>CLOSE</button>
            </div>
            <div style={{ padding: 14, overflowY: 'auto' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {preview && <img src={preview} alt="Your recap" style={{ width: '100%', maxHeight: '58vh', objectFit: 'contain', display: 'block', border: `1px solid ${LINE}`, background: '#000' }} />}
              <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 4 }}>
                <button onClick={handleShare} style={{ background: RED, borderColor: RED, color: '#050615', fontWeight: 700 }}>SHARE</button>
                <button onClick={handleSave} style={{ borderColor: LINE }}>SAVE AS PHOTO</button>
              </div>
              {note && <div style={{ fontSize: 12, color: MUTED, lineHeight: 1.5, marginTop: 8 }}>{note}</div>}
            </div>
          </div>
        </div>
      )}

      {addOpen && (
        <div
          onClick={() => setAddOpen(false)}
          style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(5,6,21,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ width: '100%', maxWidth: 440, maxHeight: '88vh', display: 'flex', flexDirection: 'column', background: '#0b0d28', border: `1px solid ${LINE}`, boxShadow: '0 24px 60px rgba(0,0,0,0.7)' }}
          >
            <div style={{ padding: '18px 20px', borderBottom: `1px solid ${LINE}`, display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 28, letterSpacing: 1, color: RED, lineHeight: 1 }}>WHAT DO YOU WANT TO ADD?</div>
                <div style={{ marginTop: 4, fontSize: 12, color: MUTED }}>Tap one. You can reorder them on the canvas afterwards.</div>
              </div>
              <button onClick={() => setAddOpen(false)} style={{ margin: 0, width: 'auto', padding: '10px 18px', fontSize: 14 }}>CLOSE</button>
            </div>
            <div style={{ padding: 16, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {freeTypes.length === 0 && <div style={{ fontSize: 13, color: MUTED }}>Everything is already on your recap.</div>}
              {freeTypes.map((type) => {
                const ok = fits(type);
                return (
                  <button key={type} onClick={() => add(type)} disabled={!ok} style={tile(!ok)}>
                    <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 28, lineHeight: 1, color: ok ? RED : MUTED }}>+</span>
                    <span style={{ flex: 1 }}>{BLOCK_TYPES[type].label}{!ok && <span style={{ display: 'block', fontSize: 11, color: MUTED }}>No room left. Remove a block first.</span>}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {pickerOpen && (
        <div
          onClick={() => setPickerOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 200,
            background: 'rgba(5,6,21,0.9)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: 760,
              maxHeight: '88vh',
              display: 'flex',
              flexDirection: 'column',
              background: '#0b0d28',
              border: `1px solid ${LINE}`,
              boxShadow: '0 24px 60px rgba(0,0,0,0.7)',
            }}
          >
            <div style={{ padding: '18px 20px', borderBottom: `1px solid ${LINE}`, display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 28, letterSpacing: 1, color: RED, lineHeight: 1 }}>
                  CHOOSE YOUR SNAPS
                </div>
                <div style={{ marginTop: 4, fontSize: 12, color: MUTED }}>
                  Scroll and tap up to {MAX_SNAPS} pictures ({picked.length} / {MAX_SNAPS}). The numbers show the order.
                </div>
              </div>
              <button onClick={() => setPickerOpen(false)} style={{ margin: 0, width: 'auto', padding: '10px 18px', fontSize: 14 }}>
                DONE
              </button>
            </div>

            <div style={{ padding: 16, overflowY: 'auto' }}>
              {photos.length === 0 ? (
                <div style={{ fontSize: 13, color: MUTED }}>No snaps uploaded yet.</div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 10 }}>
                  {photos.map((p) => {
                    const idx = picked.indexOf(p.id);
                    const on = idx >= 0;
                    return (
                      <button
                        key={p.id}
                        onClick={() => togglePhoto(p.id)}
                        aria-label="Pick this snap"
                        style={{
                          margin: 0,
                          padding: 0,
                          position: 'relative',
                          width: '100%',
                          aspectRatio: '1',
                          border: `3px solid ${on ? RED : 'transparent'}`,
                          backgroundImage: `url(${p.image_url})`,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center',
                          opacity: picked.length >= MAX_SNAPS && !on ? 0.4 : 1,
                        }}
                      >
                        {on && (
                          <span
                            style={{
                              position: 'absolute',
                              top: 6,
                              right: 6,
                              width: 26,
                              height: 26,
                              borderRadius: '50%',
                              background: RED,
                              color: '#050615',
                              fontFamily: 'Helvetica, Arial, sans-serif',
                              fontWeight: 700,
                              fontSize: 14,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            {idx + 1}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
              {note && <div style={{ marginTop: 12, fontSize: 12, color: MUTED }}>{note}</div>}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function NightNotes() {
  const supabase = useMemo(() => getSupabaseClient(), []);
  const [notes, setNotes] = useState([]);

  async function fetchNotes() {
    const { data } = await supabase
      .from('night_notes')
      .select('id, kind, text, author_name, created_at')
      .eq('event_id', EVENT_ID)
      .order('created_at', { ascending: false });
    setNotes(data || []);
  }

  useEffect(() => {
    fetchNotes();
    const channel = supabase
      .channel('results-night-notes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'night_notes', filter: `event_id=eq.${EVENT_ID}` }, () => fetchNotes())
      .subscribe();
    return () => supabase.removeChannel(channel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <section>
      <div className="eyebrow" style={EYEBROW}>Notes &amp; Stories</div>
      <div style={{ marginTop: 8, fontFamily: "'Bebas Neue', sans-serif", fontSize: 52, lineHeight: 1.05, letterSpacing: 1, color: RED }}>
        From the night
      </div>
      <div style={{ marginTop: 8, fontSize: 13, color: MUTED }}>
        Little notes and stories shared by everyone.{' '}
        <a href="/share" style={{ color: RED, textDecoration: 'underline' }}>Add yours</a>
      </div>
      {notes.length === 0 ? (
        <div style={{ marginTop: 22, fontSize: 14, color: MUTED }}>Nothing shared yet.</div>
      ) : (
        <div style={{ marginTop: 28, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 26 }}>
          {notes.map((n) => (
            <div key={n.id} style={{ borderLeft: `3px solid ${RED}`, paddingLeft: 14 }}>
              <div style={{ marginTop: 0, fontSize: 15, lineHeight: 1.55, color: SOFT, whiteSpace: 'pre-wrap' }}>{n.text}</div>
              <div style={{ marginTop: 6, fontSize: 11, color: MUTED }}>— {n.author_name || 'anonymous'}</div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

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

  // ---- Film Rating ----
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
  // every scenario with its green / yellow / red counts
  const confessionStats = useMemo(
    () =>
      confessionScenarios.map((scenario) => {
        const votes = confessionVotes.filter((v) => v.scenario_id === scenario.id);
        const counts = { green: 0, yellow: 0, red: 0 };
        votes.forEach((v) => { counts[v.vote] = (counts[v.vote] || 0) + 1; });
        return { scenario, counts, total: votes.length };
      }),
    [confessionVotes]
  );

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
        <div className="eyebrow" style={EYEBROW}>THE DRAMA · 2026 · MEETUP RESULTS</div>
        <div style={{ marginTop: 6, fontFamily: "'Bebas Neue', sans-serif", fontSize: 96, lineHeight: 1, letterSpacing: 1, color: RED }}>
          OVERVIEW
        </div>
       
        <div
          style={{
            marginTop: 20,
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
                  {(() => {
                    const tops = matchBars.filter((b) => b.value > 0 && b.value === matchTop.value);
                    return (
                      <div style={{ fontSize: 13, color: MUTED, marginTop: 16 }}>
                        {matchTab === 'you' ? 'You are' : 'The room is'} {tops.length > 1 ? 'equally' : 'most'} like{' '}
                        <span style={{ color: TEXT, fontWeight: 700 }}>{tops.map((b) => b.name).join(' & ')}</span>
                        {' '}— {matchTop.pct}%
                      </div>
                    );
                  })()}
                  <div style={{ fontSize: 11, color: MUTED, marginTop: 10 }}>
                    A fun personality quiz, not a scientific measure of personality.
                  </div>
                </div>
              </>
            )}
          </Section>

          {/* Film Rating */}
          <Section title="GROUP FILM RATING" style={{ alignItems: 'left', textAlign: 'left' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 10, marginTop: 4 }}>
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
            <div style={{ fontSize: 12, color: MUTED, marginTop: 1, alignSelf: 'center' }}>
              average rating · {pulseRatings.length} vote{pulseRatings.length === 1 ? '' : 's'}
            </div>
          </Section>

          {/* Confessions & Red Flags: all scenarios, compact. The biggest colour stays strong, the others are muted. */}
          <Section title="CONFESSIONS & RED FLAGS">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18, marginTop: 14 }}>
              {confessionStats.map((c) => {
                const top = Math.max(...FLAG_ROWS.map((f) => c.counts[f.id]));
                const isWin = (f) => top > 0 && c.counts[f.id] === top;
                return (
                  <div key={c.scenario.id}>
                    <div style={{ fontSize: 14, fontWeight: 700, lineHeight: 1.4, color: TEXT }}>
                      "{c.scenario.text}"
                    </div>
                    <div style={{ display: 'flex', height: 8, marginTop: 8, background: c.total ? 'transparent' : LINE }}>
                      {FLAG_ROWS.map((f) => (
                        <div
                          key={f.id}
                          style={{
                            width: `${pct(c.counts[f.id], c.total)}%`,
                            background: f.color,
                            opacity: isWin(f) ? 1 : 0.3,
                            transition: 'width 0.5s, opacity 0.4s',
                          }}
                        />
                      ))}
                    </div>
                    <div style={{ display: 'flex', gap: 16, marginTop: 7, flexWrap: 'wrap', alignItems: 'center', fontSize: 12 }}>
                      {FLAG_ROWS.map((f) => (
                        <span
                          key={f.id}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: isWin(f) ? TEXT : MUTED, fontWeight: isWin(f) ? 700 : 400, opacity: isWin(f) ? 1 : 0.7 }}
                        >
                          <span style={{ width: 8, height: 8, borderRadius: '50%', background: f.color, display: 'inline-block', opacity: isWin(f) ? 1 : 0.4 }} />
                          {f.label} {pct(c.counts[f.id], c.total)}%
                        </span>
                      ))}
                      <span style={{ color: MUTED, whiteSpace: 'nowrap' }}>{c.total} vote{c.total === 1 ? '' : 's'}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </Section>
        </div>

        <div id="recap" style={{ marginTop: 90, scrollMarginTop: 72 }}>
          <RecapBuilder
            pulseAverage={pulseAverage}
            pulseCount={pulseRatings.length}
            myBars={myBars}
            groupBars={groupBars}
            confessionStats={confessionStats}
          />
        </div>

        <div id="notes" style={{ marginTop: 90, scrollMarginTop: 72 }}>
          <NightNotes />
        </div>

        <div id="photos" style={{ marginTop: 90, scrollMarginTop: 72 }}>
          <PhotoWall />
        </div>

        <div id="takeaways" style={{ marginTop: 90, scrollMarginTop: 72 }}>
          <Takeaways />
        </div>

        <div style={{ marginTop: 80, fontSize: 11, color: 'rgba(243,238,230,0.35)' }}>
          <p>
  App created by Imogen &amp; Sophie
  <br />
  Contact us:{' '}
  <a href="mailto:pointsofinterest.team@gmail.com" style={{ color: 'inherit', textDecoration: 'underline' }}>pointsofinterest.team@gmail.com</a>
  <br />
  Follow us on Instagram{' '}
  <a
    href="https://www.instagram.com/points.of.interest_/"
    target="_blank"
    rel="noopener noreferrer"
    style={{ color: 'inherit', textDecoration: 'underline' }}
  >
    @points.of.interest_
  </a>
</p>
        </div>
      </div>
    </div>
  );
}