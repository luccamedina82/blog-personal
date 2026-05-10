alter table evaluator_runs
  add column if not exists title text,
  add column if not exists source_title text;
