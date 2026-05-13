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

### 3b-i — Polish vista temario (quick wins) — ✅ Hecho

- [x] **Citation chips clickeables**: hover bg + border + cursor-pointer en `topic-list.tsx:349`.
- [x] **Status pills**: círculo P/V/D con cycle on click (`topic-list.tsx:386-401`). Equivalente funcional + menos chrome.
- [x] **Filter bar**: pills `Todo / Pendiente / Visto / Dominado` con counts (`topic-list.tsx:557-589`).

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
- [x] `topic-list-readonly.tsx`: árbol colapsable, chips clickeables, prop `onAssociate?`
- [x] `RightPanel` type: añadido `{ kind: 'temario'; returnTo? }` + `returnTo?` en todas las variantes
- [x] `NoteSplitLayout`: panel body `temario` → `<TopicListReadonly />`
- [x] Header con botón `← volver` si `returnTo` existe (vía `handleBack` → `onSetRightPanel(returnTo)`)
- [x] Botón "Temario" en toolbar de `FacultyNoteEditor` (prop `onOpenTemario`)
- [x] `updateFacultyNote(id, { topic_id })` en `handleAssociateNoteToTopic` + propaga a editor via `setEditNote` + `initial.topic_id` watcher

---

## 3c — Sección `/study` (Anki + Quizzes)

**Objetivo:** consolidar técnicas de estudio en una sección dedicada. Mover Anki fuera de `/english` y agregar vista global de quizzes de Faculty. Sólo lectura + play (creación sigue desde `/english` y `/faculty`).

### Decisiones

| Item | Decisión |
|------|----------|
| Ruta | `/study` con tabs `Decks | Quizzes` |
| Migración `/english/anki` | Borrar sin redirect (links viejos se rompen) |
| Scope | Read + play. Crear deck/quiz sigue en `/english`/`/faculty` |
| Entry points Anki | Sólo `/study`. Botones "Generar cards" en Faculty/DevLab abren modal; al guardar, toast con link a `/study/decks/$id` |
| Sidebar | Añadir item `Study · Decks & Quizzes` (icono `Brain` o `Sparkles`) entre `Faculty` y `Library` |

### Schema

No requiere migración. Decks/cards/quizzes ya existen.

### Estructura de archivos

```
src/routes/study/
  index.tsx               → redirect a /study/decks
  decks.tsx               → grid (reusa DeckGrid)
  decks.$deckId.tsx       → DeckView + StudyMode
  quizzes.tsx             → lista global todos los quizzes (joins subject)
  quizzes.$quizId.tsx     → QuizPlay

src/components/study/
  study-shell.tsx         → header + tabs (Decks | Quizzes)
  quizzes-list.tsx        → tabla: título · materia · #preguntas · score último intento · play

src/components/english/anki/  →  MOVER a  src/components/study/anki/
  deck-grid.tsx
  deck-view.tsx
  study-mode.tsx
  card-editor.tsx
  save-to-anki-button.tsx   ← sigue usado desde Faculty/DevLab
```

### Queries nuevas

- `listAllQuizzes()` en `src/lib/faculty/quizzes.ts` — join con `faculty_subjects(name, code)`. Retorna `Quiz[] & { subject_name: string | null }`.
- `getLastAttemptScore(quizId)` para columna score (opcional v2).

### Cambios en archivos existentes

- `src/components/app-sidebar.tsx`: añadir entrada `{ id: 'study', label: 'Study', sub: 'Decks & Quizzes', icon: Brain, to: '/study' }`.
- `src/components/english/english-shell.tsx`: remover tab `anki` del array `TABS`.
- `src/routes/english/anki.tsx`: borrar archivo (TanStack Router regenera `routeTree.gen.ts`).
- Imports de anki en `src/components/english/**` y `src/components/ai/generate-cards-modal.tsx`: actualizar path `@/components/english/anki/*` → `@/components/study/anki/*`.
- `generate-cards-modal.tsx`: al guardar, toast con `Link to="/study/decks/$id"` en vez de `/english/anki`.

### Checklist

