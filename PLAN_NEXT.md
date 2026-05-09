---
title: Plan Fases 11–12 — Personal + IA Gratuita
status: active
date: 2026-05-08
scope: Pendientes Fase 10, Fase 11 (Personal), Fase 12 (IA free tier)
history: Ver PLAN.md para fases 0–10 completas y decisiones históricas
---

# Plan Fases 11–12 — Personal + IA Gratuita

## 0 — Estado del proyecto

| Fase | Estado | Notas |
|------|--------|-------|
| 0–9c | ✅ Completa | Ver PLAN.md |
| 9d Export PDF | ⏸ Diferida | `jspdf + html2canvas`, baja prioridad |
| 10a–10f | ✅ Completa | |
| 10g english↔library | ❌ Pendiente | Ver §1a |
| 10h (menores) | ⚠️ Parcial | Ver §1b |
| **Fase Personal** | ⏸ Sin número — a determinar | Ver §2 |
| **12 IA** | 🔄 Rediseñada | Free tier — Ver §3 |

**Stack:** Vite · React 19 · TanStack Router · Tailwind 4 · Supabase · Vercel · pnpm

---

## 1 — Pendientes Fase 10

### 1a — 10g: Cross-link english books ↔ biblioteca

- [ ] Migración SQL (correr en Supabase editor):
  ```sql
  alter table books
    add column library_book_id uuid references library_books(id) on delete set null;
  ```
- [ ] `BookForm` (`/english/books`): campo opcional `library_book_id` — picker de `library_books` filtrado por `module_tags @> '{english}'`
- [ ] `BookDetail`: si `library_book_id != null`, botón "Leer PDF" → `PdfViewer` en Sheet lateral

### 1b — 10h: Migración manual de datos

Script SQL pendiente (correr en Supabase editor una vez):

```sql
-- Migrar notas de tipo evento → faculty_deadlines
INSERT INTO faculty_deadlines (user_id, subject_id, kind, title, due_at, note_id, grade)
SELECT user_id, subject_id, kind::text, title,
       COALESCE(date::timestamptz, created_at),
       id, grade
FROM faculty_notes
WHERE kind IN ('tp', 'parcial', 'final');

UPDATE faculty_notes
SET kind = 'apunte'
WHERE kind IN ('tp', 'parcial', 'final');
```

---

## 2 — Fase Personal (sin número — implementación a determinar)

### Schema — `supabase/migrations/0007_personal.sql`

> ⚠️ Número 0006 está tomado por `0006_topic_citations_and_deadlines.sql`

```sql
create table habits (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  cue text,
  frequency text not null check (frequency in ('daily','weekly')) default 'daily',
  weekly_target integer,
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

create policy "owner_all" on habits     for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "owner_all" on habit_logs for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "owner_all" on tasks      for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "owner_all" on mood_logs  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
```

### Tipos TS — `src/lib/personal/types.ts`

```ts
export type Habit = {
  id: string; user_id: string; name: string; cue: string | null
  frequency: 'daily' | 'weekly'; weekly_target: number | null
  color: string | null; archived: boolean; created_at: string
}
export type HabitLog = { id: string; user_id: string; habit_id: string; log_date: string }
export type Task = {
  id: string; user_id: string; title: string; notes: string | null
  priority: 'p1' | 'p2' | 'p3' | 'p4'; due_date: string | null
  done: boolean; done_at: string | null; recurring: 'daily' | 'weekly' | null
  created_at: string
}
export type MoodLog = {
  id: string; user_id: string; log_date: string
  mood: number | null; energy: number | null; note: string | null
}
```

### Queries — `src/lib/personal/queries.ts`

| Función | Descripción |
|---------|-------------|
| `listHabits(archived?)` | SELECT filtrado por archived |
| `createHabit(data)` / `updateHabit(id, data)` | INSERT / UPDATE |
| `archiveHabit(id)` | UPDATE `archived = true` |
| `toggleHabitLog(habitId, date)` | UPSERT si no existe; DELETE si existe |
| `getHabitLogs(habitId, from, to)` | SELECT rango fechas |
| `computeStreak(logs)` | Pure JS: días consecutivos hasta hoy |
| `listTasks(filter?)` | filter: `today` `week` `overdue` `done` |
| `createTask(data)` / `updateTask(id, data)` | INSERT / UPDATE |
| `toggleTask(id)` | UPDATE done + done_at |
| `autoRolloverTask(task)` | INSERT próxima instancia si `recurring` |
| `upsertMoodLog(date, data)` | UPSERT por `(user_id, log_date)` |
| `listMoodLogs(from, to)` | SELECT rango |

