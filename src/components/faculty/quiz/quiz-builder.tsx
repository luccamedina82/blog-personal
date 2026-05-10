import { useState } from 'react'
import { Loader2, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { blocksToPlainText } from '@/lib/ai/extract'
import { createQuiz } from '@/lib/faculty/quizzes'
import type { FacultyNote, Quiz } from '@/lib/faculty/types'

type QuizType = 'mixed' | 'multiple_choice' | 'true_false' | 'open'
type Phase = 'config' | 'generating' | 'preview' | 'saving'

interface GeneratedQuestion {
  question: string
  type: 'multiple_choice' | 'true_false' | 'open'
  options?: string[]
  answer: string
  explanation: string
}

const QUIZ_TYPES: { value: QuizType; label: string }[] = [
  { value: 'mixed', label: 'Mixto' },
  { value: 'multiple_choice', label: 'Opción múltiple' },
  { value: 'true_false', label: 'V / F' },
  { value: 'open', label: 'Desarrollo' },
]

const KIND_LABELS: Record<string, string> = {
  clase: 'clase',
  apunte: 'apunte',
  resumen: 'resumen',
  tp: 'TP',
  parcial: 'parcial',
  final: 'final',
}

interface Props {
  open: boolean
  onClose: () => void
  subjectId: string
  notes: FacultyNote[]
  onCreated: (quiz: Quiz, questionCount: number) => void
}

export function QuizBuilder({ open, onClose, subjectId, notes, onCreated }: Props) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [title, setTitle] = useState('')
  const [count, setCount] = useState(8)
  const [quizType, setQuizType] = useState<QuizType>('mixed')
  const [questions, setQuestions] = useState<GeneratedQuestion[]>([])
  const [phase, setPhase] = useState<Phase>('config')

  function reset() {
    setSelectedIds(new Set())
    setTitle('')
    setCount(8)
    setQuizType('mixed')
    setQuestions([])
    setPhase('config')
  }

  function handleClose() {
    reset()
    onClose()
  }

  function toggleNote(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function handleGenerate() {
    if (selectedIds.size === 0) {
      toast.error('Seleccioná al menos una nota')
      return
    }
    setPhase('generating')

    const selectedNotes = notes.filter((n) => selectedIds.has(n.id))
    const notesPayload = selectedNotes.map((n) => ({
      title: n.title,
      content: blocksToPlainText(n.title, n.blocks),
    }))
    const autoTitle = `Quiz — ${selectedNotes
      .map((n) => n.title)
      .join(', ')
      .slice(0, 60)}`

    try {
      const res = await fetch('/api/ai/generate-quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: notesPayload, quizType, count }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = (await res.json()) as { questions: GeneratedQuestion[] }
      setQuestions(data.questions)
      if (!title.trim()) setTitle(autoTitle)
      setPhase('preview')
    } catch {
      toast.error('Error al generar preguntas')
      setPhase('config')
    }
  }

  async function handleSave() {
    if (!title.trim()) return
    setPhase('saving')
    const selectedNotes = notes.filter((n) => selectedIds.has(n.id))
    try {
      const quiz = await createQuiz(
        subjectId,
        title.trim(),
        selectedNotes.map((n) => n.id),
        'gemini-2.0-flash',
        questions.map((q, i) => ({
          order_index: i,
          question: q.question,
          type: q.type,
          options: q.options ?? null,
          answer: q.answer,
          explanation: q.explanation ?? null,
        })),
      )
      onCreated(quiz, questions.length)
      reset()
    } catch {
      toast.error('Error al guardar quiz')
      setPhase('preview')
    }
  }

  const isGenerating = phase === 'generating'
  const isSaving = phase === 'saving'
  const showPreview = phase === 'preview' || phase === 'saving'

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose() }}>
      <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nuevo quiz</DialogTitle>
        </DialogHeader>

        {/* ── Config phase ────────────────────────────────── */}
        {!showPreview && (
          <div className="space-y-5 py-2">
            <div className="space-y-2">
              <Label className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                Notas a incluir
              </Label>
              {notes.length === 0 ? (
                <p className="text-sm text-muted-foreground py-2">
                  No hay notas en esta materia.
                </p>
              ) : (
                <div className="space-y-0.5 max-h-48 overflow-y-auto rounded-lg border border-border/60 p-1.5">
                  {notes.map((n) => {
                    const sel = selectedIds.has(n.id)
                    return (
                      <button
                        key={n.id}
                        type="button"
                        onClick={() => toggleNote(n.id)}
                        className={cn(
                          'w-full flex items-center gap-2.5 px-3 py-2 rounded text-left text-sm transition-colors',
                          sel
                            ? 'bg-primary/10 text-foreground'
                            : 'hover:bg-muted/50 text-muted-foreground',
                        )}
                      >
                        <span
                          className={cn(
                            'size-3.5 shrink-0 rounded-sm border transition-colors',
                            sel ? 'bg-primary border-primary' : 'border-border',
                          )}
                        />
                        <span className="flex-1 truncate">{n.title}</span>
                        <Badge
                          variant="secondary"
                          className="ml-auto text-[9px] px-1.5 py-0 shrink-0"
                        >
                          {KIND_LABELS[n.kind] ?? n.kind}
                        </Badge>
                      </button>
                    )
                  })}
                </div>
              )}
              {selectedIds.size > 0 && (
                <p className="text-[11px] text-muted-foreground">
                  {selectedIds.size} nota{selectedIds.size !== 1 ? 's' : ''} seleccionada
                  {selectedIds.size !== 1 ? 's' : ''}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Cantidad</Label>
                <select
                  value={count}
                  onChange={(e) => setCount(Number(e.target.value))}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                >
                  {[5, 8, 10, 12, 15, 20].map((n) => (
                    <option key={n} value={n}>
                      {n} preguntas
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Tipo</Label>
                <select
                  value={quizType}
                  onChange={(e) => setQuizType(e.target.value as QuizType)}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                >
                  {QUIZ_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Título (opcional)</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Se genera automáticamente"
                className="text-sm"
              />
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <Button variant="ghost" size="sm" onClick={handleClose}>
                Cancelar
              </Button>
              <Button
                size="sm"
                onClick={handleGenerate}
                disabled={isGenerating || selectedIds.size === 0}
                className="gap-1.5"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" />
                    Generando…
                  </>
                ) : (
                  'Generar'
                )}
              </Button>
            </div>
          </div>
        )}

        {/* ── Preview phase ────────────────────────────────── */}
        {showPreview && (
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Título del quiz</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="text-sm"
                disabled={isSaving}
              />
            </div>

            <div className="space-y-2">
              <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                {questions.length} pregunta{questions.length !== 1 ? 's' : ''} generadas
              </p>
              <div className="space-y-2 max-h-72 overflow-y-auto">
                {questions.map((q, i) => (
                  <div
                    key={i}
                    className="rounded-lg border border-border/60 bg-card/40 p-3 space-y-1.5"
                  >
                    <div className="flex items-start gap-2">
                      <span className="text-[10px] text-muted-foreground shrink-0 mt-0.5 tabular-nums">
                        {i + 1}.
                      </span>
                      <p className="text-sm flex-1">{q.question}</p>
                      <Badge
                        variant="secondary"
                        className="text-[9px] px-1.5 py-0 shrink-0"
                      >
                        {q.type === 'multiple_choice'
                          ? 'OM'
                          : q.type === 'true_false'
                          ? 'V/F'
                          : 'Dev'}
                      </Badge>
                    </div>
                    {q.options && (
                      <div className="ml-4 space-y-0.5">
                        {q.options.map((opt) => (
                          <p
                            key={opt}
                            className={cn(
                              'text-xs',
                              opt === q.answer
                                ? 'text-primary font-medium'
                                : 'text-muted-foreground',
                            )}
                          >
                            {opt === q.answer ? '✓ ' : '  '}
                            {opt}
                          </p>
                        ))}
                      </div>
                    )}
                    {!q.options && (
                      <p className="ml-4 text-xs text-primary/80">
                        R: {q.answer}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5"
                onClick={() => setPhase('config')}
                disabled={isSaving}
              >
                <RefreshCw className="size-3.5" />
                Regenerar
              </Button>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClose}
                  disabled={isSaving}
                >
                  Cancelar
                </Button>
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={isSaving || !title.trim()}
                  className="gap-1.5"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="size-3.5 animate-spin" />
                      Guardando…
                    </>
                  ) : (
                    'Guardar quiz'
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