- [x] ~~Mover archivos anki~~ Decisión: mantener en `src/components/english/anki/` (8 importers, churn evitado). Routes `/study` consumen desde ahí.
- [x] `src/components/study/study-shell.tsx`
- [x] `src/routes/study/index.tsx` → redirect `/study/decks`
- [x] `src/routes/study/decks.tsx` (state-driven grid/deck/study mode, reusa DeckGrid/DeckView/StudyMode)
- [x] `listAllQuizzes()` + `QuizWithSubject` en `src/lib/faculty/quizzes.ts`
- [x] `src/components/study/quizzes-list.tsx`
- [x] `src/routes/study/quizzes.tsx` (lista) + `quizzes.$quizId.tsx` (reusa `QuizPlay`)
- [x] Borrado `src/routes/english/anki.tsx`
- [x] Quitado tab `anki` de `english-shell.tsx`; `english/index.tsx` redirige a `/english/evaluator`
- [x] `Study` (icono `Brain`) añadido en `app-sidebar.tsx` (NAV usado por sidebar + mobile)
- [x] Shortcut `g a` → `/study/decks`, nuevo `g q` → `/study/quizzes`
- [x] `global-search.tsx` deck hits → `/study/decks`
- [x] `routeTree.gen.ts` regenerado (auto por TanStack)
- [ ] generate-cards-modal: no tenía link a `/english/anki`. Sin cambios necesarios.

---

## 3d — English: preguntas diarias con review IA

**Objetivo:** loop diario de práctica conversacional. IA genera pregunta (casual/formal/técnica), user responde texto libre, IA devuelve scores + corrected_text + feedback. Historial completo navegable. Puede pedir N preguntas por día.

### Decisiones

| Item | Decisión |
|------|----------|
| Persistencia | Tabla dedicada `daily_questions` + `daily_question_answers` |
| Tono | User elige cada vez: `casual / formal / technical` (sin tono random) |
| Cron diario | NO — on-demand. Botón "Nueva pregunta" cuantas veces quiera |
| Review | Gramática + contenido + sugerencias (mismo shape que evaluator) |
| Proveedor | Groq `llama-3.3-70b-versatile` (ambos endpoints) |
| Cache | Sólo para `review-answer` (input estable). Generación de pregunta no cachea |

### Schema — `supabase/migrations/0014_daily_questions.sql`

> ⚠️ `0013` ya tomado por `daily_tips.sql`

```sql
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
  scores jsonb,           -- [{ metric, value, feedback }]
  overall integer,        -- 0-100
  corrected_text text,
  suggestions text[] default '{}',
  created_at timestamptz default now(),
  unique (question_id)    -- una respuesta por pregunta
);

create index daily_questions_user_created_idx on daily_questions(user_id, created_at desc);

alter table daily_questions       enable row level security;
alter table daily_question_answers enable row level security;
create policy "owner_all" on daily_questions        for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "owner_all" on daily_question_answers for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
```

### Tipos — `src/lib/english/daily-questions.ts`

```ts
export type DailyQuestionTone = 'casual' | 'formal' | 'technical'

export type DailyQuestion = {
  id: string; user_id: string; question: string
  tone: DailyQuestionTone; model: string; created_at: string
}

export type DailyQuestionAnswer = {
  id: string; user_id: string; question_id: string
  answer_text: string
  scores: { metric: string; value: number; feedback: string }[] | null
  overall: number | null
  corrected_text: string | null
  suggestions: string[]
  created_at: string
}

export type DailyQuestionWithAnswer = DailyQuestion & { answer: DailyQuestionAnswer | null }
```

### Backend

**`api/ai/daily-question.ts`** (Edge, Groq)
- Input: `{ tone: DailyQuestionTone }`
- Prompt: "Generate ONE English practice question. Tone={tone}. Casual=opinion/small-talk; Formal=essay/argument; Technical=dev/science. Output strict JSON `{ question: string }`. Keep under 25 words."
- No cache (variedad).

**`api/ai/review-answer.ts`** (Edge, Groq, JSON mode)
- Input: `{ question: string; answer: string }`
- Prompt: "Evaluate this English answer to the given question. Score grammar/vocabulary/fluency/coherence (0-100). Provide corrected version + 2-4 specific suggestions. Output strict JSON `{ scores, overall, corrected_text, suggestions }`."
- Cache: SHA-256(`question|answer`) en `ai_cache` (acción `review-answer`).

