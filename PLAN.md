# Plan de Refactor — Módulo English + Roadmap del Proyecto

> **Para futuras sesiones (Sonnet 4.6+):** este archivo es el estado de la planificación. Marcar tareas con `[x]` al completarlas. Agregar nuevas tareas debajo de cada fase si surge scope. No borrar tareas completadas — son historial.

---

## 0. Contexto

- **Stack actual:** Vite + React 19 + TanStack Router + Tailwind 4 + Radix UI + recharts + react-hook-form + zod + cmdk + sonner + vaul
- **Working dir:** `C:\Users\lucca\desktop\react\blogpersonal`
- **Rutas existentes:** `/`, `/devlab`, `/bitacora`, `/english`
- **Owner:** un solo usuario (Lucca). No hay multi-tenant.
- **Backend:** Supabase desde día 1 (Postgres + Storage + Auth). NestJS = diferido / opcional cuando aparezca lógica que justifique servidor propio (IA proxy, jobs cron, webhooks).
- **Hosting frontend:** Vercel (free tier).

---

## 1. Decisiones tomadas

| Decisión | Valor | Nota |
|----------|-------|------|
| Persistencia | **Supabase Postgres desde Fase 1** | localStorage solo para UI state efímero |
| Backend custom | **NestJS diferido / opcional** | Solo cuando IA/jobs lo justifiquen |
| Auth | **Supabase Auth desde Fase 0** | Magic link primero, password opcional después |
| Hosting frontend | **Vercel** | Deploy continuo desde Fase 0 |
| Audio/video | **Supabase Storage** | Bucket privado, signed URLs |
| Tip del día | Mock estático curado ~50 entries | Shape preparada para IA |
| Anki import/export | Deuda técnica, prototipo visual ahora | librería futura: `genanki-js` |
| Facultad / Personal | Módulos aparte (`/faculty`, `/personal`) | rutas separadas, mismo Supabase project |
| Estructura inglés | Tabs / nested routes en `/english` | URL persiste tab activa |
| RLS | Sí, single-user pero con `user_id` desde día 1 | Evita migración futura si invitás a alguien |

### Pivote registrado (2026-05-03)

Decisión original: localStorage fases 1-6 → NestJS+Supabase fase 7. **Cambiada** a: Supabase desde Fase 1, NestJS opcional / diferido. Razón: usar la app online desde día 1, evitar migración dolorosa, multi-device gratis, motivación de tener producción visible.

---

## 2. Arquitectura objetivo

```
[React (Vercel)] ──supabase-js──> [Supabase: Postgres + Auth + Storage]
                                          │
                                          └─ (futuro) [NestJS] cuando aparezca IA/jobs
```

```
src/routes/english/
  index.tsx              → redirect a /english/anki
  anki.tsx
  evaluator.tsx
  vocab.tsx
  shadowing.tsx
  books.tsx
src/routes/login.tsx     → magic link

src/components/english/
  english-shell.tsx      → layout compartido (header + tab nav)
  anki/
    deck-grid.tsx
    deck-view.tsx
    card-editor.tsx
    study-mode.tsx
    srs.ts               → SM-2 lite
  evaluator/
    source-picker.tsx    → paste | bitacora | devlab
    history-chart.tsx
  vocab/
    vocab-table.tsx
    phrases-table.tsx
    connectors-grid.tsx
    tip-of-day.tsx
    vocab-form.tsx
  shadowing/
    session-list.tsx
    session-recorder.tsx
    transcript-pane.tsx
    notes-pane.tsx
  books/
    book-detail.tsx

src/lib/
  supabase.ts            → createClient singleton
  auth.ts                → useAuth hook + route guard
  english/
    types.ts             → mirror de schema Postgres
    queries.ts           → wrappers tipados sobre supabase-js
src/mocks/english-section-mock.ts   → DAILY_TIPS estático

supabase/
  migrations/            → SQL versionado
  seed.sql               → seed de DAILY_TIPS si lo querés en DB
```

**Cross-module bridges:**
- Evaluator lee posts de tablas `devlab_posts` y `journal_posts`
- "Crear card Anki" desde texto seleccionado en evaluator/vocab/books

---

## 3. Schema Postgres (Supabase)

```sql
-- supabase/migrations/0001_init.sql

create extension if not exists "uuid-ossp";

-- Profiles (1:1 con auth.users)
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text,
  created_at timestamptz default now()
);

-- Anki
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
  source_kind text,
  source_ref text,
  created_at timestamptz default now()
);

-- Vocab
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

-- Evaluator history
create table evaluator_runs (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source text not null check (source in ('paste','devlab','bitacora')),
  source_ref text,
  text text not null,
  scores jsonb not null,
  created_at timestamptz default now()
);

-- Shadowing
create table shadowing_sessions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  storage_path text not null,        -- ruta en bucket
  kind text not null check (kind in ('audio','video')),
  duration_seconds numeric,
  transcript jsonb default '[]',
  notes text default '',
  quality text check (quality in ('mastered','review','needs-work')),
  created_at timestamptz default now()
);

-- Books
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

-- DevLab + Journal (migrados desde mocks)
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

create table journal_posts (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('text','gallery','video')),
  title text,
  mood text,
  content text,
  caption text,
  media_paths text[] default '{}',   -- rutas en bucket
  meta text,
  created_at timestamptz default now()
);

-- RLS: enable on all
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

-- Policy genérica: dueño puede todo
create policy "owner_all" on decks
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
-- repetir para cada tabla (script abajo)
```

