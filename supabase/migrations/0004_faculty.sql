-- 0004_faculty.sql
-- Faculty module: subjects, topics, notes, deadlines.
-- Run in Supabase SQL Editor.

-- ============================================================
-- FACULTY SUBJECTS
-- ============================================================
create table faculty_subjects (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  name text not null,
  code text,
  status text not null check (status in ('cursando','final-pendiente','aprobada','recursar')) default 'cursando',
  semester text,
  professor text,
  credits integer,
  color text,
  created_at timestamptz default now()
);

-- ============================================================
-- FACULTY TOPICS
-- ============================================================
create table faculty_topics (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  subject_id uuid not null references faculty_subjects(id) on delete cascade,
  title text not null,
  order_index integer default 0,
  status text check (status in ('pendiente','visto','dominado')) default 'pendiente',
  created_at timestamptz default now()
);

-- ============================================================
-- FACULTY NOTES
-- ============================================================
create table faculty_notes (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  subject_id uuid not null references faculty_subjects(id) on delete cascade,
  topic_id uuid references faculty_topics(id) on delete set null,
  kind text not null check (kind in ('clase','apunte','tp','parcial','final')),
  title text not null,
  date date,
  blocks jsonb default '[]',
  tags text[] default '{}',
  grade numeric,
  created_at timestamptz default now()
);

-- ============================================================
-- FACULTY DEADLINES
-- ============================================================
create table faculty_deadlines (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  subject_id uuid not null references faculty_subjects(id) on delete cascade,
  kind text not null check (kind in ('tp','parcial','final','recuperatorio','entrega')),
  title text not null,
  due_at timestamptz not null,
  done boolean default false,
  note text,
  created_at timestamptz default now()
);

-- ============================================================
-- INDEXES
-- ============================================================
create index faculty_topics_subject_idx     on faculty_topics(subject_id);
create index faculty_notes_subject_idx      on faculty_notes(subject_id);
create index faculty_notes_topic_idx        on faculty_notes(topic_id);
create index faculty_deadlines_subject_idx  on faculty_deadlines(subject_id);
create index faculty_deadlines_due_at_idx   on faculty_deadlines(due_at);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table faculty_subjects  enable row level security;
alter table faculty_topics    enable row level security;
alter table faculty_notes     enable row level security;
alter table faculty_deadlines enable row level security;

create policy "owner_all" on faculty_subjects
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "owner_all" on faculty_topics
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "owner_all" on faculty_notes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "owner_all" on faculty_deadlines
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
