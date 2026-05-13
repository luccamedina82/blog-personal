import { useState } from 'react'
import { Sparkles, Send, RotateCcw, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ToneSelector } from './tone-selector'
import { ReviewDisplay } from './review-display'
import {
  createDailyQuestion,
  submitDailyAnswer,
} from '@/lib/english/daily-questions-queries'
import type {
  DailyQuestion,
  DailyQuestionAnswer,
  DailyQuestionTone,
  ReviewResultPayload,
} from '@/lib/english/daily-questions'

interface Props {
  recentQuestions: string[]
  onCreated: (q: DailyQuestion) => void
  onAnswered: (questionId: string, answer: DailyQuestionAnswer) => void
}

export function DailyQuestionCard({ recentQuestions, onCreated, onAnswered }: Props) {
  const [tone, setTone] = useState<DailyQuestionTone>('casual')
  const [question, setQuestion] = useState<DailyQuestion | null>(null)
  const [answer, setAnswer] = useState('')
  const [reviewResult, setReviewResult] = useState<ReviewResultPayload | null>(null)
  const [generating, setGenerating] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  async function handleGenerate() {
    setGenerating(true)
    setReviewResult(null)
    setAnswer('')
    try {
      const res = await fetch('/api/ai/daily-question', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tone, recent: recentQuestions }),
      })
      if (!res.ok) throw new Error('failed')
      const data = (await res.json()) as { question: string; model: string }
      const saved = await createDailyQuestion(data.question, tone, data.model)
      setQuestion(saved)
      onCreated(saved)
    } catch {
      toast.error('Failed to generate question')
    } finally {
      setGenerating(false)
    }
  }

  async function handleSubmit() {
    if (!question || !answer.trim()) return
    console.log('[daily] submit start, question.id =', question.id)
    setSubmitting(true)
    let review: ReviewResultPayload | null = null
    try {
      const res = await fetch('/api/ai/review-answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: question.question, answer: answer.trim() }),
      })
      console.log('[daily] review-answer response status =', res.status)
      if (!res.ok) throw new Error(`review-answer http ${res.status}`)
      review = (await res.json()) as ReviewResultPayload
      console.log('[daily] review payload =', review)
    } catch (err) {
      console.error('[daily] review fetch error:', err)
      toast.error('Failed to review answer')
      setSubmitting(false)
      return
    }

    setReviewResult(review)
    try {
      console.log('[daily] inserting answer…')
      const saved = await submitDailyAnswer(question.id, answer.trim(), review)
      console.log('[daily] insert ok, saved =', saved)
      onAnswered(question.id, saved)
      toast.success('Answer saved')
    } catch (err) {
      console.error('[daily] persist answer error:', err)
      toast.error('Review generated but failed to save')
    } finally {
      setSubmitting(false)
    }
  }

  function reset() {
    setQuestion(null)
    setAnswer('')
    setReviewResult(null)
  }

  if (!question) {
    return (
      <div className="rounded-2xl border border-border/60 bg-gradient-to-br from-card to-card/40 p-6 shadow-sm space-y-5">
        <div>
          <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-1">Daily</p>
          <h2 className="text-xl font-semibold tracking-tight">Practice with a new question</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Pick a tone and AI generates a question. Answer in English and get scores + corrections.
          </p>
        </div>

        <div className="space-y-2">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Tone</p>
          <ToneSelector value={tone} onChange={setTone} disabled={generating} />
        </div>

        <Button onClick={handleGenerate} disabled={generating} className="gap-1.5">
          {generating ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}
          {generating ? 'Generating…' : 'New question'}
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Question */}
      <div className="rounded-2xl border border-border/60 bg-gradient-to-br from-card to-card/50 p-6 shadow-sm space-y-4">
        <div className="flex items-start justify-between gap-3">
          <span className="inline-flex text-[10px] uppercase tracking-[0.22em] text-primary/80 px-2 py-1 rounded-full bg-primary/10 border border-primary/20">
            {question.tone}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={reset}
            disabled={submitting}
            className="gap-1.5 text-xs h-7"
          >
            <RotateCcw className="size-3" />
            New one
          </Button>
        </div>
        <p className="text-lg font-medium leading-relaxed text-foreground">{question.question}</p>
      </div>

      {/* Answer area */}
      {!reviewResult && (
        <div className="space-y-3">
          <Textarea
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder="Write your answer in English…"
            className="resize-none text-sm rounded-xl border-2 border-border/60 focus:border-primary/40 p-4 min-h-[140px]"
            rows={5}
            disabled={submitting}
          />
          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] text-muted-foreground tabular-nums">
              {answer.trim().split(/\s+/).filter(Boolean).length} words
            </p>
            <Button
              onClick={handleSubmit}
              disabled={submitting || !answer.trim()}
              className="gap-1.5"
            >
              {submitting ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
              {submitting ? 'Reviewing…' : 'Submit answer'}
            </Button>
          </div>
        </div>
      )}

      {/* Review */}
      {reviewResult && (
        <ReviewDisplay
          scores={reviewResult.scores}
          overall={reviewResult.overall}
          corrected_text={reviewResult.corrected_text}
          suggestions={reviewResult.suggestions}
        />
      )}
    </div>
  )
}