### Queries — `src/lib/english/daily-questions-queries.ts`

| Función | Descripción |
|---------|-------------|
| `createDailyQuestion(question, tone, model)` | INSERT |
| `submitAnswer(questionId, answer, review)` | INSERT en `daily_question_answers` |
| `listDailyQuestions(limit?, offset?)` | SELECT con join LEFT a `daily_question_answers` ordered by created_at desc |
| `getQuestionWithAnswer(id)` | single con answer |
| `deleteQuestion(id)` | cascade borra answer |

### UI

```
src/routes/english/daily.tsx        → tab nuevo en english-shell

src/components/english/daily/
  daily-question-card.tsx           → pregunta activa: tone selector + textarea + submit
  tone-selector.tsx                 → 3 botones casual/formal/technical
  review-display.tsx                → scores (reusa evaluator look) + corrected_text + suggestions
  question-history.tsx              → lista colapsable: pregunta + tono + respuesta + review
```

**Flujo:**
1. Selector de tono → botón "Nueva pregunta" → `POST /api/ai/daily-question` → INSERT en `daily_questions` → muestra question card.
2. User escribe respuesta en textarea → botón "Submit" → `POST /api/ai/review-answer` → INSERT en `daily_question_answers` con scores+corrected_text → muestra ReviewDisplay debajo de la pregunta.
3. Botón "Otra pregunta" arriba (resetea card, mantiene historial).
4. Historial paginado (10 por página) debajo, item colapsable.

### Cambios en archivos existentes

- `src/components/english/english-shell.tsx`: añadir tab `{ id: 'daily', label: 'Daily', to: '/english/daily' }` (después de Evaluator).

### Checklist

- [x] `supabase/migrations/0014_daily_questions.sql` — ⚠️ pendiente correr en Supabase
- [x] `src/lib/english/daily-questions.ts` tipos
- [x] `src/lib/english/daily-questions-queries.ts` queries
- [x] Prompts inlineados en `api/ai/daily-question.ts` + `api/ai/review-answer.ts` (patrón Vercel functions isoladas)
- [x] `api/ai/daily-question.ts` (Groq, evita repetir últimas 8 preguntas)
- [x] `api/ai/review-answer.ts` (Groq, sin cache por ahora)
- [x] `src/components/english/daily/tone-selector.tsx` (3 botones casual/formal/technical con tint)
- [x] `src/components/english/daily/daily-question-card.tsx` (flujo completo: generar → responder → review)
- [x] `src/components/english/daily/review-display.tsx` (scores + bars + suggestions + corrected text)
- [x] `src/components/english/daily/question-history.tsx` (colapsable + delete)
- [x] `src/routes/english/daily.tsx`
- [x] Tab `Daily` en `english-shell.tsx`

---

## 3e — DevLab: inline AI reviews (annotations)

**Objetivo:** IA marca rangos de texto en bloques `text` de DevLab posts con sugerencias visibles inline (highlight de color + popover). User accept/dismiss por sugerencia. Sólo trigger manual (botón en toolbar).

### Decisiones

| Item | Decisión |
|------|----------|
| Visualización | Highlights de color + popover (accept/dismiss/copy) |
| Persistencia | Tabla `devlab_annotations` con `status: pending/accepted/dismissed` |
| Ciclo de vida | Sobreviven recargas. User gestiona explícitamente. No auto-invalidación si bloque cambia (v2) |
| Trigger | Botón manual "Revisar con IA" en toolbar del editor/viewer |
| Scope bloques | Sólo `kind === 'text'` (skip code/image/quote v1) |
| Accept = | Reemplazar `originalText` por `suggestion` dentro del HTML del bloque, marcar status |
| Tags HTML en `originalText` | **Autodismiss v1** — prompt exige plain text; guard cliente detecta `<`/`>` → status='dismissed' + toast |
| Proveedor | Groq `llama-3.3-70b-versatile` |

### Schema — `supabase/migrations/0015_devlab_annotations.sql`

> Tabla referenciada confirmada: `devlab_posts` (existe en `0001_init.sql:137`)

