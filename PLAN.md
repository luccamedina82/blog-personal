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
- [ ] Crear `src/lib/english/queries.ts` (wrappers tipados sobre supabase-js para todas las tablas)
- [ ] Crear `src/mocks/english-section-mock.ts` con `DAILY_TIPS` estático (~50 entries)
- [ ] Convertir `/english` en route group con nested routes:
  - [ ] `src/routes/english/index.tsx` → redirect a `/english/anki`
  - [ ] `src/routes/english/anki.tsx`
  - [ ] `src/routes/english/evaluator.tsx`
  - [ ] `src/routes/english/vocab.tsx`
  - [ ] `src/routes/english/shadowing.tsx`
  - [ ] `src/routes/english/books.tsx`
- [ ] Crear `EnglishShell` con tab nav (header + 5 tabs)
- [ ] Skeleton vacío por sub-componente con placeholder copy
- [ ] Eliminar `english-section.tsx` viejo
- [ ] Migrar BOOKS hardcoded actuales a tabla `books` (seed manual desde SQL editor o UI)

**Salida:** podés navegar `/english/anki`, `/english/vocab`, etc. con shell + placeholder. Queries layer listo.

---

### Fase 2 — Evaluator++ (1 día)

- [ ] Migrar mocks de DevLab y Journal a tablas (seed inicial desde SQL editor con tu user_id)
- [ ] `SourcePicker` con 3 modos: paste / Bitácora / DevLab
  - [ ] Paste: textarea actual
  - [ ] Bitácora: select que llama `queries.listJournalPosts({ type: 'text' })`
  - [ ] DevLab: select que llama `queries.listDevLabPostsWithText()`
- [ ] Modificar `TextAnalyzer` para aceptar `source` y `sourceRef`
- [ ] Persistir cada análisis: `queries.createEvaluatorRun(...)`
- [ ] `HistoryChart`: recharts LineChart con scores en el tiempo (query `evaluator_runs` ordenado)
- [ ] Botón "Limpiar historial" con `AlertDialog` + `queries.clearEvaluatorHistory()`
- [ ] Bonus: highlights inline en el texto

**Salida:** análisis sobre tus propias notas + evolución persistente.

---

### Fase 3 — Vocab+ (1 día)

- [ ] Tabs internos: Words | Phrases | Connectors | Tip del día
- [ ] CRUD vocab con `Dialog` + `react-hook-form` + `zod`
- [ ] Persistencia vía `queries.createVocab/updateVocab/deleteVocab`
- [ ] Búsqueda fuzzy con `cmdk` (sobre resultado de query)
- [ ] Filtros por tag (filtrar en cliente o `tags @> array[...]` en SQL)
- [ ] **Tip del día:**
  - [ ] `DAILY_TIPS` array curado ~50 entries en mock (no en DB)
  - [ ] `TipOfDay` rota por `new Date().getDate() % len`
  - [ ] Botón "guardar como card Anki" → `queries.createCard`
- [ ] **Seed sugerido:** ineffable, halcyon, perfunctory, trenchant, limn, ubiquitous, ephemeral, serendipity, quintessential, eloquent, nuanced, pragmatic, "hit the nail on the head", "burn the midnight oil", "piece of cake", "cost an arm and a leg", "break the ice", "the ball is in your court", "bite the bullet", "let the cat out of the bag", "on balance", "that said", "granted", "bearing this in mind", "by and large", "all things considered", etc.

**Salida:** vocab CRUD funcional online + tip diario rotativo.

---

### Fase 4 — Anki Lab (prototipo visual, 2 días)

- [ ] `DeckGrid` reusando patrón de `CategoryGrid` de devlab
- [ ] 5 categorías de mazos: Vocab / Phrasal Verbs / Idioms / Book Quotes / Tech Notes
- [ ] CRUD decks (modal create + delete confirmation)
- [ ] `DeckView`: lista de cards de un mazo + acciones
- [ ] `CardEditor`: front/back/tags (modal con form)
- [ ] `StudyMode`:
  - [ ] Card flip animation (CSS 3D transform)
  - [ ] Botones: Easy / Good / Hard / Again
  - [ ] SRS lite (SM-2): actualiza ease/interval_days/due via update query
  - [ ] Filtra cards `due <= now()` en SQL
