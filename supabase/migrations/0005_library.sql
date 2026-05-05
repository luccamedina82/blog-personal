-- supabase/migrations/0005_library.sql

create extension if not exists "uuid-ossp";

-- Biblioteca: PDFs centralizados que alimentan faculty/devlab/english
create table library_books (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  author text,
  storage_path text not null,
  page_count integer,
  cover_path text,
  tags text[] default '{}',
  module_tags text[] default '{}',
  created_at timestamptz default now()
);

-- Citas: vinculan una nota (faculty o devlab) a un libro + página
-- source_id es FK lógica (no SQL) hacia faculty_notes o devlab_posts según source_kind
create table book_citations (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  book_id uuid not null references library_books(id) on delete cascade,
  source_kind text not null check (source_kind in ('faculty_note', 'devlab_post')),
  source_id uuid not null,
  page integer not null,
  note text,
  created_at timestamptz default now()
);

create index book_citations_source_idx on book_citations(source_kind, source_id);
create index book_citations_book_idx on book_citations(book_id);

alter table library_books  enable row level security;
alter table book_citations enable row level security;

create policy "owner_all" on library_books
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "owner_all" on book_citations
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