```sql
create table devlab_annotations (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  post_id uuid not null references devlab_posts(id) on delete cascade,
  block_id text not null,           -- ID del DevLabBlock (uuid string)
  original_text text not null,      -- texto exacto del rango
  suggestion text not null,         -- texto/sugerencia propuesta
  rationale text,                   -- por qué (opcional)
  kind text not null check (kind in ('grammar','style','clarity','suggestion')),
  status text not null check (status in ('pending','accepted','dismissed')) default 'pending',
  created_at timestamptz default now()
);

create index devlab_annotations_post_idx on devlab_annotations(post_id, status);

alter table devlab_annotations enable row level security;
create policy "owner_all" on devlab_annotations
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
```

### Tipos — extender `src/lib/devlab/types.ts`

```ts
export type DevLabAnnotationKind = 'grammar' | 'style' | 'clarity' | 'suggestion'
export type DevLabAnnotationStatus = 'pending' | 'accepted' | 'dismissed'

export type DevLabAnnotation = {
  id: string; user_id: string; post_id: string
  block_id: string; original_text: string; suggestion: string
  rationale: string | null
  kind: DevLabAnnotationKind
  status: DevLabAnnotationStatus
  created_at: string
}
```

### Backend — `api/ai/review-devlab.ts` (Edge, Groq JSON)

- Input: `{ postId: string; blocks: { id: string; plainText: string }[] }`
  - Cliente extrae plain text de cada bloque text vía `stripHtml` (existe en `extract.ts`).
- Prompt: "Review writing quality. For each block, find segments that could be improved. Return strict JSON: `{ annotations: [{ blockId, originalText, suggestion, rationale, kind }] }`. kind ∈ grammar/style/clarity/suggestion. originalText MUST appear verbatim in the block's text. Max 8 annotations total."
- Server valida que `originalText` exista en el bloque (skip si no) y devuelve al cliente.
- Cliente INSERT bulk en `devlab_annotations` con status='pending'.
- Cache: SHA-256(`postId|blocks_plain_concatenado`) en `ai_cache`.

### TipTap integration

**Nueva extensión** `src/lib/devlab/annotation-extension.ts`:
- Sigue patrón de `BookCitationExtension` (Plugin + DecorationSet) ya presente en codebase.
- Recibe `annotations: DevLabAnnotation[]` (filtradas a status pending+accepted del bloque actual).
- En cada render, busca `originalText` en el doc del bloque y aplica `Decoration.inline(from, to, { class: 'devlab-annotation devlab-annotation--{kind}' })`.
- Click sobre decoration → callback `onAnnotationClick(annotationId, rect)`.

**Estilos** en `src/index.css`:
- `.devlab-annotation--grammar { background: rgb(239 68 68 / 0.15); border-bottom: 1px dashed rgb(239 68 68); }`
- `.devlab-annotation--style { background: rgb(234 179 8 / 0.15); ... }`
- `.devlab-annotation--clarity { background: rgb(59 130 246 / 0.15); ... }`
- `.devlab-annotation--suggestion { background: rgb(34 197 94 / 0.15); ... }`

### Componentes

```
src/components/devlab/annotations/
  review-button.tsx         → toolbar; loading state; muestra count badge si hay pending
  annotation-popover.tsx    → portal: original (tachado) → suggestion (verde) + rationale + Accept/Dismiss/Copy
  annotations-panel.tsx     → opcional v2: panel lateral con lista de pending
```

### Queries — `src/lib/devlab/annotations-queries.ts`

| Función | Descripción |
|---------|-------------|
| `listAnnotations(postId)` | SELECT por post (status != dismissed por default, flag opcional) |
| `bulkCreateAnnotations(rows)` | INSERT múltiple |
| `acceptAnnotation(id, post)` | UPDATE status + retorna data para reemplazar texto en bloque |
| `dismissAnnotation(id)` | UPDATE status='dismissed' |
| `clearDismissed(postId)` | DELETE status='dismissed' (cleanup opcional) |

### Lógica accept

Al accept:
1. Cliente busca el bloque (`block_id`) en el post actual.
2. Si bloque kind='text': reemplaza `originalText` por `suggestion` en `block.html` (string replace primera ocurrencia). Para HTML, usar mismo `stripHtml` para encontrar offset y aplicar replace cuidando tags — alternativa: forzar replace en `plainText` y re-serializar (lossy con bold/italic). **Decisión v1**: replace string simple en HTML, asume que `originalText` no contiene tags. Si contiene → marcar como dismissed y avisar.
3. `updatePost(postId, blocks)` para persistir el cambio.
4. `acceptAnnotation(id)` para marcar status.

