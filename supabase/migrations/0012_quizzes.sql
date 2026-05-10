create table quizzes (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subject_id uuid references faculty_subjects(id) on delete set null,
  title text not null,
  source_note_ids uuid[] not null default '{}',
  model text not null,
  created_at timestamptz default now()
);

create table quiz_questions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  quiz_id uuid not null references quizzes(id) on delete cascade,
  order_index integer not null,
  question text not null,
  type text not null check (type in ('multiple_choice','true_false','open')),
  options text[],
  answer text not null,
  explanation text,
  unique (quiz_id, order_index)
);

create table quiz_attempts (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  quiz_id uuid not null references quizzes(id) on delete cascade,
  question_id uuid not null references quiz_questions(id) on delete cascade,
  user_answer text,
  correct boolean,
  created_at timestamptz default now()
);

alter table quizzes        enable row level security;
alter table quiz_questions enable row level security;
alter table quiz_attempts  enable row level security;

create policy "owner_all" on quizzes        for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "owner_all" on quiz_questions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "owner_all" on quiz_attempts  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
