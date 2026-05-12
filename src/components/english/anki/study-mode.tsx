import { useState, useEffect } from 'react'
import { ArrowLeft, RotateCcw } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { listDueCards, updateCard } from '@/lib/english/queries'
import { sm2 } from '@/lib/english/srs'
import type { Card } from '@/lib/english/types'

const RATINGS = [
  { value: 1 as const, label: 'Again', className: 'border-destructive/40 text-destructive hover:bg-destructive/10' },
  { value: 2 as const, label: 'Hard', className: 'border-orange-400/40 text-orange-400 hover:bg-orange-400/10' },
  { value: 3 as const, label: 'Good', className: 'border-primary/40 text-primary hover:bg-primary/10' },
  { value: 4 as const, label: 'Easy', className: 'border-emerald-400/40 text-emerald-400 hover:bg-emerald-400/10' },
]

interface StudyModeProps {
  deckId: string
  onBack: () => void
}

export function StudyMode({ deckId, onBack }: StudyModeProps) {
  const [cards, setCards] = useState<Card[]>([])
  const [index, setIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ again: 0, hard: 0, good: 0, easy: 0 })

  useEffect(() => {
    setLoading(true)
    listDueCards(deckId)
      .then(setCards)
      .catch(() => toast.error('Failed to load cards'))
      .finally(() => setLoading(false))
  }, [deckId])

  const current = cards[index]
  const done = !loading && index >= cards.length
  const nonedue = !loading && cards.length === 0

  async function rate(rating: 1 | 2 | 3 | 4) {
    if (!current) return
    const result = sm2(current.ease, current.interval_days, rating)
    try {
      await updateCard(current.id, { ...result, reviews: current.reviews + 1 })
    } catch {
      toast.error('Failed to save rating')
    }
    const key = ['again', 'hard', 'good', 'easy'][rating - 1] as keyof typeof stats
    setStats((prev) => ({ ...prev, [key]: prev[key] + 1 }))
    setIndex((i) => i + 1)
    setFlipped(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    )
  }

  if (nonedue) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
        <p className="text-4xl">🎉</p>
        <div>
          <h3 className="text-base font-medium">All caught up</h3>
          <p className="text-sm text-muted-foreground mt-1">No cards due right now.</p>
        </div>
        <Button variant="outline" size="sm" onClick={onBack}>
          <ArrowLeft className="size-3.5 mr-1.5" />
          Back to deck
        </Button>
      </div>
    )
  }

  if (done) {
    const total = stats.again + stats.hard + stats.good + stats.easy
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center gap-6">
        <p className="text-4xl">✅</p>
        <div>
          <h3 className="text-base font-medium">Session complete</h3>
          <p className="text-sm text-muted-foreground mt-1">{total} cards reviewed</p>
        </div>
        <div className="grid grid-cols-4 gap-3 text-center">
          {[
            { label: 'Again', count: stats.again, color: 'text-destructive' },
            { label: 'Hard', count: stats.hard, color: 'text-orange-400' },
            { label: 'Good', count: stats.good, color: 'text-primary' },
            { label: 'Easy', count: stats.easy, color: 'text-emerald-400' },
          ].map(({ label, count, color }) => (
            <div key={label} className="rounded-lg border border-border/70 bg-card/40 px-4 py-3">
              <p className={`text-xl font-mono font-medium ${color}`}>{count}</p>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mt-0.5">{label}</p>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => { setIndex(0); setStats({ again: 0, hard: 0, good: 0, easy: 0 }); setFlipped(false) }}>
            <RotateCcw className="size-3.5 mr-1.5" />
            Again
          </Button>
          <Button variant="outline" size="sm" onClick={onBack}>
            <ArrowLeft className="size-3.5 mr-1.5" />
            Back to deck
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8 max-w-2xl mx-auto w-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="size-3.5" />
          Back
        </button>
        <p className="text-xs text-muted-foreground tabular-nums">
          <span className="text-foreground font-medium">{index + 1}</span>
          <span className="text-muted-foreground/50"> / {cards.length}</span>
        </p>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 rounded-full bg-border/40 overflow-hidden">
        <div
          className="h-full bg-primary transition-all duration-500 ease-out"
          style={{ width: `${(index / cards.length) * 100}%` }}
        />
      </div>

      {/* Flip card */}
      <div
        className="[perspective:1400px] cursor-pointer select-none group"
        onClick={() => setFlipped(!flipped)}
      >
        <div
          className={`relative h-72 sm:h-80 w-full [transform-style:preserve-3d] transition-transform duration-500 ${
            flipped ? '[transform:rotateY(180deg)]' : ''
          }`}
        >
          {/* Front */}
          <div className="absolute inset-0 [backface-visibility:hidden] flex flex-col items-center justify-center rounded-2xl border border-border/60 bg-gradient-to-br from-card to-card/60 p-10 gap-4 shadow-lg shadow-black/5 group-hover:border-primary/30 transition-colors">
            <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground/70">Front</p>
            <p className="text-3xl font-mono text-center text-foreground leading-snug font-medium">
              {current.front}
            </p>
            <p className="text-[11px] text-muted-foreground/60 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
              tap to reveal answer
            </p>
          </div>
          {/* Back */}
          <div className="absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)] flex flex-col items-center justify-center rounded-2xl border border-primary/30 bg-gradient-to-br from-card to-primary/5 p-10 gap-4 shadow-lg shadow-primary/10">
            <p className="text-[10px] uppercase tracking-[0.22em] text-primary/70">Back</p>
            <p className="text-xl text-center text-foreground leading-relaxed">{current.back}</p>
            {current.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 justify-center mt-2">
                {current.tags.map((t) => (
                  <span key={t} className="text-[10px] px-2 py-0.5 rounded-full bg-secondary/80 border border-border/50 text-muted-foreground">
                    {t}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Rating buttons — only after flip */}
      <div
        className={`grid grid-cols-4 gap-2 transition-all duration-300 ${
          flipped ? 'opacity-100 translate-y-0' : 'opacity-0 pointer-events-none translate-y-2'
        }`}
      >
        {RATINGS.map((r) => (
          <button
            key={r.value}
            type="button"
            onClick={() => rate(r.value)}
            className={`rounded-xl border-2 py-3.5 text-sm font-medium transition-all hover:scale-[1.02] active:scale-[0.98] ${r.className}`}
          >
            {r.label}
          </button>
        ))}
      </div>

      {!flipped && (
        <p className="text-center text-xs text-muted-foreground/70">
          Click the card to reveal the answer
        </p>
      )}
    </div>
  )
}
