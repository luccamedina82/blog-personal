import { useState, useEffect } from 'react'
import { Plus, BookOpen, Trash2, Play, Sparkles, HelpCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import {
  listQuizzes,
  getQuiz,
  deleteQuiz,
  type QuizWithCount,
} from '@/lib/faculty/quizzes'
import type { Quiz, QuizQuestion, FacultyNote } from '@/lib/faculty/types'
import { QuizBuilder } from './quiz-builder'
import { QuizPlay } from './quiz-play'

interface Props {
  subjectId: string
  notes: FacultyNote[]
}

export function QuizTab({ subjectId, notes }: Props) {
  const [quizzes, setQuizzes] = useState<QuizWithCount[]>([])
  const [loading, setLoading] = useState(true)
  const [builderOpen, setBuilderOpen] = useState(false)
  const [playState, setPlayState] = useState<{ quiz: Quiz; questions: QuizQuestion[] } | null>(
    null,
  )

  useEffect(() => {
    listQuizzes(subjectId)
      .then(setQuizzes)
      .catch(() => toast.error('Error al cargar quizzes'))
      .finally(() => setLoading(false))
  }, [subjectId])

  async function handlePlay(id: string) {
    try {
      const result = await getQuiz(id)
      setPlayState(result)
    } catch {
      toast.error('Error al cargar quiz')
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteQuiz(id)
      setQuizzes((prev) => prev.filter((q) => q.id !== id))
      toast.success('Quiz eliminado')
    } catch {
      toast.error('Error al eliminar')
    }
  }

  if (playState) {
    return (
      <QuizPlay
        quiz={playState.quiz}
        questions={playState.questions}
        onBack={() => setPlayState(null)}
      />
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 min-w-0">
          <Sparkles className="size-4 text-primary" />
          <p className="text-sm font-medium text-foreground">
            Quizzes
            <span className="ml-2 text-[11px] text-muted-foreground tabular-nums">
              {loading ? '…' : quizzes.length}
            </span>
          </p>
        </div>
        <Button
          size="sm"
          className="gap-1.5 shrink-0"
          onClick={() => setBuilderOpen(true)}
        >
          <Plus className="size-3.5" />
          Nuevo quiz
        </Button>
      </div>

      {!loading && quizzes.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center rounded-xl border border-dashed border-border/70">
          <div className="relative">
            <BookOpen className="size-10 text-muted-foreground/25" />
            <Sparkles className="absolute -top-1 -right-1.5 size-4 text-primary/60" />
          </div>
          <p className="text-sm text-muted-foreground mt-3">No hay quizzes aún.</p>
          <p className="text-xs text-muted-foreground/60 mt-1 max-w-xs">
            Generá uno desde tus notas con IA y poné a prueba lo que sabés.
          </p>
          <Button size="sm" variant="outline" className="mt-4 gap-1.5" onClick={() => setBuilderOpen(true)}>
            <Sparkles className="size-3.5" />
            Crear primer quiz
          </Button>
        </div>
      )}

      {quizzes.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {quizzes.map((q) => (
            <div
              key={q.id}
              className={cn(
                'group relative flex flex-col rounded-xl border border-border/60 bg-card/40 p-4',
                'hover:bg-card/70 hover:border-border transition-all overflow-hidden',
              )}
            >
              <span className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-primary/60 to-primary/20" aria-hidden />

              <div className="flex items-start gap-3 pl-2">
                <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
                  <HelpCircle className="size-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground leading-snug line-clamp-2">{q.title}</p>
                  <p className="text-[11px] text-muted-foreground mt-1 tabular-nums">
                    {q.questionCount} pregunta{q.questionCount !== 1 ? 's' : ''}
                    <span className="mx-1.5 text-muted-foreground/40">·</span>
                    {new Date(q.created_at).toLocaleDateString('es-AR', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 mt-4 pl-2">
                <Button
                  size="sm"
                  className="gap-1.5 h-8 px-3 text-xs flex-1"
                  onClick={() => handlePlay(q.id)}
                >
                  <Play className="size-3.5 fill-current" />
                  Jugar
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 text-muted-foreground/60 hover:text-destructive shrink-0"
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>¿Eliminar quiz?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Esta acción no se puede deshacer.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => handleDelete(q.id)}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Eliminar
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          ))}
        </div>
      )}

      <QuizBuilder
        open={builderOpen}
        onClose={() => setBuilderOpen(false)}
        subjectId={subjectId}
        notes={notes}
        onCreated={(quiz, questionCount) => {
          setQuizzes((prev) => [{ ...quiz, questionCount }, ...prev])
          setBuilderOpen(false)
          toast.success('Quiz creado')
        }}
      />
    </div>
  )
}
