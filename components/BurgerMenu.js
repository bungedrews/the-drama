'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const LINKS = [
  { href: '/film-pulse', label: 'Film Rating', note: 'Rate the film' },
  { href: '/character-match', label: 'Character Match', note: 'Find your persona' },
  { href: '/confessions', label: 'Confessions & Red Flags', note: 'Vote live' },
  { href: '/share', label: 'Share Your Night', note: 'Photos & notes' },
  { href: '/results', label: 'Event Results', note: 'What the room thinks' },
];

export default function BurgerMenu() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // close the menu whenever the page changes
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // lock page scroll while the menu is open
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  // the cream invitation landing page has no menu
  if (pathname === '/') return null;

  return (
    <>
      <header className="topbar">
        <Link href="/" className="topbar-title">THE DRAMA</Link>
        <button
          className="burger"
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
        >
          <span className={open ? 'bar bar1 x' : 'bar bar1'} />
          <span className={open ? 'bar bar2 x' : 'bar bar2'} />
          <span className={open ? 'bar bar3 x' : 'bar bar3'} />
        </button>
      </header>

      {open && (
        <nav className="menu-overlay" onClick={() => setOpen(false)}>
          <div className="menu-panel" onClick={(e) => e.stopPropagation()}>
            <div className="label" style={{ marginBottom: 18 }}>JUMP TO</div>
            {LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={pathname === l.href ? 'menu-link current' : 'menu-link'}
              >
                <span className="menu-link-title">{l.label}</span>
                <span className="menu-link-note">{l.note}</span>
              </Link>
            ))}
          </div>
        </nav>
      )}
    </>
  );
}