> **Nota:** repetir policy `owner_all` para cada tabla. En Fase 0 escribir un loop SQL o repetir manual. RLS desde día 1 evita refactor mañana.

### Schema Faculty + Personal (Fases 8–10)

```sql
-- supabase/migrations/000X_faculty.sql

-- Faculty
create table faculty_subjects (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  code text,                       -- "MAT-101"
  status text not null check (status in ('cursando','final-pendiente','aprobada','recursar')) default 'cursando',
  semester text,                   -- "2026-1C"
  professor text,
  credits integer,
  color text,                      -- hex UI
  created_at timestamptz default now()
);

create table faculty_topics (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subject_id uuid not null references faculty_subjects(id) on delete cascade,
  title text not null,
  order_index integer default 0,
  status text check (status in ('pendiente','visto','dominado')) default 'pendiente',
  created_at timestamptz default now()
);

create table faculty_notes (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subject_id uuid not null references faculty_subjects(id) on delete cascade,
  topic_id uuid references faculty_topics(id) on delete set null,
  kind text not null check (kind in ('clase','apunte','tp','parcial','final')),
  title text not null,
  date date,                       -- fecha clase / entrega
  blocks jsonb default '[]',       -- reuso DevLab block model
  tags text[] default '{}',
  grade numeric,                   -- nota TP/parcial/final
  created_at timestamptz default now()
);

create table faculty_deadlines (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subject_id uuid not null references faculty_subjects(id) on delete cascade,
  kind text not null check (kind in ('tp','parcial','final','recuperatorio','entrega')),
  title text not null,
  due_at timestamptz not null,
  done boolean default false,
  note text,
  created_at timestamptz default now()
);

alter table faculty_subjects  enable row level security;
alter table faculty_topics    enable row level security;
alter table faculty_notes     enable row level security;
alter table faculty_deadlines enable row level security;
-- policy owner_all en cada una

-- supabase/migrations/000Y_personal.sql

-- Personal
create table habits (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  cue text,                        -- atomic habits trigger
  frequency text not null check (frequency in ('daily','weekly')) default 'daily',
  weekly_target integer,           -- usado si frequency=weekly
  color text,
  archived boolean default false,
  created_at timestamptz default now()
);

create table habit_logs (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  habit_id uuid not null references habits(id) on delete cascade,
  log_date date not null,
  unique (habit_id, log_date)
);

create table tasks (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  notes text,
  priority text check (priority in ('p1','p2','p3','p4')) default 'p3',
  due_date date,
  done boolean default false,
  done_at timestamptz,
  recurring text check (recurring in ('daily','weekly')),
  created_at timestamptz default now()
);

create table mood_logs (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  log_date date not null,
  mood integer check (mood between 1 and 5),
  energy integer check (energy between 1 and 5),
  note text,
  unique (user_id, log_date)
);

alter table habits     enable row level security;
alter table habit_logs enable row level security;
alter table tasks      enable row level security;
alter table mood_logs  enable row level security;
-- policy owner_all en cada una
```

---

## 4. Tipos TypeScript (mirror del schema)

