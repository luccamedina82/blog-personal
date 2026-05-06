-- 0006_topic_citations_and_deadlines.sql
-- Fase 10h: citas por tema + grade/nota en deadlines

-- Citas de recursos (notas faculty/devlab, libros library) vinculadas a temas del temario
create table faculty_topic_citations (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  topic_id uuid not null references faculty_topics(id) on delete cascade,
  source_kind text not null check (source_kind in ('faculty_note', 'devlab_post', 'library_book')),
  source_id uuid not null,
  source_title text,                         -- denormalizado para display sin join
  source_storage_path text,                  -- solo library_book (storage path del PDF)
  page integer,                              -- solo library_book
  note text,                                 -- contexto opcional de la cita
  order_index integer not null default 0,
  created_at timestamptz default now()
);

create index faculty_topic_citations_topic_idx on faculty_topic_citations(topic_id);
create index faculty_topic_citations_source_idx on faculty_topic_citations(source_kind, source_id);

alter table faculty_topic_citations enable row level security;
create policy "owner_all" on faculty_topic_citations
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Vincular topic groups a deadlines (ej. "Parcial 1" → parcial deadline)
alter table faculty_topic_groups
  add column if not exists deadline_id uuid references faculty_deadlines(id) on delete set null;

-- Agregar nota numérica y nota apunte vinculada a deadlines
alter table faculty_deadlines
  add column if not exists grade numeric,
  add column if not exists note_id uuid references faculty_notes(id) on delete set null;

-- Agregar 'resumen' como kind válido para notas (nuevas notas de repaso/devolución)
-- Mantiene tp/parcial/final para backward compat con notas ya existentes
alter table faculty_notes drop constraint if exists faculty_notes_kind_check;
alter table faculty_notes add constraint faculty_notes_kind_check
  check (kind in ('clase', 'apunte', 'tp', 'parcial', 'final', 'resumen'));