**Guard tags HTML (v1):**
- Server-side: prompt exige `originalText` sin tags. Validación regex `/[<>]/` antes de devolver al cliente — si hay match, descarta esa annotation.
- Client-side al accept: re-check `/[<>]/.test(originalText)` → si true, `dismissAnnotation(id)` + toast "Sugerencia con formato no soportada".

### Cambios en archivos existentes

- Editor DevLab (buscar componente principal en `src/components/devlab/`): añadir botón en toolbar + integrar `AnnotationExtension`.
- Vista DevLab (read): mostrar highlights también en lectura (annotations accepted no se muestran como highlight, sólo pending).
- `src/lib/devlab/types.ts`: tipos.

### Checklist

- [x] `supabase/migrations/0015_devlab_annotations.sql` — ⚠️ pendiente correr en Supabase
- [x] Tipos `DevLabAnnotation*` en `src/lib/devlab/types.ts`
- [x] `src/lib/devlab/annotations-queries.ts` (list / bulkCreate / updateStatus / delete)
- [x] Prompt inlineado en `api/ai/review-devlab.ts`
- [x] `api/ai/review-devlab.ts` (Groq + validación originalText verbatim + regex `[<>]` guard server-side)
- [x] `src/lib/devlab/annotation-extension.ts` (TipTap Plugin + DecorationSet + click handler vía PluginKey meta)
- [x] Estilos `.devlab-annotation--*` en `src/index.css` (red/amber/blue/emerald por kind)
- [x] `src/components/devlab/annotations/review-button.tsx`
- [x] `src/components/devlab/annotations/annotation-popover.tsx`
- [x] Integrar extensión en `tiptap-editor.tsx` (props `annotations` + `onAnnotationClick` + dispatch en effect)
- [x] Integrar toolbar + popover + state en `devlab-post-editor.tsx`
- [x] Lógica accept (replace HTML primera ocurrencia + updateStatus) con guard regex `[<>]` autodismiss
- [ ] Integrar lectura solo-display en `DevLabPostView` (v2 — diferido)

---

## 3f — English UX overhaul (Arcade)

**Objetivo:** convertir `/english` en una sección tipo "arcade de juegos para aprender inglés". Hoy abruma porque cada subruta abre sin contexto, hay headers duplicados (eyebrow + H1 page + H2 sub), idiomas mezclados (ES/EN) y `/english/` redirige al evaluator (modo más "serio" como primera impresión). Plan se ejecuta en fases incrementales — cada una mergeable.

### Decisiones

| Item | Decisión |
|------|----------|
| Idioma UI | **EN único** en toda la sección English (era mixto ES/EN). Inputs/textareas siguen pidiendo EN al usuario. |
| Landing `/english/` | Dashboard real en vez de redirect a evaluator |
| Mode cards | 5 cards: Daily · Evaluator · Vocab · Shadowing · Books con icono + descripción 1-línea + métrica viva |
| Métricas vivas | Daily: streak + answered hoy · Evaluator: runs total + best score · Vocab: total entries + due Anki · Shadowing: total sessions + recent · Books: reading + count |
| Tabs sub-rutas | Se mantienen tras navegación. `/english/` no muestra tabs (es landing) |
| Header shell | Rebrand a "English Lab" + sub corto "Five practice modes" |
| Streak/XP global | Diferido a fase posterior (requiere agregado de actividad cross-modo) |

### Fase A — Unificar idioma a EN (sin schema)

Archivos con strings ES (encontrados via grep `[áéíóúñ¿¡]|Cargando|Guardar|Eliminar|Generando|Revisando|Generar|Enviar|Otra|palabras|No se pudo`):

```
src/components/english/daily/daily-question-card.tsx
src/components/english/daily/question-history.tsx
src/components/english/anki/deck-grid.tsx
src/components/english/anki/deck-view.tsx
src/components/english/vocab/tip-of-day.tsx
src/components/english/evaluator/history-chart.tsx
src/components/english/evaluator/source-picker.tsx
src/routes/english/daily.tsx
src/routes/english/evaluator.tsx
```

