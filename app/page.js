export default function Landing() {
  return (
    <div
      className="screen"
      style={{ background: '#e9e2d3', minHeight: '100vh' }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 430,
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 18,
          boxSizing: 'border-box',
        }}
      >
        <div
          style={{
            width: '100%',
            minHeight: 'calc(100vh - 36px)',
            boxSizing: 'border-box',
            background: '#f6f1e7',
            border: '1px solid #b9a98f',
            outline: '1px solid #f6f1e7',
            outlineOffset: '-8px',
            padding: '34px 26px 26px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: 14,
              letterSpacing: 1.5,
              color: '#E1250E',
            }}
          >
            You are warmly invited to
          </div>

          <div
            style={{
              marginTop: 20,
              width: 250,
              height: 200,
              border: '1px solid #E1250E',
              padding: 5,
              boxSizing: 'border-box',
            }}
          >
            <div
              style={{
                width: '100%',
                height: '100%',
                background: '#e7ded0',
                overflow: 'hidden',
              }}
            >
            <img
              src="/image_landingpage.jpg"
              alt="Charlie & Emma"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
            </div>
          </div>

          <div
            style={{
              marginTop: 26,
              fontFamily: 'Bebas Neue, sans-serif',
              fontSize: 52,
              lineHeight: 1,
              color: '#E1250E',
              fontWeight: 700,
            }}
          >
            The&nbsp;Drama
          </div>
          <div
            style={{
              marginTop: 10,
              fontFamily: "'Pinyon Script', cursive",
              fontSize: 24,
              lineHeight: 1,
              color: '#4a3b32',
            }}
          >
            film club
          </div>

          <div style={{ marginTop: 18, width: 46, height: 1, background: '#b9a98f' }} />
          <div
            style={{
              marginTop: 16,
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: 15,
              color: '#4a3b32',
            }}
          >
            Friday, November 6th 2026<br />
            <br />
            Mittelweg 138, Hamburg
          </div>

          <div style={{ marginTop: 18, width: 46, height: 1, background: '#b9a98f' }} />

          <div
            style={{
              marginTop: 18,
              fontSize: 12,
              color: '#4a3b32',
              lineHeight: 1.6,
            }}
          >
            Hosted by <span style={{ fontWeight: 600 }}>Lakaii</span>
            <br />
            with <span style={{ fontWeight: 600 }}>Imogen</span> &amp;{' '}
            <span style={{ fontWeight: 600 }}>Sophie</span>
          </div>

          <div
            style={{
              marginTop: 22,
              marginBottom: 22,
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: 13,
              lineHeight: 1.6,
              color: '#5c4c40',
              maxWidth: 270,
            }}
          >
            A happily engaged couple is put to the test when an unexpected revelation
            sends their wedding week off the rails. Join us for a few games and a
            revealing discussion.
          </div>

          <div style={{ flex: 1 }} />

          <a
            href="/film-pulse"
            style={{
              width: '100%',
              boxSizing: 'border-box',
              border: '1px solid #E1250E',
              color: '#E1250E',
              textAlign: 'center',
              padding: 13,
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: 22,
              letterSpacing: 1,
              display: 'block',
              borderRadius: 10,
            }}
          >
            Start
          </a>
        </div>
      </div>
    </div>
  );
}
