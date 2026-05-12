import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { QuizPlay } from '@/components/faculty/quiz/quiz-play'
import { getQuiz } from '@/lib/faculty/quizzes'
import type { Quiz, QuizQuestion } from '@/lib/faculty/types'

export const Route = createFileRoute('/study/quizzes/$quizId')({
  component: QuizPlayPage,
})

function QuizPlayPage() {
  const { quizId } = Route.useParams()
  const navigate = useNavigate()
  const [quiz, setQuiz] = useState<Quiz | null>(null)
  const [questions, setQuestions] = useState<QuizQuestion[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getQuiz(quizId)
      .then(({ quiz, questions }) => {
        setQuiz(quiz)
        setQuestions(questions)
      })
      .catch(() => toast.error('No se pudo cargar el quiz'))
      .finally(() => setLoading(false))
  }, [quizId])

  if (loading) {
    return (
      <div className="px-6 lg:px-12 py-10 min-h-screen bg-background">
        <p className="text-xs text-muted-foreground">Cargando…</p>
      </div>
    )
  }
  if (!quiz) {
    return (
      <div className="px-6 lg:px-12 py-10 min-h-screen bg-background">
        <p className="text-sm text-muted-foreground">Quiz no encontrado.</p>
      </div>
    )
  }

  return (
    <div className="px-6 lg:px-12 py-10 min-h-screen bg-background">
      <QuizPlay
        quiz={quiz}
        questions={questions}
        onBack={() => navigate({ to: '/study/quizzes' })}
      />
    </div>
  )
}