Reemplazos clave:
- "Practica con una pregunta nueva" → "Practice with a new question"
- "Elegí un tono y la IA te genera…" → "Pick a tone and AI generates a question. Write your answer, get scores + corrections."
- "Generando…" / "Revisando…" → "Generating…" / "Reviewing…"
- "Nueva pregunta" → "New question"
- "Otra" (reset) → "New one"
- "palabras" → "words"
- "Tono" → "Tone"
- "No se pudo cargar el historial" → "Failed to load history"
- "No se pudo generar pregunta" → "Failed to generate question"
- "No se pudo revisar la respuesta" → "Failed to review answer"
- "Respuesta guardada" / "Eliminada" → "Answer saved" / "Deleted"
- "Cargando historial…" → "Loading history…"
- "Aún no respondiste preguntas. Generá la primera arriba ↑" → "No answers yet. Generate your first question above ↑"
- "Historial" → "History"
- "hoy/ayer/hace Xd/sem" → "today/yesterday/Xd ago/Xw ago"
- "sin respuesta" → "unanswered"
- "¿Borrar pregunta?" + body + Cancelar/Borrar → "Delete question?" + "Also deletes the answer and review. Cannot be undone." + Cancel/Delete
- `toLocaleDateString('es-AR', …)` → `'en-US'` en `question-history.tsx` y `tip-of-day.tsx`
- "Generando tip del día…" → "Generating tip of the day…"
- "Historial (N)" → "History (N)"
- "Error al cargar tip" / "Error al generar tip" → "Failed to load tip" / "Failed to generate tip"
- `history-chart.tsx` clear-dialog: "Eliminar todos los registros" / "Eliminar los últimos N" / "Conservar solo los últimos N" / "Cantidad de registros (N)" / "Solo hay N registros…" / "No hay registros…" / "Se eliminarán… Esta acción no se puede deshacer." / "Cancelar" / "Eliminar N registros" / "Calculando…" → todo a EN
- `source-picker.tsx` "Bitácora" → "Journal" (label visible)
- `deck-grid.tsx` empty state ES "Sin decks / Creá uno / Nuevo deck / Sin descripción" → EN
- `deck-view.tsx`: revisar también

### Fase B — Landing dashboard `/english/`

**Cambios:**

`src/routes/english/index.tsx` → reemplazar redirect con `EnglishDashboard` component.

`src/components/english/english-shell.tsx`:
- Detectar si `pathname === '/english' || pathname === '/english/'` → ocultar tabs, mostrar header simple. Si es sub-ruta, mostrar tabs como hoy.
- Rebrand: eyebrow → `Module C · English Lab`. H1 → `Five practice modes for English.` (más cálido que "laboratory"). Subtítulo: `Daily drills, score profiles, vocab vault, shadowing studio, reading log.`

`src/components/english/dashboard.tsx` (nuevo, ~180 líneas):
- 5 cards en grid `grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4`
- Cada card: icono lucide grande + nombre + 1-línea descripción + métrica viva tabular + chevron hover. Click → navega a la sub-ruta.
- Mode meta (en const dentro del componente):
  ```ts
  const MODES = [
    { id: 'daily', label: 'Daily Drill', icon: Sparkles, to: '/english/daily',
      blurb: 'AI generates a question. You answer. Get scored.' },
    { id: 'evaluator', label: 'Writing Lab', icon: LineChart, to: '/english/evaluator',
      blurb: 'Paste a text or pick a post. Six-axis profile + corrections.' },
    { id: 'vocab', label: 'Vocab Vault', icon: BookOpen, to: '/english/vocab',
      blurb: 'Words, phrases, connectors. Tip of the day. Save to Anki.' },
    { id: 'shadowing', label: 'Shadowing Studio', icon: Mic, to: '/english/shadowing',
      blurb: 'Imitate an audio. Track quality. Repeat the weak ones.' },
    { id: 'books', label: 'Reading Log', icon: Library, to: '/english/books',
      blurb: 'Books, annotations, ratings.' },
  ]
  ```