```ts
// src/lib/english/types.ts
export type Deck = {
  id: string
  user_id: string
  name: string
  category: 'vocab' | 'phrasal' | 'idioms' | 'book-quotes' | 'tech-notes'
  description: string | null
  created_at: string
}

export type Card = {
  id: string
  user_id: string
  deck_id: string
  front: string
  back: string
  tags: string[]
  ease: number
  interval_days: number
  due: string
  reviews: number
  source_kind: 'evaluator' | 'devlab' | 'bitacora' | 'book' | null
  source_ref: string | null
  created_at: string
}

export type VocabEntry = {
  id: string
  user_id: string
  kind: 'word' | 'phrase' | 'connector'
  term: string
  meaning: string
  example: string | null
  tags: string[]
  created_at: string
}

export type EvaluatorRun = {
  id: string
  user_id: string
  source: 'paste' | 'devlab' | 'bitacora'
  source_ref: string | null
  text: string
  scores: Array<{ metric: string; value: number }>
  created_at: string
}

export type ShadowingSession = {
  id: string
  user_id: string
  title: string
  storage_path: string
  kind: 'audio' | 'video'
  duration_seconds: number | null
  transcript: Array<{ start: number; end: number; text: string }>
  notes: string
  quality: 'mastered' | 'review' | 'needs-work' | null
  created_at: string
}

// DailyTip se mantiene en mock estático (no en DB)
export type DailyTip = {
  id: string
  kind: 'word' | 'phrase' | 'idiom' | 'connector'
  term: string
  meaning: string
  example: string
  register: 'casual' | 'neutral' | 'formal'
  source?: string
}

// Faculty (Fase 8-9)
export type FacultySubject = {
  id: string
  user_id: string
  name: string
  code: string | null
  status: 'cursando' | 'final-pendiente' | 'aprobada' | 'recursar'
  semester: string | null
  professor: string | null
  credits: number | null
  color: string | null
  created_at: string
}

export type FacultyTopic = {
  id: string
  user_id: string
  subject_id: string
  title: string
  order_index: number
  status: 'pendiente' | 'visto' | 'dominado'
  created_at: string
}

export type FacultyNote = {
  id: string
  user_id: string
  subject_id: string
  topic_id: string | null
  kind: 'clase' | 'apunte' | 'tp' | 'parcial' | 'final'
  title: string
  date: string | null
  blocks: unknown[]                 // reuso DevLab block shape
  tags: string[]
  grade: number | null
  created_at: string
}

export type FacultyDeadline = {
  id: string
  user_id: string
  subject_id: string
  kind: 'tp' | 'parcial' | 'final' | 'recuperatorio' | 'entrega'
  title: string
  due_at: string
  done: boolean
  note: string | null
  created_at: string
}

// Personal (Fase 10)
export type Habit = {
  id: string
  user_id: string
  name: string
  cue: string | null
  frequency: 'daily' | 'weekly'
  weekly_target: number | null
  color: string | null
  archived: boolean
  created_at: string
}

export type HabitLog = {
  id: string
  user_id: string
  habit_id: string
  log_date: string
}

export type Task = {
  id: string
  user_id: string
  title: string
  notes: string | null
  priority: 'p1' | 'p2' | 'p3' | 'p4'
  due_date: string | null
  done: boolean
  done_at: string | null
  recurring: 'daily' | 'weekly' | null
  created_at: string
}

export type MoodLog = {
  id: string
  user_id: string
  log_date: string
  mood: number | null
  energy: number | null
  note: string | null
}
```

> **Sugerencia:** generar tipos auto desde Supabase con `supabase gen types typescript` para tener sync schema↔TS sin escribir a mano.

---

## 5. Roadmap por fases

### Fase 0 — Setup Supabase + Auth + Vercel (1/2 día)

- [x] Crear proyecto Supabase (free tier) (2026-05-03)
- [x] Anotar `SUPABASE_URL`, `SUPABASE_ANON_KEY` — en `.env.local` (no commitear) (2026-05-03)
- [x] Crear `.env.local` con `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` (2026-05-03)
- [x] Agregar `.env*` a `.gitignore` (2026-05-03)
- [x] Instalar `@supabase/supabase-js` con pnpm (2026-05-03)
- [x] Crear `src/lib/supabase.ts` con `createClient` singleton (2026-05-03)
- [x] Correr migración inicial `0001_init.sql` (todas las tablas + RLS) en SQL Editor (2026-05-03)
- [x] Trigger `handle_new_user` — fix `set search_path = public` aplicado en Supabase + repo actualizado (2026-05-03)
- [x] Habilitar Magic Link en Auth → Email Provider (2026-05-03)
- [x] Configurar redirect URLs: `http://localhost:5173/auth/callback` (2026-05-03)
- [x] Crear `src/routes/login.tsx` (form email + magic link) (2026-05-03)
- [x] Crear `src/routes/auth/callback.tsx` (PKCE exchange + redirect) (2026-05-03)
- [x] Crear `src/lib/auth.ts` (`useAuth` hook + `signOut`) (2026-05-03)
- [x] Aplicar guard `beforeLoad` en `__root.tsx` (excepto `/login` y `/auth/callback`) (2026-05-03)
- [x] Self-signup con tu email (`luccamedina03@gmail.com`) — trigger fix confirmado (2026-05-03)
- [x] Crear bucket `media` en Supabase Storage (privado) (2026-05-03)
- [x] Política bucket: usuarios solo leen/escriben en `${user.id}/*` (2026-05-03)
- [x] Conectar repo a Vercel (importar proyecto) (2026-05-03)
- [x] Setear env vars en Vercel: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (2026-05-03)
- [x] Agregar URL de Vercel a redirect URLs en Supabase (2026-05-03)
- [x] Deploy preview funcionando (2026-05-03)
- [x] Verificar login funciona en producción (2026-05-03)

**Salida:** app online en Vercel, login con magic link funcionando, DB lista, bucket listo.

---

### Fase 1 — Restructure /english + queries layer (1 día)

- [ ] Generar tipos TS desde Supabase: `npx supabase gen types typescript --project-id <id> > src/lib/database.types.ts`
- [x] Crear `src/lib/english/queries.ts` (wrappers tipados sobre supabase-js para todas las tablas) (2026-05-03)
- [x] Crear `src/mocks/english-section-mock.ts` con `DAILY_TIPS` estático (30 entries iniciales) (2026-05-03)
- [x] Convertir `/english` en route group con nested routes: (2026-05-03)
  - [x] `src/routes/english/index.tsx` → redirect a `/english/anki`
  - [x] `src/routes/english/anki.tsx`
  - [x] `src/routes/english/evaluator.tsx`
  - [x] `src/routes/english/vocab.tsx`
  - [x] `src/routes/english/shadowing.tsx`
  - [x] `src/routes/english/books.tsx`