### Estructura de archivos

```
src/routes/personal/
  index.tsx            → dashboard
  habits.tsx
  tasks.tsx
  mood.tsx

src/components/personal/
  personal-shell.tsx   → header + tab nav (Habits | Tasks | Mood)
  habits/
    habit-list.tsx     → nombre + cue + racha + toggle hoy
    habit-form.tsx     → Dialog: name/cue/frequency/color/weekly_target
    habit-heatmap.tsx  → SVG 52 semanas
  tasks/
    task-board.tsx     → 4 cuadrantes Eisenhower
    task-form.tsx      → Dialog: title/priority/due_date/recurring
  mood/
    mood-quick-log.tsx → emoji 1–5 mood + energy + nota
    mood-chart.tsx     → recharts dual-line 30 días
```

### Checklist

#### Setup
- [ ] Crear y correr `supabase/migrations/0007_personal.sql`
- [ ] `src/lib/personal/types.ts`
- [ ] `src/lib/personal/queries.ts`
- [ ] Agregar `/personal` al header nav
- [ ] `src/routes/personal/index.tsx` → PersonalShell + dashboard básico

#### Habits
- [ ] `HabitList`: toggle hoy → `toggleHabitLog(id, today)`
- [ ] `HabitForm` modal (name, cue, frequency, weekly_target, color)
- [ ] `computeStreak` client-side desde `habit_logs`
- [ ] `HabitHeatmap` 52 semanas — `pnpm add react-calendar-heatmap @types/react-calendar-heatmap`
- [ ] Archivar hábito (soft delete, filtro "activos / archivados")

#### Tasks
- [ ] `TaskBoard` cuadrantes P1/P2/P3/P4
- [ ] `TaskForm` modal + toggle done
- [ ] Chips filtros: hoy / esta semana / vencidas / completadas
- [ ] `autoRolloverTask`: daily → +1d, weekly → +7d al marcar done

#### Mood
- [ ] `MoodQuickLog` emoji 1–5 (mood + energy), nota opcional, upsert
- [ ] Grid mensual emojis por día
- [ ] Gráfico recharts dual-line (mood + energy) últimos 30 días

#### Dashboard `/personal`
- [ ] Checklist hábitos hoy (toggle rápido)
- [ ] Tareas P1 + vencidas
- [ ] Prompt mood si no hay log de hoy
- [ ] Stats semana: % hábitos cumplidos, tareas done, mood avg

---

## 3 — Fase 12: IA Gratuita

### Decisión 2026-05-08

| Opción evaluada | Decisión | Motivo |
|-----------------|----------|--------|
| Servidor casero (Ryzen 7 1700 + R7 360) | ❌ Descartado | R7 360: 2GB VRAM, GCN 1.2 sin ROCm funcional. CPU-only = 2–5 tok/s |
| NestJS propio | ❌ Diferido | No hay lógica que lo justifique todavía |
| **Groq API (free)** | ✅ Seleccionado | 800+ tok/s, JSON mode, Llama 3.3 70B |
| **Gemini 2.0 Flash (free)** | ✅ Seleccionado | 1M ctx, 1.500 req/día, ideal para notas largas |
| Backend proxy | **Vercel API Routes** | Mismo repo, misma infra, Node.js, `10s` timeout |

### Modelos por caso de uso

| Caso de uso | Proveedor | Modelo |
|-------------|-----------|--------|
| English evaluator (scores + feedback) | Groq | `llama-3.3-70b-versatile` |
| Anki cards desde nota | Groq | `llama-3.3-70b-versatile` |
| Quiz desde múltiples notas | Gemini | `gemini-2.0-flash` |
| Tip del día generado | Groq | `llama-3.3-70b-versatile` |
| Auto-tags desde contenido | Groq | `llama-3.3-70b-versatile` |

### Arquitectura

```
[React cliente]
      │  fetch /api/ai/<action>   (POST JSON)
      ▼
[Vercel API Route /api/ai/*.ts]
      │  check ai_cache (SHA-256 input_hash)
      │  si hit → return cached
      │  si miss → call Groq / Gemini
      ▼
[Groq API o Gemini API]          ← keys NUNCA en cliente
      │  JSON response
      ▼
[Vercel Route]  →  write ai_cache  →  return to client
      ▼
[Cliente]  →  guarda en Supabase (evaluator_runs, cards, etc.)
```

