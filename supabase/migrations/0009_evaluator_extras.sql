alter table evaluator_runs
  add column if not exists suggestions text[] not null default '{}',
  add column if not exists corrected_text text;
