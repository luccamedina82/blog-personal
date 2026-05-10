  ---
title: Plan Fases 11–12 — Personal + IA Gratuita
status: active
date: 2026-05-10
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
| **12a Setup IA** | ⚠️ Parcial | `prompts.ts` + `evaluate.ts` listos. Falta `cache.ts`, migración `0008`, deps SDK Groq/Gemini |
| **12b Evaluator real** | ✅ Hecho con bugs | Groq llama-3.3-70b vía Edge function + fallback heurístico. Ver §3a issues |
| **12c Anki cards** | ✅ Hecho | Groq + modal + botones Faculty/DevLab. Migración `0011` corrida. |
| **12d Quiz** | ✅ Hecho | Gemini 2.0 Flash + QuizBuilder + QuizPlay + tab en materia. Migración `0012` pendiente correr. |
| **12e–12f IA** | ❌ Pendiente | Ver §3 |

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

### 3a — Bugs/Mejoras evaluator (post-12b)

#### 3a-i — DevLab post: incluir título + bloques de texto

**Problema actual:** `SourcePicker` (`source-picker.tsx:49`) sólo envía `post.excerpt` al evaluator. Pierde el título y todos los `DevLabBlock` de tipo `text` / `quote` (que son el grueso del post). Bloques `code` / `image` deben quedar fuera.

**Cambios:**
- `src/lib/english/queries.ts:260` `listDevLabPostsForEvaluator`: agregar `blocks` al SELECT.
  ```ts
  .select('id, title, excerpt, blocks')
  // return type: { id; title; excerpt: string|null; blocks: DevLabBlock[] }
  ```
- `src/components/english/evaluator/source-picker.tsx`: nueva helper `buildEvaluatorText(post)`:
  ```ts
  function stripHtml(html: string) {
    const tmp = document.createElement('div')
    tmp.innerHTML = html
    return tmp.textContent ?? ''
  }
  function buildEvaluatorText(post: { title: string; blocks: DevLabBlock[] }) {
    const parts: string[] = [post.title]
    for (const b of post.blocks) {
      if (b.kind === 'text') parts.push(stripHtml(b.html))
      else if (b.kind === 'quote') parts.push(b.content)
      // skip code + image
    }
    return parts.filter(Boolean).join('\n\n').trim()
  }
  ```
- En `handleSelect`: usar `buildEvaluatorText(post)` en vez de `post.excerpt`. Quitar el `disabled={!p.excerpt}` del `<option>`.

#### 3a-ii — Mostrar texto corregido

**Comportamiento esperado:** además de `suggestions: string[]`, el evaluator devuelve `corrected_text: string` con la versión re-escrita. UI muestra diff o panel "Tu texto / Versión sugerida".

**Cambios:**
- `src/lib/ai/prompts.ts`: extender prompt → pedir también `corrected_text` en JSON output.
- `api/ai/evaluate.ts`: validar y reenviar `corrected_text`.
- `src/lib/english/types.ts`: extender `EvaluatorRun.scores` queda igual; agregar campo opcional persistido (ver 3a-iii).
- `text-analyzer.tsx`:
  - Tipo `AnalysisResult` → agregar `corrected_text?: string`.
  - Bajo "Suggestions" agregar bloque "Corrected version":
    ```tsx
    {result.corrected_text && (
      <div className="border-t border-border/70 p-5">
        <p className="text-[10px] uppercase ...">Corrected version</p>
        <p className="mt-2 text-sm leading-relaxed whitespace-pre-wrap">
          {result.corrected_text}
        </p>
        <Button size="sm" variant="ghost" onClick={() => navigator.clipboard.writeText(result.corrected_text!)}>
          Copy
        </Button>
      </div>
    )}
    ```
  - Opcional v2: diff palabra-por-palabra (`diff` lib, ~5KB) — diferir si no urge.

#### 3a-iii — Persistir suggestions + corrected_text en `evaluator_runs`

**Migración** `supabase/migrations/0009_evaluator_extras.sql`:
```sql
alter table evaluator_runs
  add column suggestions text[] default '{}',
  add column corrected_text text;
```

**Cambios:**
- `EvaluatorRun` type: agregar `suggestions: string[]; corrected_text: string | null`.
- `createEvaluatorRun` (`src/lib/english/queries.ts`): aceptar y guardar ambos campos.
- `text-analyzer.tsx` `handleAnalyze`: pasar al insert.

---

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
- [ ] **Pendiente usuario:** crear cuenta Groq → `GROQ_API_KEY` en `.env.local` + Vercel dashboard
- [ ] **Pendiente usuario:** `GEMINI_API_KEY` (sólo si se hace 12d)
- [ ] `pnpm add groq-sdk @google/generative-ai` (eval actual usa `fetch` directo, sin SDK)
- [ ] Crear y correr `supabase/migrations/0008_ai_cache.sql`
- [ ] `src/lib/ai/cache.ts` (SHA-256 via `crypto.subtle`, lookup + write)
- [x] `src/lib/ai/prompts.ts` (templates) — sólo evaluator por ahora

