import { useState, useEffect } from 'react'
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  ResponsiveContainer,
} from 'recharts'
import { Button } from '@/components/ui/button'
import { Sparkles, Loader2 } from 'lucide-react'
import { createEvaluatorRun } from '@/lib/english/queries'
import type { EvaluatorRun } from '@/lib/english/types'
import type { SourceMode } from '@/components/english/evaluator/source-picker'

type Score = {
  metric: string
  value: number
  description: string
}

function analyze(text: string): Score[] {
  const words = text.trim().split(/\s+/).filter(Boolean)
  const wc = Math.max(1, words.length)
  const avgLen = words.reduce((a, w) => a + w.length, 0) / wc
  const longWords = words.filter((w) => w.length >= 8).length / wc
  const punctuation = (text.match(/[,;:—()]/g) ?? []).length / wc
  const connectors = (text.match(
    /\b(however|therefore|moreover|furthermore|nonetheless|whereas|whilst|hence)\b/gi,
  ) ?? []).length / wc

  let h = 0
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) | 0
  const seed = Math.abs(h % 100) / 100

  const clamp = (n: number) => Math.max(40, Math.min(98, Math.round(n)))

  return [
    {
      metric: 'Formality',
      value: clamp(55 + longWords * 200 + connectors * 80 + seed * 10),
      description: 'Register and word choice on a casual–academic spectrum.',
    },
    {
      metric: 'Naturalness',
      value: clamp(60 + (avgLen < 6 ? 15 : 5) + (1 - longWords) * 25 + seed * 8),
      description: 'How closely the prose mirrors fluent everyday English.',
    },
    {
      metric: 'Nativeness',
      value: clamp(50 + (1 - Math.abs(avgLen - 4.7) / 4.7) * 40 + seed * 12),
      description: 'Idiomatic phrasing patterns typical of native speakers.',
    },
    {
      metric: 'Complexity',
      value: clamp(45 + longWords * 180 + Math.min(40, text.trim().length / 20) + seed * 5),
      description: 'Lexical and syntactic difficulty of the passage.',
    },
    {
      metric: 'Cohesion',
      value: clamp(50 + connectors * 220 + punctuation * 60 + seed * 7),
      description: 'Use of connectors and reference chains across sentences.',
    },
    {
      metric: 'Coherence',
      value: clamp(58 + connectors * 100 + (1 - longWords) * 30 + seed * 6),
      description: 'Logical progression of ideas at the paragraph level.',
    },
  ]
}

const DEFAULT_TEXT =
  'Although the early drafts felt clumsy, I kept rewriting until the rhythm of the sentences finally matched what I had in mind. The exercise reminded me that fluency is mostly the patience to revise.'

interface TextAnalyzerProps {
  source?: SourceMode
  sourceRef?: string | null
  initialText?: string
  onSaved?: (run: EvaluatorRun) => void
}

export function TextAnalyzer({
  source = 'paste',
  sourceRef = null,
  initialText,
  onSaved,
}: TextAnalyzerProps) {
  'use no memo'
  const [text, setText] = useState(initialText ?? DEFAULT_TEXT)
  const [result, setResult] = useState<Score[] | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (initialText !== undefined) setText(initialText)
  }, [initialText])

  const handleAnalyze = async () => {
    if (!text.trim()) return
    setLoading(true)
    await new Promise((r) => setTimeout(r, 700))
    const scores = analyze(text)
    setResult(scores)
    setLoading(false)

    try {
      const run = await createEvaluatorRun({
        source,
        source_ref: sourceRef,
        input_text: text,
        scores: scores.map((s) => ({ metric: s.metric, value: s.value })),
      })
      onSaved?.(run)
    } catch {
      // Non-blocking — UI already updated
    }
  }

  const overall = result
    ? Math.round(result.reduce((a, s) => a + s.value, 0) / result.length)
    : null

  const chartData =
    result?.map((s) => ({ metric: s.metric, value: s.value })) ?? [
      { metric: 'Formality', value: 0 },
      { metric: 'Naturalness', value: 0 },
      { metric: 'Nativeness', value: 0 },
      { metric: 'Complexity', value: 0 },
      { metric: 'Cohesion', value: 0 },
      { metric: 'Coherence', value: 0 },
    ]

  return (
    <div className="rounded-lg border border-border/70 bg-card/40 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 border-b border-border/70">
        <div className="flex items-center gap-2">
          <Sparkles className="size-3.5 text-primary" />
          <h3 className="text-sm font-medium">AI Evaluator Agent</h3>
          <span className="text-[10px] text-muted-foreground/70 px-1.5 py-0.5 rounded border border-border/60">
            simulated
          </span>
        </div>
        {overall !== null && (
          <div className="flex items-center gap-2 text-xs">
            <span className="text-muted-foreground">Overall</span>
            <span className="font-mono tabular-nums text-primary">{overall}</span>
            <span className="text-muted-foreground/60">/ 100</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2">
        {/* Input */}
        <div className="p-5 border-b md:border-b-0 md:border-r border-border/70">
          <label
            htmlFor="text-analyze"
            className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground"
          >
            {source === 'paste' ? 'Paste your text' : `Text from ${source}`}
          </label>
          <textarea
            id="text-analyze"
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={9}
            className="mt-2 w-full resize-none rounded-md border border-border/70 bg-background/60 px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary/40 transition-colors leading-relaxed"
            placeholder="Write or paste a paragraph in English…"
          />
          <div className="mt-3 flex items-center justify-between">
            <span className="text-[11px] text-muted-foreground tabular-nums">
              {text.trim().split(/\s+/).filter(Boolean).length} words
            </span>
            <Button
              size="sm"
              onClick={handleAnalyze}
              disabled={loading || !text.trim()}
              className="h-8 text-xs"
            >
              {loading ? (
                <>
                  <Loader2 className="size-3 animate-spin" />
                  Analyzing
                </>
              ) : (
                <>
                  <Sparkles className="size-3" />
                  Analyze
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Chart */}
        <div className="p-5">
          <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-2">
            Profile
          </p>
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={chartData} outerRadius="78%">
                <PolarGrid
                  stroke="var(--border)"
                  strokeDasharray="2 3"
                  radialLines
                />
                <PolarAngleAxis
                  dataKey="metric"
                  tick={{
                    fill: 'var(--muted-foreground)',
                    fontSize: 10,
                    letterSpacing: '0.05em',
                  }}
                />
                <Radar
                  dataKey="value"
                  stroke="var(--primary)"
                  fill="var(--primary)"
                  fillOpacity={0.18}
                  strokeWidth={1.5}
                  isAnimationActive
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Metric breakdown */}
      {result && (
        <div className="grid grid-cols-2 md:grid-cols-3 border-t border-border/70 divide-x divide-y md:divide-y-0 divide-border/70">
          {result.map((s) => (
            <div key={s.metric} className="p-4">
              <div className="flex items-baseline justify-between">
                <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  {s.metric}
                </span>
                <span className="font-mono text-sm tabular-nums text-foreground">
                  {s.value}
                </span>
              </div>
              <div className="mt-2 h-1 rounded-full bg-secondary overflow-hidden">
                <div
                  className="h-full bg-primary/80 transition-all duration-700"
                  style={{ width: `${s.value}%` }}
                />
              </div>
              <p className="mt-2 text-[11px] text-muted-foreground/90 leading-relaxed">
                {s.description}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
