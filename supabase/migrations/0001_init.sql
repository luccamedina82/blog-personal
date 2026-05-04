-- 0001_init.sql
-- Run in Supabase SQL Editor

create extension if not exists "uuid-ossp";

-- ============================================================
-- PROFILES
-- ============================================================
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text,
  created_at timestamptz default now()
);

-- Auto-create profile on signup
-- set search_path = public required: security definer functions run with restricted search_path
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email) values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ============================================================
-- ANKI
-- ============================================================
create table decks (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  category text not null check (category in ('vocab','phrasal','idioms','book-quotes','tech-notes')),
  description text,
  created_at timestamptz default now()
);

create table cards (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  deck_id uuid not null references decks(id) on delete cascade,
  front text not null,
  back text not null,
  tags text[] default '{}',
  ease numeric default 2.5,
  interval_days integer default 0,
  due timestamptz default now(),
  reviews integer default 0,
  source_kind text check (source_kind in ('evaluator','devlab','bitacora','book')),
  source_ref text,
  created_at timestamptz default now()
);

-- ============================================================
-- VOCAB
-- ============================================================
create table vocab_entries (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('word','phrase','connector')),
  term text not null,
  meaning text not null,
  example text,
  tags text[] default '{}',
  created_at timestamptz default now()
);

-- ============================================================
-- EVALUATOR
-- ============================================================
create table evaluator_runs (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source text not null check (source in ('paste','devlab','bitacora')),
  source_ref text,
  input_text text not null,
  scores jsonb not null,
  created_at timestamptz default now()
);

-- ============================================================
-- SHADOWING
-- ============================================================
create table shadowing_sessions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  storage_path text not null,
  kind text not null check (kind in ('audio','video')),
  duration_seconds numeric,
  transcript jsonb default '[]',
  notes text default '',
  quality text check (quality in ('mastered','review','needs-work')),
  created_at timestamptz default now()
);

-- ============================================================
-- BOOKS
-- ============================================================
create table books (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  author text,
  rating integer check (rating between 0 and 5),
  summary text,
  tags text[] default '{}',
  created_at timestamptz default now()
);

create table book_annotations (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  book_id uuid not null references books(id) on delete cascade,
  kind text not null check (kind in ('quote','note','highlight')),
  content text not null,
  page integer,
  created_at timestamptz default now()
);

-- ============================================================
-- DEVLAB
-- ============================================================
create table devlab_categories (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  slug text not null,
  label text not null,
  description text,
  icon text
);

create table devlab_posts (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category_id uuid references devlab_categories(id) on delete set null,
  title text not null,
  excerpt text,
  blocks jsonb default '[]',
  tags text[] default '{}',
  pinned boolean default false,
  reading_time text,
  created_at timestamptz default now()
);

-- ============================================================
-- JOURNAL
-- ============================================================
create table journal_posts (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('text','gallery','video')),
  title text,
  mood text,
  content text,
  caption text,
  media_paths text[] default '{}',
  meta text,
  created_at timestamptz default now()
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table profiles enable row level security;
alter table decks enable row level security;
alter table cards enable row level security;
alter table vocab_entries enable row level security;
alter table evaluator_runs enable row level security;
alter table shadowing_sessions enable row level security;
alter table books enable row level security;
alter table book_annotations enable row level security;
alter table devlab_categories enable row level security;
alter table devlab_posts enable row level security;
alter table journal_posts enable row level security;

-- Each table: owner can do everything
create policy "owner_all" on profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

create policy "owner_all" on decks
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "owner_all" on cards
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "owner_all" on vocab_entries
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "owner_all" on evaluator_runs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "owner_all" on shadowing_sessions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "owner_all" on books
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "owner_all" on book_annotations
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "owner_all" on devlab_categories
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "owner_all" on devlab_posts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "owner_all" on journal_posts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ============================================================
-- STORAGE BUCKET (run after creating bucket "media" in dashboard)
-- ============================================================
-- Bucket policy: users read/write only under their own user_id prefix
-- Create this in Storage > Policies tab after creating the bucket:
--
-- INSERT policy:
--   (storage.foldername(name))[1] = auth.uid()::text
--
-- SELECT policy:
--   (storage.foldername(name))[1] = auth.uid()::text
--
-- DELETE policy:
--   (storage.foldername(name))[1] = auth.uid()::text
