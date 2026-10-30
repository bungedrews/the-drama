# The Drama — Film Club

Next.js + Supabase app for the live activities from the meetup: Film Pulse
Check (live rating), Character Match (quiz), and Confessions & Red Flags
(live voting), plus a live Event Results page.

## Quick start for collaborators

Supabase is already fully set up — nothing to configure there. The only thing missing after cloning is the keys: `.env.local` is not pushed to git, so you must create it yourself (step 3).

1. Clone the repo and open it:
   ```
   git clone https://github.com/bungedrews/the-drama.git
   cd the-drama
   ```
2. Install dependencies (needs Node 18+):
   ```
   npm install
   ```
3. Create your env file: `cp .env.local.example .env.local`, then paste in the
   Supabase **Project URL** and **anon key**. Ask Sophie for them (send privately,
   never commit `.env.local` — it is git-ignored).
4. Start the app and open http://localhost:3000:
   ```
   npm run dev
   ```
5. Working together: run `git pull` before you start, work on a branch
   (`git checkout -b my-change`), commit small, then `git push`.

Notes:

- You share one Supabase project, so test votes show up for everyone. Delete
  test rows in Supabase → Table Editor before the event.
- Pushing to the repo needs GitHub access: ask to be added under
  Settings → Collaborators.
- If you get a foreign key error, clear the old id in the browser console:
  `localStorage.removeItem('attendee_id')`, then reload.

The sections below describe how the database was set up (only needed for a new
Supabase project).

## 1. Install

```
npm install
```

## 3. Environment variables

```
cp .env.local.example .env.local
```

Fill in `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` from
Supabase → Project Settings → API.

## 4. Run it

```
npm run dev
```

Flow: `/` (landing) → `/film-pulse` (rate, submit, live average) →
`/character-match` (quiz) → `/confessions` (live flag voting) → `/results`
(live aggregate page for the room to watch).

## Not built yet

- Placeholder copy for the Character Match questions and Confession
  scenarios (`lib/questions.js`) — swap in the final wording.
- The Deep Dive / The Discourse curated highlights, the photo wall, and the
  souvenir gallery from the canvas design — these still need a storage
  bucket and a simple way to add curated content, same as the earlier
  `thedrama-event` repo.
- Apple Wallet / Instagram-share buttons — discussed separately, not
  implemented.