- Métricas:
  - Daily: `dailyAnswered.length` (total con answer) + streak días respondidos.
  - Evaluator: `runs.length` total + `best = max(overall)`.
  - Vocab: `entries.length` + due Anki (`cards where due_at <= now` count, opcional v1).
  - Shadowing: `sessions.length`.
  - Books: `books.filter(b => b.status === 'reading').length` + total. Si schema no tiene `status`, omitir y mostrar solo total (ya existe `books.length`).
- Cargar todas las métricas en paralelo con `Promise.all` en un `useEffect`. Loading state: skeleton por card.

**Queries necesarias** — todas ya existen excepto contadores baratos:
- `listDailyQuestions(limit?)` — usar `limit = 200` o sumar `countDailyAnswers()` nueva si crece (v1: filtrar client-side).
- `listEvaluatorRuns()` — ya existe.
- `listVocab()` — ya existe.
- `listShadowingSessions()` — ya existe.
- `listBooks()` — ya existe.
- Streak helper: `computeStreak(answers: { created_at }[])` — fechas únicas (YYYY-MM-DD), días consecutivos hasta hoy.

**Decisión carga:** una sola pasada en `dashboard.tsx`. Cada sub-ruta hace su propio fetch (no compartir state). Costo extra aceptable; dashboard solo se carga al entrar.

### Fase C (diferida) — Streak/XP global + onboarding empty states

- Sumar columna virtual `last_activity_at` por modo, mostrar fila resumen arriba del dashboard.
- Reemplazar empty states pelados ("No books yet") por mini-tour con CTA + ejemplo.
- Diferir: queremos confirmar que dashboard funciona antes de añadir capas.

### Checklist Fase A

- [x] Traducir 9 archivos (lista arriba) — todas las strings ES → EN, `Bitácora` UI label → `Journal` (type `'bitacora'` se mantiene)
- [x] Cambiar `es-AR` → `en-US` en formateadores de fecha (`question-history.tsx`, `tip-of-day.tsx`, `deck-view.tsx`)
- [x] Revisar toasts de error en `daily.tsx` / `evaluator.tsx`

### Checklist Fase B

- [x] `src/components/english/dashboard.tsx` (5 mode cards + métricas vivas + skeletons)
- [x] `src/routes/english/index.tsx`: reemplazar redirect por `<EnglishDashboard />`
- [x] `english-shell.tsx`: ocultar tabs en landing + sub muestra `←` back-link y tabs. Rebrand "Module C · English Lab" + H1 dinámico
- [x] Helper `computeAnswerStreak` inline en `dashboard.tsx`
- [x] Skeletons (`bg-muted/40 animate-pulse`) mientras cargan métricas

### Polish post-B (siguiente quick win cerrado)

- [x] Vocab: TipOfDay promovido a banner permanente (drop tab "Tip")
- [x] Vocab: Tabs reemplazadas por filter chips (All / Words / Phrases / Connectors con counts)
- [x] Vocab: CTA `Study decks` (link a `/study/decks`) en header
- [x] `VocabForm` acepta `defaultKind` para preseleccionar kind según chip activo al crear

---

## 3g — Anki: bulk-create cards from Vocab Vault

**Objetivo:** convertir el Vocab Vault en fuente directa de cards. Hoy existe `SaveToAnkiButton` por fila (1 click → 1 card). Falta: **selección múltiple + bulk insert al deck elegido**. Cierra el loop Vocab → Anki sin abrir N modales.

### Decisiones

| Item | Decisión |
|------|----------|
| Single-card save (existente) | Mantener `SaveToAnkiButton` por fila. No tocar. |
| Bulk save | Checkbox por fila + sticky action bar abajo con count + deck Select + botón |
| Front/Back mapping | `front = entry.term` · `back = entry.meaning + (example ? \n\n"example" : '')` (idéntico al single-row) |
| Tags | Heredados de la entry (`entry.tags`) + auto-tag con `entry.kind` (`word`/`phrase`/`connector`) |
| Source | `source_kind = 'vocab'` (nuevo valor en enum) · `source_ref = null` (no se referencia entrada por entrada para no acoplar deletes) |
| Migración constraint | Sí — `0018_cards_source_kind_vocab.sql` agrega `'vocab'` al check constraint |
| Duplicados | Permitir. User decide. Toast con count creado. |
| Vista "Select all" | Sí — checkbox en header de tabla afecta solo entries del filter activo |

