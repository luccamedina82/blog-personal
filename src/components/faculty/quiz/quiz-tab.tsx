import { useState, useEffect } from 'react'
import { Plus, BookOpen, Trash2, Play } from 'lucide-react'
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
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {loading
            ? 'Cargando…'
            : `${quizzes.length} quiz${quizzes.length !== 1 ? 'zes' : ''}`}
        </p>
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5"
          onClick={() => setBuilderOpen(true)}
        >
          <Plus className="size-3.5" />
          Nuevo quiz
        </Button>
      </div>

      {!loading && quizzes.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <BookOpen className="size-8 text-muted-foreground/30 mb-3" />
          <p className="text-sm text-muted-foreground">No hay quizzes aún.</p>
          <p className="text-xs text-muted-foreground/60 mt-1">
            Generá uno desde tus notas con IA.
          </p>
        </div>
      )}

      {quizzes.length > 0 && (
        <div className="rounded-lg border border-border/70 overflow-hidden bg-card/40">
          <ul className="divide-y divide-border/70">
            {quizzes.map((q) => (
              <li
                key={q.id}
                className="flex items-center gap-3 px-4 py-3 hover:bg-card/60 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{q.title}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {q.questionCount} pregunta{q.questionCount !== 1 ? 's' : ''} ·{' '}
                    {new Date(q.created_at).toLocaleDateString('es-AR', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5 h-7 px-2.5 text-xs"
                    onClick={() => handlePlay(q.id)}
                  >
                    <Play className="size-3" />
                    Jugar
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7 text-muted-foreground hover:text-destructive"
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
              </li>
            ))}
          </ul>
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