- [ ] Botón global "Crear card desde texto" (recibe `{ front, back, source }`)
- [ ] Conectar con vocab / books / evaluator (botón "→ Anki" en cada uno)

**TECH DEBT marcada:** Anki import/export `.apkg` real → ver sección 7.

**Salida:** mazos online, cards persistidas, SRS básico.

---

### Fase 5 — Shadowing Studio (2 días)

- [ ] `SessionList`: query `shadowing_sessions order by created_at desc`
- [ ] Upload audio/video → `supabase.storage.from('media').upload(\`${userId}/shadowing/${id}.mp3\`, blob)`
- [ ] Crear row en `shadowing_sessions` con `storage_path`
- [ ] `SessionRecorder`: file picker (futuro: grabar con `MediaRecorder` API)
- [ ] Por sesión:
  - [ ] Resolver URL: `supabase.storage.from('media').createSignedUrl(path, 3600)`
  - [ ] Reusar `WaveformPlayer` actual (extender para video)
  - [ ] `TranscriptPane`: editor sincronizado con timestamps; persiste como `jsonb` en `transcript`
  - [ ] `NotesPane`: textarea con autosave debounced
  - [ ] Tag de calidad: mastered / review / needs-work (update column `quality`)
- [ ] Stats reales: count, streak (group by date), sum duration
- [ ] Eliminar sesión: borrar storage + row (transaction-ish: storage primero, después row)

**Salida:** subís audios al cloud, los reproducís con signed URL, anotás transcripción y notas.

---

### Fase 6 — Books Detail + Cross-Links (1 día)

- [ ] `BookDetail` route: clicar libro abre vista expandida (lee `book_annotations`)
- [ ] Reusar `DevLabPostEditor` para anotar libros (highlights, quotes, mis notas)
- [ ] CRUD anotaciones vía queries
- [ ] Botón "→ Anki" en cada quote (`queries.createCard` en mazo "Book Quotes")
- [ ] Búsqueda global con `cmdk` (`⌘K`): atraviesa decks/cards/vocab/posts/sesiones (queries paralelas)
- [ ] Atajos teclado: `g e a` → /english/anki, `c c` → create card, etc.

**Salida:** lectura + anotaciones unificadas, búsqueda global cross-DB.

---

### Fase 7 — IA real (cuando justifique pagar)

> Acá aparece la pregunta NestJS vs Edge Functions. Decisión deferida hasta llegar.

- [ ] Decisión: **NestJS en Railway** vs **Supabase Edge Functions (Deno)** vs **Vercel Serverless Functions**
  - NestJS = más estructura, más overhead deploy, más control
  - Edge Functions = cero infra, Deno, junto a Supabase
  - Vercel Functions = junto al frontend, simple, Node
- [ ] Tip del día → endpoint llama Anthropic API con prompt templado, cachea en tabla `ai_cache`
- [ ] Evaluator real → reemplazar mock con Anthropic API (mantener fallback heurístico)
- [ ] Transcripción auto shadowing → Whisper API (OpenAI) o Whisper self-hosted
- [ ] Tabla `ai_cache (input_hash, output, model, created_at)` para no pagar 2 veces

---

## 6. Módulos aparte (futuros)

### `/faculty` — Apuntes facultad

- [ ] Tablas: `faculty_subjects`, `faculty_notes`, `faculty_exams`
- [ ] Apuntes por materia (reusar `DevLabPostEditor`)
- [ ] Soporte fórmulas: integrar KaTeX (`npm i katex react-katex`)
- [ ] Calendario exámenes / deadlines
- [ ] Tracker progreso por materia

### `/personal` — Habits + journal privado

- [ ] Tablas: `habits`, `habit_logs`, `journal_prompts`, `mood_logs`
- [ ] Habits tracker (grid tipo GitHub contributions)
- [ ] Journal prompts diarios
- [ ] Pomodoro timer (estado en localStorage, sesiones a DB)
- [ ] Mood tracking
- [ ] Privado: ya está protegido por RLS + auth

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

**Última actualización:** 2026-05-03
**Estado:** Fase 0 COMPLETA. App en producción, auth funcionando. Siguiente: Fase 1.
