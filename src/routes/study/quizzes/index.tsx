import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { StudyShell } from '@/components/study/study-shell'
import { QuizzesList } from '@/components/study/quizzes-list'
import { listAllQuizzes, type QuizWithSubject } from '@/lib/faculty/quizzes'

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

  return (
    <StudyShell>
      {loading ? (
        <p className="text-xs text-muted-foreground">Cargando…</p>
      ) : (
        <QuizzesList quizzes={quizzes} />
      )}
    </StudyShell>
  )
}