- [x] Crear `EnglishShell` con tab nav (header + 5 tabs) (2026-05-03)
- [x] Contenido migrado desde `english-section.tsx` a rutas individuales (2026-05-03)
- [ ] Eliminar `english-section.tsx` viejo (pendiente — no causa errores)
- [x] Migrar BOOKS hardcoded actuales a tabla `books` — books.tsx reescrito con Supabase (2026-05-04)

**Salida:** podés navegar `/english/anki`, `/english/vocab`, etc. con shell + placeholder. Queries layer listo.

---

### Fase 2 — Evaluator++ (1 día)

- [ ] Migrar mocks de DevLab y Journal a tablas (seed inicial desde SQL editor con tu user_id)
- [x] `SourcePicker` con 3 modos: paste / Bitácora / DevLab (2026-05-03)
  - [x] Paste: textarea actual
  - [x] Bitácora: select que llama `queries.listJournalPostsForEvaluator()`
  - [x] DevLab: select que llama `queries.listDevLabPostsForEvaluator()`
- [x] Modificar `TextAnalyzer` para aceptar `source`, `sourceRef`, `initialText`, `onSaved` (2026-05-03)
- [x] Persistir cada análisis: `queries.createEvaluatorRun(...)` (2026-05-03)
- [x] `HistoryChart`: recharts LineChart overall score + tabla últimas 10 runs (2026-05-03)
- [x] Botón "Limpiar historial" con `AlertDialog` + `queries.clearEvaluatorHistory()` (2026-05-03)
- [ ] Bonus: highlights inline en el texto

**Salida:** análisis sobre tus propias notas + evolución persistente.

---

### Fase 3 — Vocab+ (1 día)

- [x] Tabs internos: Words | Phrases | Connectors | Tip del día (2026-05-04)
- [x] CRUD vocab con `Dialog` + `react-hook-form` + `zod` (2026-05-04)
- [x] Persistencia vía `queries.createVocab/updateVocab/deleteVocab` (2026-05-04)
- [x] Búsqueda client-side por term/meaning/example/tags en `VocabTable` (2026-05-04)
- [x] Filtros por kind por tab (Words / Phrases / Connectors) (2026-05-04)
- [x] **Tip del día:** (2026-05-04)
  - [x] `DAILY_TIPS` array curado 30 entries en mock (no en DB)
  - [x] `TipOfDay` rota por `new Date().getDate() % len`
  - [ ] Botón "guardar como card Anki" → `queries.createCard` *(deferido a Fase 4 — requiere deck_id)*
- [x] **Seed:** `supabase/seed.sql` — 5 decks + 26 vocab entries (words/phrases/connectors). Correr en SQL Editor de Supabase (auto-detecta user_id). (2026-05-04)

**Salida:** vocab CRUD funcional online + tip diario rotativo. Build limpio.

---

**Última actualización:** 2026-05-04
**Estado:** Fase 3 COMPLETA. Vocab CRUD con tabs, search, Supabase persistencia. Siguiente: seed inicial + Fase 4 (Anki Lab).

---

### Fase 4 — Anki Lab (prototipo visual, 2 días)

- [x] `DeckGrid` reusando patrón de `CategoryGrid` de devlab (2026-05-04)
- [x] 5 categorías de mazos: Vocab / Phrasal Verbs / Idioms / Book Quotes / Tech Notes (2026-05-04)
- [x] CRUD decks (modal create + delete confirmation) (2026-05-04)
- [x] `DeckView`: lista de cards de un mazo + acciones (edit/delete/due badge) (2026-05-04)
- [x] `CardEditor`: front/back/tags (modal con form, create y edit) (2026-05-04)
- [x] `StudyMode`: (2026-05-04)
  - [x] Card flip animation (CSS 3D transform + Tailwind arbitrary values)
  - [x] Botones: Easy / Good / Hard / Again
  - [x] SRS lite (SM-2) en `src/lib/english/srs.ts`: actualiza ease/interval_days/due
  - [x] Filtra cards `due <= now()` en SQL (`listDueCards`)
- [x] `SaveToAnkiButton` — componente standalone reutilizable con deck selector (2026-05-04)
- [x] Conectar con vocab: botón "→ Anki" por fila en `VocabTable` (2026-05-04)
- [x] Conectar con books (botón → Anki en quotes de BookDetail) (2026-05-04)
- [ ] Conectar con evaluator (botón → Anki) *(deferido — evaluator usa mock heurístico)*

**TECH DEBT marcada:** Anki import/export `.apkg` real → ver sección 7.

**Salida:** mazos online, cards persistidas, SRS básico, vocab cross-linked. Build limpio.

---

### Fase 5 — Shadowing Studio (2 días)

