-- Run once in Supabase -> SQL Editor. Safe to re-run.
-- Lets the recap tracking store the new steps: preview, save, share, share_done.
alter table recap_results drop constraint if exists recap_results_action_check;
alter table recap_results add constraint recap_results_action_check
  check (action in ('preview', 'save', 'share', 'share_done', 'instagram'));

-- Handy question: how far do people get?
--   select action, count(*) from recap_results group by action order by 2 desc;
