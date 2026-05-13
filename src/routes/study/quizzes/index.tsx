import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { StudyShell } from '@/components/study/study-shell'
import { QuizzesList } from '@/components/study/quizzes-list'
import { listAllQuizzes, deleteQuiz, type QuizWithSubject } from '@/lib/faculty/quizzes'

export const Route = createFileRoute('/study/quizzes/')({
  component: QuizzesPage,
})

function QuizzesPage() {
  const [quizzes, setQuizzes] = useState<QuizWithSubject[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    listAllQuizzes()
      .then(setQuizzes)
      .catch(() => toast.error('Failed to load quizzes'))
      .finally(() => setLoading(false))
  }, [])

  async function handleDelete(id: string) {
    setQuizzes((prev) => prev.filter((q) => q.id !== id))
    try {
      await deleteQuiz(id)
      toast.success('Quiz eliminado')
    } catch {
      toast.error('Error al eliminar quiz')
      listAllQuizzes().then(setQuizzes).catch(() => {})
    }
  }

  return (
    <StudyShell>
      {loading ? (
        <p className="text-xs text-muted-foreground">Cargando…</p>
      ) : (
        <QuizzesList quizzes={quizzes} onDelete={handleDelete} />
      )}
    </StudyShell>
  )
}
