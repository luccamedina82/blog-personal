import { Link } from '@tanstack/react-router'
import { ChevronRight, FileQuestion, GraduationCap, Play, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { QuizWithSubject } from '@/lib/faculty/quizzes'

interface Props {
  quizzes: QuizWithSubject[]
}

function relativeDate(iso: string): string {
  const d = new Date(iso)
  const diff = Date.now() - d.getTime()
  const days = Math.floor(diff / 86400000)
  if (days === 0) return 'hoy'
  if (days === 1) return 'ayer'
  if (days < 7) return `hace ${days} días`
  if (days < 30) return `hace ${Math.floor(days / 7)} sem`
  if (days < 365) return `hace ${Math.floor(days / 30)} meses`
  return `hace ${Math.floor(days / 365)} años`
}

export function QuizzesList({ quizzes }: Props) {
  if (quizzes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
        <span className="flex size-14 items-center justify-center rounded-full bg-secondary/60 border border-border/60">
          <FileQuestion className="size-6 text-muted-foreground/60" />
        </span>
        <div>
          <h3 className="text-base font-medium">Sin quizzes</h3>
          <p className="mt-1 text-sm text-muted-foreground max-w-sm">
            Creá uno desde <span className="text-foreground">Faculty → materia → tab Quiz</span>.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-7">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-1">Quizzes</p>
          <h2 className="text-xl font-medium tracking-tight">Todos los quizzes</h2>
          <p className="mt-1 text-sm text-muted-foreground max-w-lg">
            Quizzes generados desde tus notas de Faculty. Jugá, practicá, repetí.
          </p>
        </div>
        <span className="shrink-0 inline-flex items-center gap-1.5 h-7 px-3 rounded-full bg-secondary/60 border border-border/60 text-xs text-muted-foreground tabular-nums">
          {quizzes.length} {quizzes.length === 1 ? 'quiz' : 'quizzes'}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3.5">
        {quizzes.map((q) => (
          <Link
            key={q.id}
            to="/study/quizzes/$quizId"
            params={{ quizId: q.id }}
            className={cn(
              'group relative flex flex-col gap-4 rounded-2xl border border-border/60',
              'bg-gradient-to-br from-card to-card/40 hover:from-card hover:to-card',
              'p-5 text-left transition-all duration-200',
              'hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5',
            )}
          >
            <div className="flex w-full items-start justify-between gap-2">
              <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 border border-primary/20">
                <FileQuestion className="size-4 text-primary" />
              </span>
              <span className="inline-flex items-center gap-1 h-6 px-2 rounded-full bg-secondary/60 border border-border/50 text-[10px] text-muted-foreground tabular-nums">
                {q.questionCount} Q
              </span>
            </div>

            <div className="w-full flex-1">
              <p className="text-sm font-medium text-foreground line-clamp-2 leading-snug">
                {q.title}
              </p>
              {q.subject_name && (
                <p className="mt-1.5 flex items-center gap-1 text-[11px] text-muted-foreground">
                  <GraduationCap className="size-3 shrink-0" />
                  <span className="truncate">{q.subject_name}</span>
                </p>
              )}
            </div>

            <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/40">
              <span className="flex items-center gap-1 text-[10px] text-muted-foreground/60">
                <Sparkles className="size-2.5" />
                {relativeDate(q.created_at)}
              </span>
              <span className="relative flex items-center text-[11px] text-muted-foreground/50 group-hover:text-primary font-medium transition-colors">
                <span className="opacity-0 group-hover:opacity-100 transition-opacity mr-1">Jugar</span>
                <Play className="size-3 fill-current opacity-0 group-hover:opacity-100 transition-opacity mr-0.5" />
                <ChevronRight className="size-3.5 group-hover:translate-x-0.5 transition-transform" />
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
