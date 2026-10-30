# The Drama — Film Club

Next.js + Supabase app for the live activities from the meetup: Film Pulse
Check (live rating), Character Match (quiz), and Confessions & Red Flags
(live voting), plus a live Event Results page.

## 1. Install

```
npm install
```

## 2. Supabase project

Reuses the same Supabase project / event as before
(`EVENT_ID = 4a81d7bb-0109-414d-baa8-4b053bc60679` in `lib/constants.js`).

Run this in the Supabase SQL editor (safe to re-run — uses `if not exists`):

```sql
create table if not exists events (
  id uuid primary key default gen_random_uuid(),
  title text,
  created_at timestamptz default now()
);

create table if not exists attendees (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references events(id),
  display_name text,
  user_id uuid,
  created_at timestamptz default now()
);

create table if not exists pulse_ratings (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references events(id),
  attendee_id uuid references attendees(id),
  rating smallint check (rating between 1 and 10),
  created_at timestamptz default now()
);

create table if not exists character_match_responses (
  id uuid primary key default gen_random_uuid(),
  attendee_id uuid references attendees(id),
  question_id text,
  answer text,
  created_at timestamptz default now()
);

create table if not exists confession_scenarios (
  id text primary key,
  event_id uuid references events(id),
  text text,
  sort_order int
);

create table if not exists confession_votes (
  id uuid primary key default gen_random_uuid(),
  scenario_id text references confession_scenarios(id),
  attendee_id uuid references attendees(id),
  vote text check (vote in ('green', 'yellow', 'red')),
  created_at timestamptz default now(),
  unique (scenario_id, attendee_id)
);

-- Row Level Security: public read, writes scoped to the signed-in anon user.
alter table attendees enable row level security;
alter table pulse_ratings enable row level security;
alter table character_match_responses enable row level security;
alter table confession_votes enable row level security;

create policy "read all - attendees" on attendees for select using (true);
create policy "read all - pulse_ratings" on pulse_ratings for select using (true);
create policy "read all - character_match_responses" on character_match_responses for select using (true);
create policy "read all - confession_votes" on confession_votes for select using (true);

create policy "insert own - attendees" on attendees for insert with check (auth.uid() = user_id);
create policy "insert any - pulse_ratings" on pulse_ratings for insert with check (true);
create policy "insert any - character_match_responses" on character_match_responses for insert with check (true);
create policy "insert any - confession_votes" on confession_votes for insert with check (true);
```

Also: in Supabase → Authentication → Providers, make sure **Anonymous sign-in**
is enabled.

Then insert the confession scenarios (the placeholder copy lives in
`lib/questions.js` too — keep the ids in sync, or swap this table to be the
single source of truth once the real copy is ready):

```sql
insert into confession_scenarios (id, event_id, text, sort_order) values
  ('c1', '4a81d7bb-0109-414d-baa8-4b053bc60679', 'You find out your partner told their best friend a secret you asked them to keep, "just this once."', 1),
  ('c2', '4a81d7bb-0109-414d-baa8-4b053bc60679', 'Your partner invites their ex to a group event without mentioning it beforehand.', 2),
  ('c3', '4a81d7bb-0109-414d-baa8-4b053bc60679', 'Your partner reads a private message over your shoulder, then brings it up later.', 3)
on conflict (id) do nothing;
```

Finally, in Database → Replication, turn on **Realtime** for `pulse_ratings`
and `confession_votes` (this is what makes the live results update without a
page refresh).

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