- [x] `SessionList`: query `shadowing_sessions order by created_at desc` (2026-05-04)
- [x] Upload audio/video → `supabase.storage.from('media').upload(...)` con drag-and-drop (2026-05-04)
- [x] Crear row en `shadowing_sessions` con `storage_path` + duración auto-detectada (2026-05-04)
- [x] `SessionUpload`: file picker con drag-and-drop (2026-05-04)
- [x] Por sesión: (2026-05-04)
  - [x] Resolver URL: `supabase.storage.from('media').createSignedUrl(path, 3600)`
  - [x] `WaveformPlayer` con HTML5 Audio real (audioUrl prop, simulated mode preservado)
  - [x] `TranscriptPane`: líneas `{start, text}` editables, autosave debounced, highlight activa
  - [x] `NotesPane`: textarea con autosave debounced 600ms + indicador "Saved ✓"
  - [x] Tag de calidad: mastered / review / needs-work
- [x] Stats reales: count, streak (group by date), sum duration (2026-05-04)
- [x] Eliminar sesión: storage primero → DB row (2026-05-04)
- [x] **Categorías de sesiones** (2026-05-04)
  - [x] Migración SQL: tabla `shadowing_categories` + FK `category_id` en `shadowing_sessions` (2026-05-04)
  - [x] CRUD categorías (crear, renombrar, eliminar — sessions quedan sin categoría al borrar) (2026-05-04)
  - [x] `CategoryGrid` view como pantalla principal de shadowing (2026-05-04)
  - [x] `SessionList` filtrada por categoría + breadcrumb back (2026-05-04)
  - [x] Asignar categoría en upload + en session-detail (2026-05-04)
  - [x] Queries: `listShadowingCategories`, `createShadowingCategory`, `updateShadowingCategory`, `deleteShadowingCategory` (2026-05-04)
  - [x] Types: `ShadowingCategory` + `category_id` en `ShadowingSession` (2026-05-04)

**Salida:** subís audios al cloud, los reproducís con signed URL, anotás transcripción y notas.

---

### Fase 6 — Books Detail + Cross-Links (1 día)

- [x] `BookDetail` view: clicar libro abre vista expandida (lee `book_annotations`) (2026-05-04)
- [x] Books CRUD completo: BookForm (create/edit), grid con hover edit/delete (2026-05-04)
- [x] `AnnotationForm`: kind (quote/note/highlight) + content + page opcional (2026-05-04)
- [x] CRUD anotaciones vía queries (`createBookAnnotation`, `deleteBookAnnotation`) (2026-05-04)
- [x] Botón "→ Anki" en cada quote (`SaveToAnkiButton`, source_kind=book) (2026-05-04)
- [x] Búsqueda global con `cmdk` (`⌘K`): decks / vocab / books / sessions en paralelo, filter client-side (2026-05-04)
- [x] Atajos teclado: `g a` → /english/anki, `g v` → /english/vocab, `g e` → /english/evaluator, `g s` → /english/shadowing, `g b` → /english/books (2026-05-04)

**Salida:** lectura + anotaciones unificadas, búsqueda global cross-DB.

---

### Fase 7 — DevLab CRUD + Editor mejorado (2-3 días)

> Prerrequisito: migrar DevLab de mock a Supabase. Actualmente toda la data viene de `src/mocks/devlab-section-mock.ts` y se persiste solo en React state.

#### 7a — Migración a Supabase
- [x] Crear `src/lib/devlab/types.ts`: `DevLabCategory`, `DevLabPost`, `DevLabBlock`, `PostDraft` (2026-05-04)
- [x] Crear `src/lib/devlab/queries.ts`: listCategories/Posts, create/update/delete para categorías y posts (2026-05-04)
- [x] Reescribir `devlab-section.tsx` para leer de Supabase (2026-05-04)
- [x] Seed: 6 categorías DevLab en `supabase/seed.sql` (2026-05-04)
- [x] Borrar `src/mocks/devlab-section-mock.ts` (2026-05-04)

#### 7b — CRUD Posts
- [x] Persistir `createPost` en Supabase (reading_time computado del contenido) (2026-05-04)
- [x] Editar post: editor pre-cargado con `initial` prop + `updatePost` (2026-05-04)
- [x] Eliminar post: `AlertDialog` en `PostView` + en lista (2026-05-04)

#### 7c — CRUD Categorías
- [x] `CategoryForm` modal: label, description, icon picker (20 íconos Lucide) (2026-05-04)
- [x] Crear / editar categoría (2026-05-04)
- [x] Eliminar categoría con `AlertDialog` (2026-05-04)

#### 7d — Reorden de bloques
- [x] `moveBlock(id, 'up' | 'down')` en `DevLabPostEditor` (2026-05-04)
- [x] Botones ▲▼ por bloque, deshabilitados en extremos (2026-05-04)
- [ ] Drag-and-drop con `@dnd-kit/core` *(diferido, nice-to-have)*

#### 7e — Rich text + nuevos tipos de bloque (Tiptap)
- [x] Instalar `@tiptap/react @tiptap/starter-kit @tiptap/extension-underline @tiptap/extension-placeholder` (2026-05-04)
- [x] `TiptapEditor`: toolbar estático B/I/U/H1/H2/H3/listas/blockquote/code inline (2026-05-04)
- [x] `TextBlockEditor` usa Tiptap, almacena HTML en `block.html` (2026-05-04)
- [x] Nuevo `ImageBlockEditor`: drag-drop/click → upload Supabase Storage → `block.storage_path` (2026-05-04)
- [x] `PostView` renderiza HTML con `.tiptap-render` CSS, imágenes con signed URL (2026-05-04)
- [x] Estilos ProseMirror + tiptap-render en `index.css` (2026-05-04)

