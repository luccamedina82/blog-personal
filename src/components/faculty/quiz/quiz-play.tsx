import { useState } from 'react'
import { ArrowLeft, CheckCircle2, XCircle, ChevronRight } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { submitAttempts } from '@/lib/faculty/quizzes'
import type { Quiz, QuizQuestion } from '@/lib/faculty/types'

interface Props {
  quiz: Quiz
  questions: QuizQuestion[]
  onBack: () => void
}

interface Result {
  questionId: string
  userAnswer: string | null
  correct: boolean
}

type Phase = 'answering' | 'revealed' | 'done'

export function QuizPlay({ quiz, questions, onBack }: Props) {
  const [idx, setIdx] = useState(0)
  const [phase, setPhase] = useState<Phase>('answering')
  const [selected, setSelected] = useState<string | null>(null)
  const [openAnswer, setOpenAnswer] = useState('')
  const [results, setResults] = useState<Result[]>([])

  const current = questions[idx]

  function handleReveal() {
    if (!current) return
    if (current.type === 'open') {
      setPhase('revealed')
      return
    }
    const correct = selected === current.answer
    setResults((prev) => [...prev, { questionId: current.id, userAnswer: selected, correct }])
    setPhase('revealed')
  }

  function handleNext() {
    if (idx + 1 >= questions.length) {
      submitAttempts(quiz.id, results).catch(() => toast.error('Error al guardar resultados'))
      setPhase('done')
    } else {
      setIdx((i) => i + 1)
      setPhase('answering')
      setSelected(null)
      setOpenAnswer('')
    }
  }

  function handleOpenGrade(correct: boolean) {
    const newResult: Result = { questionId: current.id, userAnswer: openAnswer.trim() || null, correct }
    const allResults = [...results, newResult]
    setResults(allResults)
    if (idx + 1 >= questions.length) {
      submitAttempts(quiz.id, allResults).catch(() => toast.error('Error al guardar resultados'))
      setPhase('done')
    } else {
      setIdx((i) => i + 1)
      setPhase('answering')
      setSelected(null)
      setOpenAnswer('')
    }
  }

  // ── Done screen ────────────────────────────────────────────────────────────

  if (phase === 'done') {
    const correct = results.filter((r) => r.correct).length
    const total = results.length
    const pct = total > 0 ? Math.round((correct / total) * 100) : 0

    return (
      <div className="space-y-6">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="size-3.5" />
          Quizzes
        </button>
        <div className="flex flex-col items-center py-12 text-center space-y-3">
          <div className="text-6xl font-bold tabular-nums">{pct}%</div>
          <p className="text-sm text-muted-foreground">
            {correct} de {total} correctas
          </p>
          <p className="text-xs text-muted-foreground/60 max-w-xs truncate">{quiz.title}</p>
          <div className="flex gap-2 pt-4">
            <Button variant="outline" size="sm" onClick={onBack}>
              Volver
            </Button>
            <Button
              size="sm"
              onClick={() => {
                setIdx(0)
                setPhase('answering')
                setSelected(null)
                setOpenAnswer('')
                setResults([])
              }}
            >
              Repetir
            </Button>
          </div>
        </div>
      </div>
    )
  }

  if (!current) return null

  const isRevealed = phase === 'revealed'
  const isCorrect = selected === current.answer

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header + progress */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors shrink-0"
        >
          <ArrowLeft className="size-3.5" />
          Quizzes
        </button>
        <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-300"
            style={{ width: `${(idx / questions.length) * 100}%` }}
          />
        </div>
        <span className="text-[11px] text-muted-foreground shrink-0 tabular-nums">
          {idx + 1} / {questions.length}
        </span>
      </div>

      {/* Type badge + question */}
      <div className="space-y-3">
        <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground px-1.5 py-0.5 rounded bg-muted">
          {current.type === 'multiple_choice'
            ? 'Opción múltiple'
            : current.type === 'true_false'
            ? 'Verdadero / Falso'
            : 'Desarrollo'}
        </span>
        <p className="text-base font-medium leading-relaxed">{current.question}</p>
      </div>

      {/* Options (MC / TF) */}
      {(current.type === 'multiple_choice' || current.type === 'true_false') && (
        <div className="space-y-2">
          {(current.options ?? []).map((opt) => {
            const isSel = selected === opt
            const isAnswer = opt === current.answer
            let cls =
              'border-border/60 bg-card/40 hover:bg-card/70 text-foreground cursor-pointer'
            if (isRevealed) {
              if (isAnswer)
                cls =
                  'border-green-500/50 bg-green-500/10 text-green-700 dark:text-green-400 cursor-default'
              else if (isSel)
                cls =
                  'border-red-500/50 bg-red-500/10 text-red-700 dark:text-red-400 cursor-default'
              else cls = 'border-border/30 bg-card/20 text-muted-foreground cursor-default'
            } else if (isSel) {
              cls = 'border-primary/60 bg-primary/10 text-foreground cursor-pointer'
            }
            return (
              <button
                key={opt}
                type="button"
                onClick={() => !isRevealed && setSelected(opt)}
                disabled={isRevealed}
                className={cn(
                  'w-full text-left px-4 py-3 rounded-lg border text-sm transition-colors',
                  cls,
                )}
              >
                {opt}
              </button>
            )
          })}
        </div>
      )}

      {/* Open answer textarea */}
      {current.type === 'open' && !isRevealed && (
        <Textarea
          value={openAnswer}
          onChange={(e) => setOpenAnswer(e.target.value)}
          placeholder="Escribí tu respuesta…"
          className="resize-none text-sm"
          rows={3}
        />
      )}

      {/* Explanation panel (revealed) */}
      {isRevealed && (
        <div className="rounded-lg border border-border/60 bg-card/40 p-4 space-y-3">
          {current.type !== 'open' && (
            <div className="flex items-center gap-2">
              {isCorrect ? (
                <CheckCircle2 className="size-4 text-green-500 shrink-0" />
              ) : (
                <XCircle className="size-4 text-red-500 shrink-0" />
              )}
              <span
                className={cn(
                  'text-sm font-medium',
                  isCorrect
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-red-600 dark:text-red-400',
                )}
              >
                {isCorrect ? '¡Correcto!' : 'Incorrecto'}
              </span>
              {!isCorrect && (
                <span className="text-sm text-muted-foreground">
                  — Respuesta correcta:{' '}
                  <span className="text-foreground font-medium">{current.answer}</span>
                </span>
              )}
            </div>
          )}
          {current.type === 'open' && (
            <div className="space-y-1">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                Respuesta esperada
              </p>
              <p className="text-sm font-medium">{current.answer}</p>
            </div>
          )}
          {current.explanation && (
            <p className="text-xs text-muted-foreground leading-relaxed border-t border-border/40 pt-3">
              {current.explanation}
            </p>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-2">
        {!isRevealed && (
          <Button
            size="sm"
            onClick={handleReveal}
            disabled={current.type !== 'open' && !selected}
          >
            {current.type === 'open' ? 'Ver respuesta' : 'Confirmar'}
          </Button>
        )}

        {isRevealed && current.type === 'open' && (
          <>
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 border-red-500/40 text-red-600 dark:text-red-400 hover:bg-red-500/10"
              onClick={() => handleOpenGrade(false)}
            >
              <XCircle className="size-3.5" />
              Incorrecto
            </Button>
            <Button
              size="sm"
              className="gap-1.5 bg-green-600 hover:bg-green-700 text-white"
              onClick={() => handleOpenGrade(true)}
            >
              <CheckCircle2 className="size-3.5" />
              Correcto
            </Button>
          </>
        )}

        {isRevealed && current.type !== 'open' && (
          <Button size="sm" className="gap-1.5" onClick={handleNext}>
            {idx + 1 >= questions.length ? 'Ver resultados' : 'Siguiente'}
            <ChevronRight className="size-3.5" />
          </Button>
        )}
      </div>
    </div>
  )
}
