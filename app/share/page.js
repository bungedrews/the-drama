'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { getSupabaseClient, ensureAttendee } from '@/lib/supabase';
import { EVENT_ID } from '@/lib/constants';

const BUCKET = 'event-photos';
const MAX_EDGE = 1600; // photos are shrunk before upload to keep storage small
const MAX_NOTE = 500;

const RED = '#FD513B';
const TEXT = '#f3eee6';
const MUTED = 'rgba(243,238,230,0.5)';
const SOFT = 'rgba(243,238,230,0.75)';
const LINE = '#232850';

const fieldStyle = {
  width: '100%',
  boxSizing: 'border-box',
  background: '#0e1030',
  border: `1px solid ${LINE}`,
  color: TEXT,
  padding: '12px 14px',
  fontFamily: 'Helvetica, Arial, sans-serif',
  fontSize: 15,
  outline: 'none',
};

const cardStyle = {
  marginTop: 22,
  border: `1px solid ${LINE}`,
  background: '#0b0d28',
  padding: '20px 18px',
};

const cardTitle = { fontFamily: "'Bebas Neue', sans-serif", fontSize: 26, letterSpacing: 1, color: RED, lineHeight: 1 };

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

export default function ShareYourNight() {
  const supabase = useMemo(() => getSupabaseClient(), []);
  const fileInput = useRef(null);

  // photos
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState(null);
  const [uploadError, setUploadError] = useState(null);
  const [mine, setMine] = useState([]); // photos this guest added in this visit

  // notes
  const [text, setText] = useState('');
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [noteError, setNoteError] = useState(null);
  const [justShared, setJustShared] = useState(false);
  const [notes, setNotes] = useState([]);

  async function fetchNotes() {
    const { data } = await supabase
      .from('night_notes')
      .select('id, kind, text, author_name, created_at')
      .eq('event_id', EVENT_ID)
      .order('created_at', { ascending: false })
      .limit(30);
    setNotes(data || []);
  }

  useEffect(() => {
    fetchNotes();
    const channel = supabase
      .channel('night-notes-live')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'night_notes', filter: `event_id=eq.${EVENT_ID}` },
        () => fetchNotes()
      )
      .subscribe();
    return () => supabase.removeChannel(channel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleFiles(fileList) {
    const files = Array.from(fileList || []);
    if (!files.length) return;
    setUploading(true);
    setUploadError(null);
    try {
      const attendeeId = await ensureAttendee(EVENT_ID);
      for (let i = 0; i < files.length; i++) {
        setUploadStatus(`Uploading ${i + 1} of ${files.length}…`);
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
        setMine((m) => [...m, data.publicUrl]);
      }
    } catch (e) {
      setUploadError(e.message || 'Upload failed');
    } finally {
      setUploading(false);
      setUploadStatus(null);
      if (fileInput.current) fileInput.current.value = '';
    }
  }

  async function shareNote() {
    const clean = text.trim();
    if (!clean) return;
    setSaving(true);
    setNoteError(null);
    try {
      const attendeeId = await ensureAttendee(EVENT_ID);
      const { error } = await supabase.from('night_notes').insert({
        event_id: EVENT_ID,
        attendee_id: attendeeId,
        kind: 'note',
        text: clean,
        author_name: name.trim() || null,
      });
      if (error) throw error;
      setText('');
      setJustShared(true);
      fetchNotes();
    } catch (e) {
      setNoteError(e.message || 'Could not share your note');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="screen" style={{ background: '#050615' }}>
      <div className="screen-inner">
        <div className="label">SHARE YOUR NIGHT</div>
        <div style={{ marginTop: 10, fontFamily: "'Bebas Neue', sans-serif", fontSize: 56, lineHeight: 1, letterSpacing: 1, color: RED }}>
          ADD A MEMORY
        </div>
        <div style={{ marginTop: 10, fontSize: 14, color: MUTED, lineHeight: 1.5 }}>
          Add photos and a note: whatever you want to remember. Everyone sees it on the results page.
        </div>

        {/* ---------- PHOTOS ---------- */}
        <div style={cardStyle}>
          <div style={cardTitle}>PHOTOS</div>
          <input
            ref={fileInput}
            type="file"
            accept="image/*"
            multiple
            style={{ display: 'none' }}
            onChange={(e) => handleFiles(e.target.files)}
          />
          <button
            disabled={uploading}
            onClick={() => fileInput.current && fileInput.current.click()}
            style={{
              marginTop: 14,
              border: `1px dashed ${RED}`,
              padding: '26px 10px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 6,
              fontFamily: 'Helvetica, Arial, sans-serif',
              letterSpacing: 0,
              fontSize: 14,
            }}
          >
            <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 48, lineHeight: 1, color: RED }}>+</span>
            {uploading ? uploadStatus || 'Uploading…' : 'Add photos from your phone'}
          </button>
          {uploadError && <div style={{ marginTop: 10, fontSize: 12, color: '#ff8a78' }}>{uploadError}</div>}

          {mine.length > 0 && (
            <>
              <div style={{ marginTop: 14, fontSize: 12, color: SOFT }}>
                Added: {mine.length} photo{mine.length === 1 ? '' : 's'} ✓
              </div>
              <div style={{ marginTop: 8, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
                {mine.map((u) => (
                  <div
                    key={u}
                    style={{ aspectRatio: '1', backgroundImage: `url(${u})`, backgroundSize: 'cover', backgroundPosition: 'center', border: `1px solid ${LINE}` }}
                  />
                ))}
              </div>
            </>
          )}
        </div>

        {/* ---------- NOTES ---------- */}
        <div style={cardStyle}>
          <div style={cardTitle}>YOUR NOTE</div>

          <div style={{ marginTop: 16, fontFamily: "'Bebas Neue', sans-serif", fontSize: 24, letterSpacing: 1, color: TEXT, lineHeight: 1.15 }}>
            Share something with the group.
          </div>
          <div style={{ marginTop: 6, fontSize: 13, color: MUTED, lineHeight: 1.5 }}>
            The most exciting part of your night, a little note or your thoughts.
          </div>

          <textarea
            value={text}
            maxLength={MAX_NOTE}
            rows={5}
            placeholder="Write here…"
            onChange={(e) => { setText(e.target.value); setJustShared(false); }}
            style={{ ...fieldStyle, marginTop: 10, resize: 'vertical' }}
          />
          <input
            value={name}
            maxLength={40}
            placeholder="Your name (optional)"
            onChange={(e) => setName(e.target.value)}
            style={{ ...fieldStyle, marginTop: 10 }}
          />
          <div style={{ marginTop: 4, textAlign: 'right', fontSize: 11, color: MUTED }}>{text.length} / {MAX_NOTE}</div>

          <button disabled={!text.trim() || saving} onClick={shareNote} style={{ marginTop: 10 }}>
            {saving ? 'SHARING…' : 'SHARE'}
          </button>
          {justShared && <div style={{ marginTop: 10, fontSize: 13, color: SOFT }}>Shared ✓ Thank you! Add another if you like.</div>}
          {noteError && <div style={{ marginTop: 10, fontSize: 12, color: '#ff8a78' }}>{noteError}</div>}
        </div>

        {/* ---------- what others shared ---------- */}
        {notes.length > 0 && (
          <div style={{ marginTop: 30 }}>
            <div style={cardTitle}>FROM THE ROOM</div>
            <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 18 }}>
              {notes.map((n) => (
                <div key={n.id} style={{ borderLeft: `3px solid ${RED}`, paddingLeft: 14 }}>
                  <div style={{ marginTop: 0, fontSize: 15, lineHeight: 1.5, color: SOFT, whiteSpace: 'pre-wrap' }}>{n.text}</div>
                  <div style={{ marginTop: 4, fontSize: 11, color: MUTED }}>— {n.author_name || 'anonymous'}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ flex: 1, minHeight: 30 }} />
        <a href="/results" className="btn" style={{ textAlign: 'center', display: 'block' }}>
          CONTINUE TO RESULTS
        </a>
      </div>
    </div>
  );
}