**Salida:** DevLab totalmente funcional online — categorías y posts en Supabase, editor Tiptap con rich text, imágenes al bucket, reorden con ▲▼.

---

### Fase 8 — Faculty MVP (2-3 días)

> Inicio módulo `/faculty`. Empezar limpio (no importar Notion). Reusa `DevLabPostEditor` (Tiptap) para notas. Sin KaTeX, sin pomodoro/gym (decisión 2026-05-04).

#### 8a — Setup ruta + schema
- [ ] Migración SQL `supabase/migrations/0004_faculty.sql`: 4 tablas (subjects/topics/notes/deadlines) + RLS owner_all
- [ ] Correr migración en Supabase SQL editor
- [ ] Crear `src/lib/faculty/types.ts` con `FacultySubject`, `FacultyTopic`, `FacultyNote`, `FacultyDeadline`
- [ ] Crear `src/lib/faculty/queries.ts`: list/create/update/delete para subjects + notes + deadlines
- [ ] Agregar `/faculty` al header nav (entre `/devlab` y `/english`)
- [ ] `src/routes/faculty/index.tsx` → dashboard (próximos deadlines + grid materias)
- [ ] `src/routes/faculty/$subjectId.tsx` → vista materia individual
- [ ] `src/components/faculty/faculty-shell.tsx` (header + back nav)

#### 8b — Subjects CRUD
- [ ] `SubjectGrid`: cards por materia con name, code, semester, status badge, color
- [ ] `SubjectForm` modal: name, code, semester, professor, credits, color picker, status select
- [ ] Filtro por status (cursando / final-pendiente / aprobada / recursar)
- [ ] Eliminar materia con `AlertDialog` (cascade borra notas + deadlines)
- [ ] Color como border-left de card para identificar visualmente

#### 8c — Notes CRUD por materia
- [ ] `NotesList` dentro de `SubjectDetail`: filtros por kind (clase / apunte / tp / parcial / final)
- [ ] `NoteEditor` reusando `DevLabPostEditor` (Tiptap, blocks jsonb)
- [ ] Campos extra: `kind` select, `date` (date picker), `grade` (solo para tp/parcial/final), `tags`
- [ ] `NoteView` reusando estilos `.tiptap-render` de DevLab
- [ ] Cross-link "→ Anki" en notas (reusar `SaveToAnkiButton`, `source_kind='faculty'`)

#### 8d — Deadlines lista + countdown
- [ ] `DeadlineList`: orden por `due_at asc`, separador hoy/semana/mes/después
- [ ] `DeadlineForm` modal: subject_id, kind, title, due_at (datetime-local), note
- [ ] Toggle `done` con checkbox
- [ ] `CountdownBadge`: "en 3 días", "mañana", "vencido" — color según urgencia
- [ ] Widget "próximos deadlines" en dashboard `/faculty` (top 5)
- [ ] Eliminar deadline con confirm

#### 8e — Dashboard
- [ ] `/faculty/index.tsx`: grid materias activas + próximos 5 deadlines + count tareas pendientes
- [ ] Stat cards: materias cursando, deadlines esta semana, promedio general

**Salida:** `/faculty` operativo — materias CRUD, notas Tiptap por materia, deadlines lista con countdown.

---

### Fase 9 — Faculty avanzado (1-2 días)

#### 9a — Topics + progreso
- [ ] CRUD `faculty_topics` por materia (programa de la materia)
- [ ] `TopicList` con drag-handle (botones ▲▼ primero) y status select (pendiente/visto/dominado)
- [ ] Asociar nota a topic via `topic_id` (select en `NoteEditor`)
- [ ] Progress bar por materia: % topics dominados / total
- [ ] Vista agregada: `subject.progress = topics dominados / topics total`

#### 9b — Grades tracker
- [ ] Tabla calificaciones por materia (todas las notas con `grade not null`)
- [ ] Promedio por materia (avg grade en notas tp/parcial/final)
- [ ] Promedio general (avg sobre subjects aprobadas)
- [ ] Gráfico recharts: evolución promedio por semestre

#### 9c — Backlinks `[[nota]]`
- [ ] Parser markdown-ish en TextBlockEditor: detectar `[[título-nota]]`
- [ ] Autocomplete al escribir `[[`: sugiere notas existentes (cross-materia)
- [ ] Renderer: link clickeable en `NoteView`
- [ ] Vista "referenciada por" en `NoteView` (incoming links query)

#### 9d — Export PDF apunte
- [ ] Instalar `jspdf` + `html2canvas` o `react-pdf`
- [ ] Botón "Export PDF" en `NoteView` → renderiza HTML de tiptap a PDF
- [ ] Header con materia + fecha + título

**Salida:** progreso visible por materia, calificaciones agregadas, notas linkeadas, export imprimible.

---

### Fase 10 — Personal (2 días)

> Módulo `/personal`. Solo habits + tasks + mood. Sin pomodoro, sin gym (decisión 2026-05-04 — apps dedicadas son mejores).

