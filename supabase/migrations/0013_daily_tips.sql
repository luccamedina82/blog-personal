create table daily_tips (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  tip_date date not null,
  kind text not null check (kind in ('word', 'phrase', 'idiom', 'connector')),
  term text not null,
  meaning text not null,
  example text not null,
  register text not null check (register in ('casual', 'neutral', 'formal')),
  source text,
  created_at timestamptz default now(),
  unique(user_id, tip_date)
);

alter table daily_tips enable row level security;

create policy "owner_all" on daily_tips
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
