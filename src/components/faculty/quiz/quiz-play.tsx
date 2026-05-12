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
    const tier =
      pct >= 90 ? { label: '¡Excelente!', emoji: '🏆', color: 'text-emerald-500' }
      : pct >= 70 ? { label: 'Bien hecho', emoji: '✨', color: 'text-primary' }
      : pct >= 50 ? { label: 'Sigue practicando', emoji: '💪', color: 'text-amber-500' }
      : { label: 'A repasar', emoji: '📚', color: 'text-orange-500' }

    return (
      <div className="space-y-8 max-w-2xl mx-auto w-full">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="size-3.5" />
          Quizzes
        </button>
        <div className="rounded-2xl border border-border/60 bg-gradient-to-br from-card to-card/40 shadow-lg shadow-black/5 px-8 py-12 text-center space-y-6">
          <div className="text-5xl">{tier.emoji}</div>
          <div>
            <p className={cn('text-xs uppercase tracking-[0.22em] font-medium', tier.color)}>
              {tier.label}
            </p>
            <div className="mt-3 text-7xl font-bold tabular-nums text-foreground">{pct}%</div>
            <p className="mt-2 text-sm text-muted-foreground">
              <span className="text-foreground font-medium">{correct}</span> de{' '}
              <span className="text-foreground font-medium">{total}</span> correctas
            </p>
          </div>
          <p className="text-xs text-muted-foreground/60 truncate">{quiz.title}</p>

          {/* Visual breakdown */}
          <div className="flex h-2 rounded-full overflow-hidden bg-border/40">
            <div
              className="bg-emerald-500 transition-all duration-700"
              style={{ width: `${pct}%` }}
            />
            <div
              className="bg-red-500/70 transition-all duration-700"
              style={{ width: `${100 - pct}%` }}
            />
          </div>

          <div className="flex justify-center gap-2 pt-2">
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

  const typeLabel =
    current.type === 'multiple_choice' ? 'Opción múltiple'
    : current.type === 'true_false' ? 'Verdadero / Falso'
    : 'Desarrollo'

  return (
    <div className="space-y-8 max-w-2xl mx-auto w-full">
      {/* Header + progress */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="size-3.5" />
            Quizzes
          </button>
          <p className="text-xs text-muted-foreground tabular-nums">
            <span className="text-foreground font-medium">{idx + 1}</span>
            <span className="text-muted-foreground/50"> / {questions.length}</span>
          </p>
        </div>
        <div className="h-1.5 bg-border/40 rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-500 ease-out"
            style={{ width: `${(idx / questions.length) * 100}%` }}
          />
        </div>
        <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground/60 truncate">
          {quiz.title}
        </p>
      </div>

      {/* Question card */}
      <div className="rounded-2xl border border-border/60 bg-gradient-to-br from-card to-card/50 shadow-lg shadow-black/5 p-8 space-y-5">
        <span className="inline-flex text-[10px] uppercase tracking-[0.22em] text-primary/80 px-2 py-1 rounded-full bg-primary/10 border border-primary/20">
          {typeLabel}
        </span>
        <p className="text-lg font-medium leading-relaxed text-foreground">{current.question}</p>
      </div>

      {/* Options (MC / TF) */}
      {(current.type === 'multiple_choice' || current.type === 'true_false') && (
        <div className="space-y-2.5">
          {(current.options ?? []).map((opt, i) => {
            const isSel = selected === opt
            const isAnswer = opt === current.answer
            let cls =
              'border-border/60 bg-card/40 hover:bg-card/80 hover:border-primary/30 text-foreground cursor-pointer'
            let prefixCls = 'bg-secondary/60 text-muted-foreground border-border/60'
            if (isRevealed) {
              if (isAnswer) {
                cls = 'border-emerald-500/60 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 cursor-default'
                prefixCls = 'bg-emerald-500/20 text-emerald-600 border-emerald-500/40'
              } else if (isSel) {
                cls = 'border-red-500/60 bg-red-500/10 text-red-700 dark:text-red-400 cursor-default'
                prefixCls = 'bg-red-500/20 text-red-600 border-red-500/40'
              } else {
                cls = 'border-border/30 bg-card/20 text-muted-foreground/70 cursor-default'
              }
            } else if (isSel) {
              cls = 'border-primary/60 bg-primary/10 text-foreground cursor-pointer'
              prefixCls = 'bg-primary/20 text-primary border-primary/40'
            }
            const letter = String.fromCharCode(65 + i)
            return (
              <button
                key={opt}
                type="button"
                onClick={() => !isRevealed && setSelected(opt)}
                disabled={isRevealed}
                className={cn(
                  'w-full text-left px-4 py-3.5 rounded-xl border-2 text-sm transition-all flex items-center gap-3',
                  cls,
                )}
              >
                <span
                  className={cn(
                    'flex size-7 shrink-0 items-center justify-center rounded-md border text-xs font-mono font-semibold transition-colors',
                    prefixCls,
                  )}
                >
                  {letter}
                </span>
                <span className="flex-1">{opt}</span>
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
          className="resize-none text-sm rounded-xl border-2 border-border/60 focus:border-primary/40 p-4 min-h-[120px]"
          rows={4}
        />
      )}

      {/* Explanation panel (revealed) */}
      {isRevealed && (
        <div
          className={cn(
            'rounded-xl border-2 p-5 space-y-3 transition-colors',
            current.type === 'open'
              ? 'border-border/60 bg-card/40'
              : isCorrect
              ? 'border-emerald-500/40 bg-emerald-500/5'
              : 'border-red-500/40 bg-red-500/5',
          )}
        >
          {current.type !== 'open' && (
            <div className="flex items-center gap-2">
              {isCorrect ? (
                <CheckCircle2 className="size-5 text-emerald-500 shrink-0" />
              ) : (
                <XCircle className="size-5 text-red-500 shrink-0" />
              )}
              <span
                className={cn(
                  'text-sm font-semibold',
                  isCorrect ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400',
                )}
              >
                {isCorrect ? '¡Correcto!' : 'Incorrecto'}
              </span>
              {!isCorrect && (
                <span className="text-sm text-muted-foreground">
                  — Respuesta:{' '}
                  <span className="text-foreground font-medium">{current.answer}</span>
                </span>
              )}
            </div>
          )}
          {current.type === 'open' && (
            <div className="space-y-1.5">
              <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground/70">
                Respuesta esperada
              </p>
              <p className="text-sm font-medium text-foreground leading-relaxed">{current.answer}</p>
            </div>
          )}
          {current.explanation && (
            <p className="text-xs text-muted-foreground leading-relaxed border-t border-border/40 pt-3">
              💡 {current.explanation}
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