#### 10a — Setup
- [ ] Migración SQL `supabase/migrations/0005_personal.sql`: habits, habit_logs, tasks, mood_logs + RLS
- [ ] `src/lib/personal/types.ts`: `Habit`, `HabitLog`, `Task`, `MoodLog`
- [ ] `src/lib/personal/queries.ts`: CRUD para 4 tablas + helpers (toggleHabitLog por fecha, listTasksByPriority)
- [ ] Agregar `/personal` al header nav
- [ ] `src/routes/personal/index.tsx` → dashboard
- [ ] Tabs internos: Habits | Tasks | Mood (similar a `EnglishShell`)

#### 10b — Habits
- [ ] `HabitsList`: lista con nombre, cue, frequency, racha actual, racha máxima
- [ ] `HabitForm` modal: name, cue (atomic habits trigger), frequency (daily/weekly), weekly_target, color
- [ ] Toggle día actual: click en habit → upsert/delete `habit_logs` para hoy
- [ ] `HabitHeatmap`: grid GitHub-style último año (lib `react-calendar-heatmap` o SVG custom)
- [ ] Streak counter: días consecutivos cumpliendo (query group by date)
- [ ] Best streak histórico
- [ ] Archivar hábito (soft delete con `archived=true`)

#### 10c — Tasks Eisenhower
- [ ] `TaskBoard`: 4 cuadrantes (P1 urgente+importante, P2 importante, P3 urgente, P4 ni)
- [ ] `TaskForm` modal: title, notes, priority, due_date, recurring
- [ ] Toggle `done` con checkbox + `done_at = now()`
- [ ] Filtros: hoy / esta semana / vencidas / completadas
- [ ] Tareas recurrentes: al marcar done, auto-crear próxima instancia (daily → mañana, weekly → +7d)
- [ ] Eliminar tarea con confirm

#### 10d — Mood log
- [ ] Quick-log: 1 click hoy → emoji selector (1-5 mood + 1-5 energy)
- [ ] Nota corta opcional
- [ ] Heatmap mensual (grid emojis por día)
- [ ] Gráfico recharts: tendencia mood/energy últimos 30 días

#### 10e — Dashboard `/personal`
- [ ] Hábitos hoy (checklist quick-toggle)
- [ ] Tareas P1 + vencidas
- [ ] Mood hoy (si no logueado, prompt)
- [ ] Stats semana: % hábitos cumplidos, tareas done, mood avg

**Salida:** `/personal` con habits heatmap + tasks Eisenhower + mood tracking.

---

### Fase 11 — IA real (cuando justifique pagar)

> Acá aparece la pregunta NestJS vs Edge Functions. Decisión deferida hasta llegar.

- [ ] Decisión: **NestJS en Railway** vs **Supabase Edge Functions (Deno)** vs **Vercel Serverless Functions**
  - NestJS = más estructura, más overhead deploy, más control
  - Edge Functions = cero infra, Deno, junto a Supabase
  - Vercel Functions = junto al frontend, simple, Node
- [ ] Decisión: **NestJS en Railway** vs **Supabase Edge Functions (Deno)** vs **Vercel Serverless Functions**
  - NestJS = más estructura, más overhead deploy, más control
  - Edge Functions = cero infra, Deno, junto a Supabase
  - Vercel Functions = junto al frontend, simple, Node
- [ ] Tip del día → endpoint llama Anthropic API con prompt templado, cachea en tabla `ai_cache`
- [ ] Evaluator real → reemplazar mock con Anthropic API (mantener fallback heurístico)
- [ ] Evaluator → Anki: con IA real, sugerir vocabulario específico del texto para guardar como card
- [ ] Transcripción auto shadowing → Whisper API (OpenAI) o Whisper self-hosted
- [ ] Tabla `ai_cache (input_hash, output, model, created_at)` para no pagar 2 veces

---

## 6. Módulos aparte (futuros)

> `/faculty` y `/personal` movidos a Fases 8-10 (2026-05-04). Esta sección queda para otros módulos futuros.

### Posibles futuros

- [ ] `/finance` — gastos + presupuesto (descartado scope creep, reconsiderar)
- [ ] `/reading` — separar libros del módulo english si crece mucho
- [ ] `/projects` — gestión side-projects fuera DevLab (PMO style)

---

## 7. Deuda técnica registrada

