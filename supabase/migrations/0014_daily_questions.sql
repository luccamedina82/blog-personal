-- Daily English practice questions + answers with AI review

create table daily_questions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  question text not null,
  tone text not null check (tone in ('casual','formal','technical')),
  model text not null,
  created_at timestamptz default now()
);

create table daily_question_answers (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  question_id uuid not null references daily_questions(id) on delete cascade,
  answer_text text not null,
  scores jsonb,
  overall integer,
  corrected_text text,
  suggestions text[] default '{}',
  created_at timestamptz default now(),
  unique (question_id)
);

create index daily_questions_user_created_idx on daily_questions(user_id, created_at desc);

alter table daily_questions       enable row level security;
alter table daily_question_answers enable row level security;

create policy "owner_all" on daily_questions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "owner_all" on daily_question_answers
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
