-- Notes, insights, stories and comments from the "Share your night" page.
-- Paste into Supabase -> SQL Editor and run ("Run and enable RLS" if it asks).

create table if not exists night_notes (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references events(id),
  attendee_id uuid references attendees(id) on delete set null,
  kind text not null default 'note' check (kind in ('note', 'insight', 'story', 'comment')),
  text text not null check (char_length(text) between 1 and 500),
  author_name text check (author_name is null or char_length(author_name) <= 40),
  created_at timestamptz default now()
);

alter table night_notes enable row level security;

drop policy if exists "read all - night_notes" on night_notes;
create policy "read all - night_notes" on night_notes for select using (true);

drop policy if exists "guests add night_notes" on night_notes;
create policy "guests add night_notes" on night_notes for insert with check (true);

-- live updates
do $$ begin
  alter publication supabase_realtime add table night_notes;
exception when duplicate_object then null; end $$;
