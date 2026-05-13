import { useEffect, useState } from 'react'
import { Link } from '@tanstack/react-router'
import {
  Sparkles, LineChart, BookOpen, Mic, Library, ChevronRight, Flame, type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  listVocab, listEvaluatorRuns, listShadowingSessions, listBooks,
} from '@/lib/english/queries'
import { listDailyQuestions } from '@/lib/english/daily-questions-queries'
import type { DailyQuestionWithAnswer } from '@/lib/english/daily-questions'

interface Metric {
  primary: string
  primaryLabel: string
  secondary?: string
  accent?: string
}

interface Mode {
  id: string
  label: string
  to: string
  icon: LucideIcon
  blurb: string
  tint: string
  iconColor: string
}

const MODES: Mode[] = [
  {
    id: 'daily',
    label: 'Daily Drill',
    to: '/english/daily',
    icon: Sparkles,
    blurb: 'AI generates a question. You answer. Get scored.',
    tint: 'from-amber-500/10 to-amber-500/0 border-amber-500/30',
    iconColor: 'text-amber-400',
  },
  {
    id: 'evaluator',
    label: 'Writing Lab',
    to: '/english/evaluator',
    icon: LineChart,
    blurb: 'Paste a text or pick a post. Six-axis profile + corrections.',
    tint: 'from-blue-500/10 to-blue-500/0 border-blue-500/30',
    iconColor: 'text-blue-400',
  },
  {
    id: 'vocab',
    label: 'Vocab Vault',
    to: '/english/vocab',
    icon: BookOpen,
    blurb: 'Words, phrases, connectors. Tip of the day. Save to Anki.',
    tint: 'from-emerald-500/10 to-emerald-500/0 border-emerald-500/30',
    iconColor: 'text-emerald-400',
  },
  {
    id: 'shadowing',
    label: 'Shadowing Studio',
    to: '/english/shadowing',
    icon: Mic,
    blurb: 'Imitate an audio. Track quality. Repeat the weak ones.',
    tint: 'from-violet-500/10 to-violet-500/0 border-violet-500/30',
    iconColor: 'text-violet-400',
  },
  {
    id: 'books',
    label: 'Reading Log',
    to: '/english/books',
    icon: Library,
    blurb: 'Books, annotations, ratings.',
    tint: 'from-rose-500/10 to-rose-500/0 border-rose-500/30',
    iconColor: 'text-rose-400',
  },
]

function computeAnswerStreak(items: DailyQuestionWithAnswer[]): number {
  const dates = new Set<string>()
  for (const it of items) {
    if (it.answer) {
      dates.add(new Date(it.answer.created_at).toISOString().slice(0, 10))
    }
  }
  if (dates.size === 0) return 0

  let streak = 0
  const cursor = new Date()
  cursor.setHours(0, 0, 0, 0)

  if (!dates.has(cursor.toISOString().slice(0, 10))) {
    cursor.setDate(cursor.getDate() - 1)
    if (!dates.has(cursor.toISOString().slice(0, 10))) return 0
  }

  while (dates.has(cursor.toISOString().slice(0, 10))) {
    streak += 1
    cursor.setDate(cursor.getDate() - 1)
  }
  return streak
}

type Metrics = Record<string, Metric | null>

export function EnglishDashboard() {
  'use no memo'
  const [metrics, setMetrics] = useState<Metrics>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    async function load() {
      try {
        const [daily, runs, vocab, shadowing, books] = await Promise.all([
          listDailyQuestions(200).catch(() => [] as DailyQuestionWithAnswer[]),
          listEvaluatorRuns().catch(() => []),
          listVocab().catch(() => []),
          listShadowingSessions().catch(() => []),
          listBooks().catch(() => []),
        ])
        if (!alive) return

        const answered = daily.filter((d) => d.answer != null)
        const streak = computeAnswerStreak(daily)

        const bestOverall = runs.length === 0
          ? 0
          : Math.max(...runs.map((r) =>
              Math.round(r.scores.reduce((a, s) => a + s.value, 0) / Math.max(1, r.scores.length)),
            ))

        const masteredShadowing = shadowing.filter((s) => s.quality === 'mastered').length

        const ratedBooks = books.filter((b) => (b.rating ?? 0) > 0).length

        setMetrics({
          daily: {
            primary: String(answered.length),
            primaryLabel: answered.length === 1 ? 'answer' : 'answers',
            secondary: streak > 0 ? `${streak}-day streak` : undefined,
            accent: streak > 0 ? 'text-amber-400' : undefined,
          },
          evaluator: {
            primary: String(runs.length),
            primaryLabel: runs.length === 1 ? 'run' : 'runs',
            secondary: runs.length > 0 ? `best ${bestOverall}/100` : undefined,
          },
          vocab: {
            primary: String(vocab.length),
            primaryLabel: vocab.length === 1 ? 'entry' : 'entries',
          },
          shadowing: {
            primary: String(shadowing.length),
            primaryLabel: shadowing.length === 1 ? 'session' : 'sessions',
            secondary: masteredShadowing > 0 ? `${masteredShadowing} mastered` : undefined,
          },
          books: {
            primary: String(books.length),
            primaryLabel: books.length === 1 ? 'book' : 'books',
            secondary: ratedBooks > 0 ? `${ratedBooks} rated` : undefined,
          },
        })
      } finally {
        if (alive) setLoading(false)
      }
    }
    load()
    return () => { alive = false }
  }, [])

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
      {MODES.map((mode) => {
        const Icon = mode.icon
        const m = metrics[mode.id]
        return (
          <Link
            key={mode.id}
            to={mode.to}
            className={cn(
              'group relative flex flex-col gap-4 rounded-2xl border bg-gradient-to-br',
              'p-5 text-left transition-all duration-200',
              'hover:shadow-lg hover:shadow-black/5 hover:-translate-y-0.5',
              mode.tint,
            )}
          >
            <div className="flex items-start justify-between">
              <span
                className={cn(
                  'flex size-11 items-center justify-center rounded-xl border bg-background/40',
                  mode.tint.split(' ')[2],
                )}
              >
                <Icon className={cn('size-5', mode.iconColor)} />
              </span>
              <ChevronRight className="size-4 text-muted-foreground/40 group-hover:text-foreground group-hover:translate-x-0.5 transition-all mt-2" />
            </div>

            <div className="flex-1">
              <p className="text-base font-medium text-foreground">{mode.label}</p>
              <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                {mode.blurb}
              </p>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-border/40 min-h-[28px]">
              {loading ? (
                <span className="h-3.5 w-24 rounded bg-muted/40 animate-pulse" />
              ) : m ? (
                <>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-base font-medium tabular-nums text-foreground">{m.primary}</span>
                    <span className="text-[11px] text-muted-foreground">{m.primaryLabel}</span>
                  </div>
                  {m.secondary && (
                    <span className={cn(
                      'text-[11px] tabular-nums flex items-center gap-1',
                      m.accent ?? 'text-muted-foreground',
                    )}>
                      {mode.id === 'daily' && m.accent && <Flame className="size-3" />}
                      {m.secondary}
                    </span>
                  )}
                </>
              ) : (
                <span className="text-[11px] text-muted-foreground/50">—</span>
              )}
            </div>
          </Link>
        )
      })}
    </div>
  )
}