### Variables de entorno — agregar

```bash
# .env.local (no commitear)
GROQ_API_KEY=gsk_...
GEMINI_API_KEY=AIza...

# Vercel Dashboard → Settings → Environment Variables (mismo nombre)
```

### Schema — `supabase/migrations/0008_ai_cache.sql`

```sql
create table ai_cache (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  action text not null,
  input_hash text not null,
  output jsonb not null,
  model text not null,
  created_at timestamptz default now(),
  unique(user_id, action, input_hash)
);

alter table ai_cache enable row level security;
create policy "owner_all" on ai_cache
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
```

### Tipos de respuesta por endpoint

```ts
// /api/ai/evaluate → EvaluatorResult
type EvaluatorResult = {
  scores: Array<{ metric: string; value: number; feedback: string }>
  overall: number        // 0–100
  suggestions: string[]
}

// /api/ai/generate-cards → GeneratedCards
type GeneratedCards = {
  cards: Array<{ front: string; back: string; tags: string[] }>
}

// /api/ai/generate-quiz → GeneratedQuiz
type GeneratedQuiz = {
  questions: Array<{
    question: string
    type: 'multiple_choice' | 'true_false' | 'open'
    options?: string[]   // para mc/tf
    answer: string
    explanation: string
  }>
}
```

### Archivos a crear

```
api/
  ai/
    evaluate.ts          → POST { text } → EvaluatorResult
    generate-cards.ts    → POST { noteContent, deckCategory } → GeneratedCards
    generate-quiz.ts     → POST { notes[], quizType } → GeneratedQuiz
    tip-of-day.ts        → GET → DailyTip (cache 24h en ai_cache)
    suggest-tags.ts      → POST { content } → { tags: string[] }

src/lib/ai/
  cache.ts               → checkCache(userId, action, input) + writeCache(...)
  prompts.ts             → prompt templates por acción
```

### Checklist Fase 12

#### 12a — Setup infraestructura
- [ ] Agregar `GROQ_API_KEY` y `GEMINI_API_KEY` a `.env.local` y Vercel dashboard
- [ ] `pnpm add groq-sdk @google/generative-ai`
- [ ] Crear y correr `supabase/migrations/0008_ai_cache.sql`
- [ ] `src/lib/ai/cache.ts` (SHA-256 via `crypto.subtle`, lookup + write)
- [ ] `src/lib/ai/prompts.ts` (templates)

#### 12b — Evaluator real
- [ ] `api/ai/evaluate.ts`: Groq JSON mode → EvaluatorResult
- [ ] `TextAnalyzer`: reemplazar heurístico por fetch `/api/ai/evaluate`
- [ ] Mostrar `feedback` expandible por métrica
- [ ] Fallback al heurístico si request falla (offline / rate limit)

#### 12c — Anki cards desde nota
- [ ] `api/ai/generate-cards.ts`: Groq JSON mode → GeneratedCards
- [ ] Botón "Generar cards con IA" en `NoteView` (Faculty) y `PostView` (DevLab)
- [ ] Modal preview: lista cards, checkbox seleccionar, select deck → guardar en Supabase

#### 12d — Quiz desde notas
- [ ] Migración `0009_quizzes.sql`: tablas `quizzes` + `quiz_questions`
- [ ] `api/ai/generate-quiz.ts`: varias notas en 1 prompt → Gemini Flash → Question[]
- [ ] UI en `/faculty/$subjectId` tab "Quiz": seleccionar notas → generar → modo práctica

#### 12e — Tip del día dinámico
- [ ] `api/ai/tip-of-day.ts`: Groq + cache 24h en `ai_cache`, evitar términos ya en vocab
- [ ] `TipOfDay` component: `fetch('/api/ai/tip-of-day')` en lugar de mock estático

#### 12f — Auto-tags
- [ ] `api/ai/suggest-tags.ts`: 3–5 tags desde content
- [ ] Botón "Sugerir tags" en `NoteEditor` (Faculty) y `DevLabPostEditor`

---

## 3b — Temario UX: polish + panel lateral en editor

### 3b-i — Polish vista temario (quick wins)

- [ ] **Citation chips clickeables**: agregar `cursor-pointer`, `hover:bg-primary/10 hover:border-primary/40` al wrapper del chip + title tooltip más visible. Actualmente el `<button>` interno existe pero visualmente parece badge estático.
- [ ] **Status pills**: reemplazar `<select>` nativo por 3 botones `P / V / D` con color (pendiente=gris, visto=azul, dominado=verde). Mismo espacio, más visual.
- [ ] **Filter bar**: barra arriba del temario con `Todo / Pendiente / Visto / Dominado` + conteo por estado. Resuelve el overwhelm en temarios largos.

