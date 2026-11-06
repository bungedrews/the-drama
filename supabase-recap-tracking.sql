-- =========================================================
-- The Drama: anonymous tracking of the "Make your own" recap
-- Run once in Supabase -> SQL Editor ("Run and enable RLS" if it asks). Safe to re-run.
--
-- What it keeps, per Save / Instagram tap:
--   * which action it was (save or instagram)
--   * the finished result: a small picture of the recap + which blocks, look and font were used
-- It does NOT keep names, account ids or anything that points to a person.
-- =========================================================

-- ---------- 1. Table ----------
create table if not exists recap_results (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references events(id),
  action text not null check (action in ('save', 'instagram')),
  blocks text[] not null default '{}',   -- e.g. {pulse,matchYou,snaps}, in the order on the canvas
  theme text,                             -- midnight / noir / flame
  font text,                              -- only when "my own words" was used
  snap_count int not null default 0,
  has_text boolean not null default false,
  image_url text,                         -- small picture of the finished recap
  created_at timestamptz default now()
);

alter table recap_results enable row level security;

-- guests can add a row, but nobody can read the table from the website.
-- You read it in the Supabase dashboard (Table Editor), which is not affected by these rules.
drop policy if exists "guests add recap_results" on recap_results;
create policy "guests add recap_results" on recap_results
  for insert to anon, authenticated with check (true);

-- ---------- 2. Storage bucket for the recap pictures ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('event-recaps', 'event-recaps', true, 1048576, array['image/jpeg'])
on conflict (id) do update
  set public = true,
      file_size_limit = 1048576,
      allowed_mime_types = array['image/jpeg'];

drop policy if exists "event-recaps public read" on storage.objects;
create policy "event-recaps public read" on storage.objects
  for select using (bucket_id = 'event-recaps');

drop policy if exists "event-recaps upload" on storage.objects;
create policy "event-recaps upload" on storage.objects
  for insert to anon, authenticated with check (bucket_id = 'event-recaps');

-- =========================================================
-- Handy questions to ask the data (run any of these, one at a time):
--
-- How many saves vs Instagram taps?
--   select action, count(*) from recap_results group by action;
--
-- Which blocks do people add most?
--   select b as block, count(*) from recap_results, unnest(blocks) as b group by b order by 2 desc;
--
-- Which look and which font are most popular?
--   select theme, count(*) from recap_results group by theme order by 2 desc;
--   select font, count(*) from recap_results where font is not null group by font order by 2 desc;
--
-- See the finished recaps: Table Editor -> recap_results -> open the image_url links.
-- =========================================================