### Schema — `supabase/migrations/0018_cards_source_kind_vocab.sql`

```sql
alter table cards
  drop constraint if exists cards_source_kind_check;

alter table cards
  add constraint cards_source_kind_check
    check (source_kind in ('evaluator','devlab','bitacora','book','faculty','vocab'));
```

### Tipos — extender `src/lib/english/types.ts`

```ts
// Card.source_kind union → agregar 'vocab'
source_kind: 'evaluator' | 'devlab' | 'bitacora' | 'book' | 'faculty' | 'vocab' | null
```

### UI — `src/routes/english/vocab.tsx` + `vocab-table.tsx`

**VocabTable cambios (props opcionales para no romper otros usos):**
- Nueva col izquierda: checkbox por fila. Header tiene checkbox indeterminate "select all in current filter".
- Props nuevas: `selectedIds: Set<string>`, `onToggleSelect(id)`, `onSelectAll(allOrNone: boolean)`. Si no se pasan, checkboxes no se renderizan (modo compat).

**Vocab page cambios:**
- State: `selectedIds: Set<string>`. Reset al cambiar `kindFilter`.
- Sticky bar `bottom-0 left-0 right-0 z-30` con backdrop blur cuando `selectedIds.size > 0`:
  - Texto: "N selected"
  - `Select` deck (reuse `listDecks`)
  - Botón "Add to deck" → `bulkInsertCards(deckId, mappedCards, 'vocab', null)` → toast + clear selection
  - Botón "Clear" → vacía selection

**Mapping cliente:**
```ts
const cards = entries
  .filter((e) => selectedIds.has(e.id))
  .map((e) => ({
    front: e.term,
    back: e.meaning + (e.example ? `\n\n"${e.example}"` : ''),
    tags: [...e.tags, e.kind],
  }))
```

### Queries

`bulkInsertCards` ya existe (§12c). Reusar sin cambios. Necesita el nuevo enum value tras correr migración.

### Checklist

- [x] `supabase/migrations/0018_cards_source_kind_vocab.sql` — ⚠️ pendiente correr en Supabase
- [x] `Card.source_kind` union extendida en `src/lib/english/types.ts` + `SOURCE_LABEL` en `deck-view.tsx`
- [x] `VocabTable`: checkbox col + select-all (indeterminate state) + props opcionales `selectedIds`/`onToggleSelect`/`onSelectAll`
- [x] `vocab.tsx`: selection state + sticky bottom bar + deck loader on-demand + bulk save via `bulkInsertCards(deckId, cards, 'vocab', null)`
- [x] Reset `selectedIds` al cambiar `kindFilter` (vía `useEffect`)
- [x] Toast con count de cards creadas + clear selection
- [x] `tsc --noEmit` clean

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
| 🔴 Alta | `0014_daily_questions.sql` | Correr en Supabase — habilita English daily questions (§3d) |
| 🔴 Alta | `0015_devlab_annotations.sql` | Correr en Supabase — habilita DevLab inline reviews (§3e) |
| 🔴 Alta | `0018_cards_source_kind_vocab.sql` | Correr en Supabase — habilita `source_kind='vocab'` en cards (§3g) |
| 🟡 Media | BYOK: API keys por usuario (Groq/Gemini) | Tabla `user_settings (user_id pk, groq_key, gemini_key)` + RLS. Settings page con form. Endpoints `api/ai/*` leen JWT → buscan key del user → fallback a env var. Permite que cada amigo use su free tier sin compartir cuota. ~1-2h. |
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
1. **§3b Temario UX** — polish quick wins + panel lateral en editor (sin migraciones).
2. **§3c Study section** — mover Anki + listar quizzes. Refactor + 2 rutas. Sin schema nuevo.
3. **§3d Daily questions** — schema 0013 + 2 endpoints + 4 componentes + tab english.
4. **§3e DevLab inline reviews** — schema 0014 + extensión TipTap + endpoint review. Lo más complejo.
5. **Setup cache IA** (§12a `cache.ts` + `0008_ai_cache.sql`) — desbloquea cache para §3d/§3e.
6. §1b (script SQL kind→deadlines) cuando convenga.