| Item | Razón | Cuándo |
|------|-------|--------|
| **Anki import/export real** | Prototipo visual primero | Después fase 4. Librería: `genanki-js` para `.apkg` export. Import = parsear zip + sqlite custom. |
| **Tip del día con IA real** | Mock estático cubre fase 1 | Fase 7 |
| **Evaluator con IA real** | Mock heurístico funciona como demo | Fase 7 |
| **Transcripción auto shadowing** | Manual primero | Fase 7 |
| **NestJS** | Supabase directo cubre 95% | Cuando aparezca lógica server-side (IA proxy, jobs, webhooks) |
| **Auth con OAuth (Google/GitHub)** | Magic link suficiente single-user | Si invitás a alguien |
| **Auto-generated TS types** | Manual mirror funciona | Idealmente desde Fase 1 con `supabase gen types` |
| **Offline-first** | Online OK por ahora | Si lo necesitás en metro/avión: TanStack Query + persist + queue mutations |
| **Search global cross-módulos** | Solo dentro de english | Fase 6 |
| **Test coverage** | Sin tests aún | Cuando estabilice arquitectura |
| **Mobile responsive review** | Layouts pensados desktop-first | Auditoría al final de fase 6 |
| **Migrations versionadas** | SQL manual al principio | Adoptar Supabase CLI + migrations dir cuando haya 3+ migrations |
| **Calendario faculty (vista mes)** | Lista + countdown cubre Fase 8 | Cuando lista deadlines crezca >30 items. Lib: `react-day-picker` o custom grid mes |
| **KaTeX en faculty notes** | Sin materias mate/física por ahora | Si aparecen. `@tiptap/extension-mathematics` o `katex` + custom extension |
| **Pomodoro** | Apps dedicadas (Forest, Be Focused) ya cubren | No prioridad — solo si querés tiempo linkeado a tareas/materias |
| **Gym tracker** | Usuario usa app dedicada | No reactivar salvo cambio de tooling |
| **Import desde Notion** | Decisión empezar limpio (2026-05-04) | Si hay >100 notas valiosas a migrar. Notion exporta MD/CSV — parser custom |
| **Drag-and-drop bloques (DevLab + Faculty notes)** | Botones ▲▼ funcionan | `@dnd-kit/core` cuando moleste |
| **Backlinks `[[nota]]`** | Notas planas en Fase 8 | Fase 9 — parser + autocomplete |
| **Export PDF apuntes** | Fase 9 | `jspdf` o `react-pdf` |
| **Tareas recurrentes auto-rollover** | Manual primero | Edge function cron o trigger client-side al login |

---

## 8. Convenciones del proyecto

- TypeScript strict
- Tailwind 4 con tokens CSS (`var(--primary)`, `var(--border)`, etc.)
- Radix UI primitives + shadcn-style wrappers en `src/components/ui/`
- Routes file-based con TanStack Router (`createFileRoute`)
- Componentes "section" en `src/components/sections/`
- Mocks SOLO para datos estáticos (DAILY_TIPS). Todo lo demás → Supabase.
- Forms: `react-hook-form` + `zod` resolver
- Toasts: `sonner`
- Iconos: `lucide-react` (preferir sobre `@phosphor-icons/react`)
- Queries: TanStack Query opcional sobre supabase-js (recomendado a partir de Fase 2 para cache + invalidations)

---

## 9. Notas para el modelo que retome

- **Empezar siempre por Fase 0.** Sin Supabase + auth, ninguna fase posterior funciona.
- Cada fase es mergeable sola. No mezclar fases en un PR.
- Al completar tarea, marcar `[x]` y agregar fecha al lado: `[x] Crear types.ts (2026-05-04)`.
- Si surge sub-tarea, agregarla anidada con `  - [ ]`.
- Si una decisión cambia, **no editar la decisión vieja** — agregar nota nueva con fecha en sección 1.
- Antes de empezar nueva fase, releer "Decisiones tomadas" (sección 1) por si algo cambió.
- **Nunca commitear** `SUPABASE_SERVICE_ROLE_KEY` ni `.env*`.
- **Anon key** sí va al cliente (es público por diseño, RLS protege).
- **RLS siempre activado** en cada tabla nueva. Sin excepción.
- Probar políticas RLS con un user ajeno antes de asumir que funcionan.
- Storage paths siempre prefijados con `${user.id}/` para que la policy del bucket funcione.
- **Lucca decide** cuándo arrancar Fase 7 (IA real, paga).

---

## 10. Comandos útiles

> **Package manager: pnpm** (no npm). `pnpm-lock.yaml` en raíz lo confirma.

```bash
# Frontend
pnpm dev            # vite dev server
pnpm build          # tsc + vite build
pnpm lint           # eslint
pnpm add <pkg>      # instalar dep

# Supabase CLI
pnpm dlx supabase login
pnpm dlx supabase link --project-ref <id>
pnpm dlx supabase gen types typescript --linked > src/lib/database.types.ts
pnpm dlx supabase db push       # subir migraciones locales
```

### Deploy

- Push a `main` → Vercel auto-deploy
- Migraciones SQL: por ahora manual via SQL editor de Supabase. Adoptar CLI cuando haya 3+ migrations.

---

## 11. Variables de entorno

```
# .env.local (NO COMMITEAR)
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...

# Vercel env vars (mismo nombre)
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
```

---

**Última actualización:** 2026-05-04
**Estado:** Fases 0–7 COMPLETAS. Roadmap extendido con Fase 8 (Faculty MVP), Fase 9 (Faculty avanzado), Fase 10 (Personal habits+tasks+mood), Fase 11 (IA real, ex-Fase 8). Decisiones 2026-05-04: lista+countdown deadlines (no calendario), sin KaTeX, sin pomodoro, sin gym, empezar limpio sin Notion import. Siguiente: ejecutar Fase 8a (migración SQL faculty + setup ruta).




