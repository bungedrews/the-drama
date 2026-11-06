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
function PersonalityChart({ bars, topCode, maxPx = 320 }) {
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
              style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer' }}
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
              <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 24, letterSpacing: 1, color: isTop ? RED : TEXT, marginTop: 8 }}>
                {b.code}
              </div>
              <div style={{ fontSize: 11, color: MUTED, textAlign: 'center', lineHeight: 1.3, minHeight: 28 }}>
                {b.name}
              </div>
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
      <div style={{ fontFamily: "'Pinyon Script', cursive", fontSize: 32, color: TEXT, marginTop: 6 }}>
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

      <div className="eyebrow">The Snaps</div>
      <div style={{ marginTop: 8, fontFamily: "'Pinyon Script', cursive", fontSize: 44, color: TEXT }}>
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
          gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))',
          gap: 30,
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
    fetchItems();
  }

  const hostItems = items.filter((i) => i.from_host);
  const guestItems = items.filter((i) => !i.from_host).reverse(); // newest first

  return (
    <section>
      <div className="eyebrow">The Takeaways</div>
      <div style={{ marginTop: 8, fontFamily: "'Pinyon Script', cursive", fontSize: 44, color: TEXT }}>
        What we're taking home
      </div>

      {/* from the hosts */}
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

      {/* from the room */}
      <div style={{ marginTop: 52, borderTop: `1px solid ${LINE}`, paddingTop: 22 }}>
        <div className="label" style={{ fontSize: 15 }}>FROM THE ROOM</div>
        <div style={{ marginTop: 6, fontSize: 13, color: MUTED }}>
          Add your own takeaway, it's shared with everyone.
        </div>

        <div style={{ marginTop: 18, maxWidth: 620, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <textarea
            value={text}
            maxLength={MAX}
            rows={3}
            placeholder="My takeaway from tonight…"
            onChange={(e) => setText(e.target.value)}
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
              {saving ? 'SHARING…' : 'SHARE TAKEAWAY'}
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

// ====================== RECAP CARD (save / share) ======================
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

// Draws the 1080x1920 (Instagram story size) summary image.
async function drawRecap(canvas, d) {
  try {
    await Promise.all([
      document.fonts.load('170px "Bebas Neue"'),
      document.fonts.load('80px "Pinyon Script"'),
      document.fonts.load('bold 40px Helvetica'),
    ]);
  } catch (e) {}

  canvas.width = 1080;
  canvas.height = 1920;
  const ctx = canvas.getContext('2d');
  const cx = 540;
  const SANS = 'Helvetica, Arial, sans-serif';

  ctx.fillStyle = '#050615';
  ctx.fillRect(0, 0, 1080, 1920);
  ctx.textAlign = 'center';

  const rule = (y) => {
    ctx.strokeStyle = LINE;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(90, y);
    ctx.lineTo(990, y);
    ctx.stroke();
  };
  const heading = (t, y) => {
    ctx.fillStyle = RED;
    ctx.font = '48px "Bebas Neue"';
    ctx.fillText(t, cx, y);
  };

  // title
  ctx.fillStyle = RED;
  ctx.font = '170px "Bebas Neue"';
  ctx.fillText('THE DRAMA', cx, 190);
  ctx.fillStyle = TEXT;
  ctx.font = '80px "Pinyon Script"';
  ctx.fillText('film club', cx, 275);
  ctx.fillStyle = MUTED;
  ctx.font = `30px ${SANS}`;
  ctx.fillText('Friday, November 6th 2026 · Hamburg', cx, 335);
  rule(395);

  // film pulse
  heading('FILM PULSE CHECK', 470);
  ctx.fillStyle = RED;
  ctx.font = '300px "Bebas Neue"';
  ctx.fillText(d.pulseAverage, cx, 720);
  ctx.fillStyle = MUTED;
  ctx.font = `32px ${SANS}`;
  ctx.fillText(`average rating out of 10 · ${d.pulseCount} vote${d.pulseCount === 1 ? '' : 's'}`, cx, 780);
  rule(840);

  // character match
  heading('CHARACTER MATCH', 910);
  const max = Math.max(1, ...d.group.map((g) => g.value));
  const topImgs = {};
  await Promise.all(
    d.group.map(async (g) => {
      if (g.value > 0 && g.value === max && g.image) {
        topImgs[g.code] = await new Promise((resolve) => {
          const im = new Image();
          im.onload = () => resolve(im);
          im.onerror = () => resolve(null);
          im.src = g.image;
        });
      }
    })
  );
  d.group.forEach((g, i) => {
    const v = g.value;
    const x = 210 + i * 180;
    const h = Math.max(v > 0 ? 10 : 4, Math.round((v / max) * 190));
    const isTop = v > 0 && v === max;
    const topImg = topImgs[g.code];
    ctx.fillStyle = RED;
    ctx.fillRect(x, 1170 - h, 120, h);
    if (isTop && topImg) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(x, 1170 - h, 120, h);
      ctx.clip();
      const scale = Math.max(120 / topImg.width, h / topImg.height);
      const dw = topImg.width * scale;
      const dh = topImg.height * scale;
      ctx.drawImage(topImg, x + (120 - dw) / 2, 1170 - h + (h - dh) * 0.25, dw, dh);
      ctx.restore();
    }
    if (isTop) {
      ctx.strokeStyle = TEXT;
      ctx.lineWidth = 4;
      ctx.strokeRect(x, 1170 - h, 120, h);
    }
    ctx.fillStyle = TEXT;
    ctx.font = `bold 34px ${SANS}`;
    ctx.fillText(`${g.pct}%`, x + 60, 1170 - h - 14);
    ctx.fillStyle = isTop ? RED : MUTED;
    ctx.font = '46px "Bebas Neue"';
    ctx.fillText(g.code, x + 60, 1224);
  });
  ctx.font = `32px ${SANS}`;
  ctx.fillStyle = MUTED;
  ctx.fillText(d.groupTop ? `the room is most like: ${d.tied ? d.tied.join(' & ') : d.groupTop.name}` : 'no answers yet', cx, 1282);
  if (d.mineTop) {
    ctx.fillStyle = TEXT;
    ctx.fillText(`you are most like: ${d.mineTop.name}`, cx, 1328);
  }
  rule(1380);

  // most contested confession
  heading('MOST CONTESTED CONFESSION', 1450);
  if (d.conf) {
    ctx.fillStyle = TEXT;
    ctx.font = `bold 42px ${SANS}`;
    let lines = wrapText(ctx, `"${d.conf.text}"`, 880);
    if (lines.length > 3) {
      lines = lines.slice(0, 3);
      lines[2] = lines[2].replace(/\s*\S*$/, '') + '…';
    }
    lines.forEach((l, i) => ctx.fillText(l, cx, 1525 + i * 58));
    const barY = 1525 + (lines.length - 1) * 58 + 40;

    const segs = [
      ['green', 'Green', '#4fbf8a'],
      ['yellow', 'Yellow', '#e8b84a'],
      ['red', 'Red', RED],
    ];
    let x = 90;
    segs.forEach(([k, , color]) => {
      const w = 900 * (d.conf[k] / d.conf.total);
      ctx.fillStyle = color;
      ctx.fillRect(x, barY, w, 38);
      x += w;
    });
    ctx.font = `34px ${SANS}`;
    segs.forEach(([k, name, color], i) => {
      ctx.fillStyle = color;
      ctx.fillText(`${name} ${Math.round((d.conf[k] / d.conf.total) * 100)}%`, 240 + i * 300, barY + 105);
    });
    ctx.fillStyle = MUTED;
    ctx.font = `28px ${SANS}`;
    ctx.fillText(`${d.conf.total} votes`, cx, barY + 160);
  } else {
    ctx.fillStyle = MUTED;
    ctx.font = `32px ${SANS}`;
    ctx.fillText('no votes yet', cx, 1525);
  }

  ctx.fillStyle = MUTED;
  ctx.font = `28px ${SANS}`;
  ctx.fillText(window.location.host, cx, 1885);
}

function RecapCard({ pulseAverage, pulseCount, groupBars, groupTop, myTop, mostContested }) {
  const supabase = useMemo(() => getSupabaseClient(), []);
  const blobRef = useRef(null);
  const [preview, setPreview] = useState(null);
  const [note, setNote] = useState(null);

  const dataKey = JSON.stringify({
    pulseAverage,
    pulseCount,
    group: groupBars.map((b) => ({ code: b.code, value: b.value, pct: b.pct, image: b.image, focus: b.focus })),
    groupTop: groupTop
      ? { idx: TYPE_ORDER.indexOf(groupTop.code), name: groupTop.name, image: groupTop.image }
      : null,
    tied: groupBars.filter((b) => b.value > 0 && b.value === Math.max(...groupBars.map((x) => x.value))).length > 1
      ? groupBars.filter((b) => b.value === Math.max(...groupBars.map((x) => x.value))).map((b) => b.name)
      : null,
    mineTop: myTop ? { name: myTop.name } : null,
    conf: mostContested
      ? {
          text: mostContested.scenario.text,
          green: mostContested.counts.green,
          yellow: mostContested.counts.yellow,
          red: mostContested.counts.red,
          total: mostContested.total,
        }
      : null,
  });

  // redraw (slightly debounced) whenever the live numbers change
  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => {
      const canvas = document.createElement('canvas');
      drawRecap(canvas, JSON.parse(dataKey)).then(() => {
        if (cancelled) return;
        setPreview(canvas.toDataURL('image/png'));
        canvas.toBlob((b) => { blobRef.current = b; }, 'image/png');
      });
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [dataKey]);

  // counts button taps (not actual posts — Instagram doesn't tell us that)
  async function logShare(kind) {
    try {
      const attendee = localStorage.getItem('attendee_id');
      await supabase.from('share_events').insert({ event_id: EVENT_ID, attendee_id: attendee, kind });
    } catch (e) {}
  }

  function handleSave() {
    if (!blobRef.current) return;
    triggerDownload(blobRef.current, 'the-drama-recap.png');
    logShare('save');
    setNote('Saved');
  }

  async function handleInstagram() {
    if (!blobRef.current) return;
    const file = new File([blobRef.current], 'the-drama-recap.png', { type: 'image/png' });
    logShare('instagram');
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: 'The Drama', text: 'My night at The Drama' });
        setNote(null);
      } catch (e) {
        if (e.name !== 'AbortError') setNote('Could not open the share sheet — use "Save as photo" and post it from Instagram.');
      }
    } else {
      triggerDownload(blobRef.current, 'the-drama-recap.png');
      setNote('Image saved. Open Instagram, tap + and pick it from your photos to post it.');
    }
  }

  return (
    <section>
      <div className="eyebrow">The Recap</div>
      <div style={{ marginTop: 8, fontFamily: "'Pinyon Script', cursive", fontSize: 44, color: TEXT }}>
        The night in numbers
      </div>

      <div style={{ marginTop: 26, display: 'flex', gap: 36, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <div style={{ width: 270, flexShrink: 0, border: `1px solid ${LINE}`, background: '#0e1030' }}>
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="Recap of the night" style={{ width: '100%', display: 'block' }} />
          ) : (
            <div style={{ aspectRatio: '9 / 16', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: MUTED }}>
              building your recap…
            </div>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 320, flex: 1, minWidth: 230 }}>
          <div style={{ fontSize: 14, color: SOFT, lineHeight: 1.5 }}>
            A story-sized summary of tonight's results: the film rating, the Character Match
            split and the most contested confession. It updates as votes come in.
          </div>
          <button onClick={handleInstagram} disabled={!preview}>POST TO INSTAGRAM</button>
          <button onClick={handleSave} disabled={!preview} style={{ borderColor: LINE }}>SAVE AS PHOTO</button>
          {note && <div style={{ fontSize: 12, color: MUTED, lineHeight: 1.5 }}>{note}</div>}
        </div>
      </div>
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
          <p>
  App created by Imogen &amp; Sophie
  <br />
  Contact us:{' '}
  <a href="mailto:pointsofinterest.team@gmail.com">pointsofinterest.team@gmail.com</a>
  <br />
  Follow us on Instagram{' '}
  <a
    href="https://www.instagram.com/points.of.interest_/"
    target="_blank"
    rel="noopener noreferrer"
  >
    @points.of.interest_
  </a>
</p>
        </div>
      </div>
    </div>
  );
}