#### 12b — Evaluator real
- [x] `api/ai/evaluate.ts`: Groq JSON mode → EvaluatorResult (Edge function)
- [x] `TextAnalyzer`: AI primero, heurístico fallback, badge `llama-3.3-70b` / `simulated`
- [x] Fallback al heurístico si request falla (offline / rate limit)
- [x] `feedback` mostrado por métrica (no expandible — siempre visible bajo barra)
- [x] **Bug §3a-i:** SourcePicker DevLab — `blocksToPlainText` en `src/lib/ai/extract.ts`
- [x] **Mejora §3a-ii:** panel "Corrected version" + botón Copy en `text-analyzer.tsx`
- [x] **Mejora §3a-iii:** `EvaluatorRun` type + `createEvaluatorRun` payload + migración `0009_evaluator_extras.sql` (correr en Supabase)

#### 12c — Anki cards desde nota

**Schema:** ya existe (`Card` + `Deck` en `src/lib/english/types.ts`). No requiere migración.

**Inputs IA — extracción de texto desde `blocks` (reusa helper de 3a-i):**
- Faculty `FacultyNote.blocks: DevLabBlock[]` (mismo tipo que DevLab)
- DevLab `DevLabPost.blocks: DevLabBlock[]`
- Mover `buildEvaluatorText` → `src/lib/ai/extract.ts` con nombre genérico `blocksToPlainText(title, blocks)`. Reusar en 3a-i + 12c.

**Backend:** `api/ai/generate-cards.ts` (Edge function, mismo patrón que `evaluate.ts`)
- Input: `{ title: string; content: string; deckCategory: 'vocab' | 'phrasal' | 'idioms' | 'book-quotes' | 'tech-notes'; count?: number }` (default 8 cards)
- Prompt en `src/lib/ai/prompts.ts` → `cardsPrompt(content, deckCategory, count)`:
  - Sistema: "You generate Anki-style flashcards. Output strict JSON. Front=concept/term, Back=definition+example. Tag with theme keywords."
  - Variantes por `deckCategory` (vocab → palabra↔def, tech-notes → concepto↔explicación, book-quotes → quote↔reflexión).
- Salida JSON: `{ cards: [{ front, back, tags: string[] }] }`.
- Modelo: `llama-3.3-70b-versatile` (Groq, JSON mode).
- Cache: SHA-256(`title|content|deckCategory|count`) — requiere `12a cache.ts` listo.

**Frontend — `src/components/ai/generate-cards-modal.tsx` (~180 líneas):**
- Props: `{ open, onOpenChange, sourceTitle, sourceContent, sourceKind: 'faculty'|'devlab', sourceRef: string }`
- Flujo:
  1. Select deck (`listDecks()`) — preselect by category.
  2. Input "cantidad" (4–12, slider o select).
  3. Botón "Generar" → `fetch('/api/ai/generate-cards')`.
  4. Lista preview: cada card con front/back, checkbox individual, "Seleccionar todas".
  5. Editar inline front/back antes de guardar (textarea expandible al click).
  6. "Guardar N cards" → `bulkInsertCards(deck_id, selected, source_kind, source_ref)`.

**Queries:**
- `src/lib/english/queries.ts`: agregar `bulkInsertCards(deckId, cards, sourceKind, sourceRef)` — single INSERT.

**Triggers UI:**
- Faculty `NoteView` (buscar archivo): toolbar acción "Generar cards IA" → modal con `sourceKind: 'faculty'`.
- DevLab `PostView`: mismo botón en header → `sourceKind: 'devlab'`.

**Checklist:**
- [x] `src/lib/ai/extract.ts` con `blocksToPlainText` (reusa 3a-i)
- [x] `cardsPrompt` en `prompts.ts`
- [x] `api/ai/generate-cards.ts` (Edge, Groq)
- [x] `bulkInsertCards` en queries
- [x] `GenerateCardsModal` componente
- [x] Botón en Faculty `NoteView`
- [x] Botón en DevLab `PostView`
- [x] Tag de origen visible en `DeckView` (chip "from: DevLab / Faculty / …" bajo el Front)

#### 12d — Quiz desde notas

> ⚠️ Renumerar a `0010_quizzes.sql` — `0009` queda tomado por evaluator extras (3a-iii).

**Schema** `supabase/migrations/0010_quizzes.sql`:
```sql
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
```

