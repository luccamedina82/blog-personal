import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { DailyQuestionCard } from '@/components/english/daily/daily-question-card'
import { QuestionHistory } from '@/components/english/daily/question-history'
import {
  listDailyQuestions,
  deleteDailyQuestion,
} from '@/lib/english/daily-questions-queries'
import type {
  DailyQuestion,
  DailyQuestionAnswer,
  DailyQuestionWithAnswer,
} from '@/lib/english/daily-questions'

export const Route = createFileRoute('/english/daily')({
  component: DailyPage,
})

function DailyPage() {
  const [items, setItems] = useState<DailyQuestionWithAnswer[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    listDailyQuestions(30)
      .then(setItems)
      .catch(() => toast.error('No se pudo cargar el historial'))
      .finally(() => setLoading(false))
  }, [])

  function handleCreated(q: DailyQuestion) {
    setItems((prev) => [{ ...q, answer: null }, ...prev])
  }

  function handleAnswered(questionId: string, answer: DailyQuestionAnswer) {
    setItems((prev) => prev.map((i) => (i.id === questionId ? { ...i, answer } : i)))
  }

  async function handleDelete(id: string) {
    try {
      await deleteDailyQuestion(id)
      setItems((prev) => prev.filter((i) => i.id !== id))
      toast.success('Eliminada')
    } catch {
      toast.error('Error al borrar')
    }
  }

  const recentQuestions = items.slice(0, 8).map((i) => i.question)

  return (
    <div className="max-w-2xl space-y-8">
      <DailyQuestionCard
        recentQuestions={recentQuestions}
        onCreated={handleCreated}
        onAnswered={handleAnswered}
      />

      {loading ? (
        <p className="text-xs text-muted-foreground">Cargando historial…</p>
      ) : (
        <QuestionHistory items={items} onDelete={handleDelete} />
      )}
    </div>
  )
}