### 3b-ii — Temario lateral en editor (feature)

**Loop de uso:**
1. Editás una nota → botón "Temario" en toolbar del editor abre panel lateral
2. Panel muestra árbol read-only: grupos colapsables → unidades → temas (con estado y chips de cita)
3. Click en chip (nota, libro) → panel cambia al recurso con botón `← Temario` en header para volver
4. En cada tema: botón "Asociar nota" → setea `note.topic_id` en Supabase (campo ya existe en DB)

**Infraestructura ya disponible — no requiere cambios de schema:**
- `NoteSplitLayout` con `RightPanel` ya maneja `pdf | note-preview | devlab-preview`
- `onCitationClick` ya abre recursos en panel derecho
- `FacultyNote.topic_id` existe en DB y en `createFacultyNote`
- `topics, groups, units` ya se pasan al editor (`$subjectId.tsx` línea 403–419)

**Archivos a modificar:**
```
src/routes/faculty/$subjectId.tsx
  - RightPanel type: agregar { kind: 'temario'; returnTo?: RightPanel }
  - NoteSplitLayout: renderizar TemarioPanel cuando kind === 'temario'
  - Editor toolbar: botón "Temario" → setRightPanel({ kind: 'temario' })
  - handleCitationClick desde temario: push recurso con returnTo: { kind: 'temario' }

src/components/faculty/topic-list-readonly.tsx   ← nuevo, <150 líneas
  - Árbol colapsable read-only (sin add/edit/delete/reorder)
  - Chips de cita con onClick
  - Fila de tema: badge estado + "Asociar" si se pasa onAssociate prop
```

**Checklist:**
- [ ] `topic-list-readonly.tsx`: árbol colapsable, chips clickeables, prop `onAssociate?`
- [ ] `RightPanel` type: agregar `{ kind: 'temario'; returnTo?: Omit<RightPanel,'returnTo'> }`
- [ ] `NoteSplitLayout`: panel body para `temario` → `<TopicListReadonly />`
- [ ] Header temario panel: si `returnTo` existe → botón `← volver` además de cerrar
- [ ] Botón "Temario" en toolbar de `FacultyNoteEditor`
- [ ] `updateFacultyNote(id, { topic_id })` cuando `onAssociate` se invoca

---

## 4 — Deuda técnica activa

| Prioridad | Item | Acción |
|-----------|------|--------|
| 🔴 Alta | Correr migración `0006` en Supabase | SQL editor — desbloquea Fase 10h en prod |
| 🔴 Alta | Script SQL migración notes kind→deadlines (§1b) | Datos inconsistentes hasta correrlo |
| 🟡 Media | Fase 10g: english↔library cross-link (§1a) | 3 subtareas simples |
| 🟡 Media | `0007_personal.sql` | Prerrequisito Fase Personal |
| 🟡 Media | `0008_ai_cache.sql` | Prerrequisito Fase 12 |
| 🟢 Baja | Fase 9d Export PDF (`jspdf + html2canvas`) | No bloquea nada |
| 🟢 Baja | Drag-and-drop bloques (`@dnd-kit`) | Nice-to-have, botones ▲▼ funcionan |
| 🟢 Baja | Anki import/export `.apkg` (`genanki-js`) | Post-Fase 12 |
| 🟢 Baja | KaTeX en Faculty notes | Solo si aparecen materias exactas |
| 🟢 Baja | OCR PDFs escaneados (`Tesseract.js`) | Lento client-side, considerar backend |
| 🟢 Baja | Anotaciones inline en PDF (`react-pdf-highlighter`) | — |
| 🟢 Baja | Búsqueda full-text PDFs (`tsvector` + GIN index) | — |

---

## 5 — Comandos rápidos

```bash
pnpm dev
pnpm build
pnpm lint

# Deps Fase 11
pnpm add react-calendar-heatmap @types/react-calendar-heatmap

# Deps Fase 12
pnpm add groq-sdk @google/generative-ai

# Supabase tipos auto-generados
pnpm dlx supabase gen types typescript --linked > src/lib/database.types.ts
```

---

**Próximo paso:** §1b (script SQL migración datos) → Fase 12 IA → Fase Personal (cuando se decida).