**Backend** `api/ai/generate-quiz.ts` (Edge):
- Input: `{ noteIds: string[]; subjectId: string; title: string; quizType: 'mixed'|'multiple_choice'|'true_false'|'open'; count: number }`
- Server-side: query `faculty_notes` → concatenar `blocksToPlainText(title, blocks)` por nota, separados por `### <title>\n`.
- Modelo: **Gemini 2.0 Flash** (1M ctx — soporta múltiples notas largas) vía `@google/generative-ai`.
- Prompt: "Generate {count} {quizType} questions from these notes. Each question must cite the source note title in `explanation`. Output strict JSON: `{ questions: [{ question, type, options?, answer, explanation }] }`".
- Cache: SHA-256(`noteIds.sort().join|quizType|count`) — útil al regenerar idéntico.

**Tipos** — extender `src/lib/faculty/types.ts`:
```ts
export type Quiz = { id: string; user_id: string; subject_id: string|null
  title: string; source_note_ids: string[]; model: string; created_at: string }
export type QuizQuestion = { id: string; quiz_id: string; order_index: number
  question: string; type: 'multiple_choice'|'true_false'|'open'
  options: string[]|null; answer: string; explanation: string|null }
export type QuizAttempt = { id: string; quiz_id: string; question_id: string
  user_answer: string|null; correct: boolean|null; created_at: string }
```

**Queries** `src/lib/faculty/quizzes.ts`:
- `createQuiz(payload, questions)` — INSERT quiz + bulk INSERT questions en transacción client-side (rpc o 2 calls + rollback manual).
- `listQuizzes(subjectId?)`, `getQuiz(id)` (quiz + questions).
- `submitAttempt(quizId, questionId, answer, correct)`.
- `quizScore(quizId)` — aggregate.

**UI** — nueva ruta `src/routes/faculty/$subjectId/quiz.tsx` (o tab dentro de `$subjectId.tsx`):
- Vista lista quizzes existentes + botón "Nuevo quiz".
- `QuizBuilder` modal (~200 líneas):
  1. Multi-select notas de la materia (checklist con título + tag).
  2. Inputs: título, cantidad (5–20), tipo.
  3. "Generar" → `fetch('/api/ai/generate-quiz')` → preview con edición inline → guardar.
- `QuizPlay` componente (~250 líneas):
  - Una pregunta a la vez, navegación, timer opcional.
  - MC/TF: radios; Open: textarea + auto-grade (string match relajado o IA en v2).
  - Al finalizar: pantalla resultados + persist `quiz_attempts` por pregunta.
- Historial: barras % aciertos por quiz.

**Checklist:**
- [x] Migración `0012_quizzes.sql` — ⚠️ pendiente correr en Supabase
- [x] Tipos `Quiz`/`QuizQuestion`/`QuizAttempt`
- [x] `src/lib/faculty/quizzes.ts` queries
- [x] prompt inlineado en `api/ai/generate-quiz.ts`
- [x] `api/ai/generate-quiz.ts` (Gemini 2.0 Flash)
- [x] Tab "Quiz" en `/faculty/$subjectId`
- [x] `QuizBuilder` modal multi-select notas + preview
- [x] `QuizPlay` componente práctica (MC/TF/open + score)
- [x] Persist intentos (`submitAttempts`) + score view
- [x] Botón "Re-jugar" + "Borrar quiz"

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
| 🟡 Media | `HistoryChart` expandable: click fila → ver `suggestions` + `corrected_text` del run | `runs[i].suggestions` y `corrected_text` ya están en DB post-migración |
| 🟡 Media | Lock re-evaluación si nota no cambió desde último run | Comparar `note.updated_at` vs `evaluator_run.created_at` donde `source_ref = note.id`; si igual, deshabilitar botón "Analyze" con tooltip "Already evaluated — edit the note first" |
| 🟡 Media | `0008_ai_cache.sql` | Prerrequisito cache IA (12c/12d/12e) |
| ✅ | `0009_evaluator_extras.sql` | Corrida |
| 🔴 Alta | `0010_evaluator_titles.sql` | Correr en Supabase — habilita title/source_title en evaluator runs |
| 🔴 Alta | `0011_cards_source_kind_faculty.sql` | Correr en Supabase — habilita guardar cards desde Faculty |
| 🔴 Alta | `0012_quizzes.sql` | Correr en Supabase — habilita quizzes (12d) |
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

**Próximo paso sugerido:**
1. **Fix evaluator** (§3a-i + 3a-ii) — bug título/blocks + corrected text. Rápido, alto impacto.
2. **Setup cache IA** (§12a `cache.ts` + `0008_ai_cache.sql`) — desbloquea 12c/12d.
3. **12c Anki cards** — ya hay schema `Card`/`Deck`, reusa pipeline evaluator.
4. **12d Quiz** — más pesado (3 tablas, 2 componentes nuevos, Gemini SDK).
5. §1b (script SQL kind→deadlines) cuando convenga.



