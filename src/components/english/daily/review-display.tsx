import { Sparkles, Copy } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { DailyQuestionScore } from '@/lib/english/daily-questions'

interface Props {
  scores: DailyQuestionScore[] | null
  overall: number | null
  corrected_text: string | null
  suggestions: string[]
}

export function ReviewDisplay({ scores, overall, corrected_text, suggestions }: Props) {
  if (!scores || overall == null) return null

  function copy() {
    if (!corrected_text) return
    navigator.clipboard.writeText(corrected_text)
    toast.success('Copied')
  }

  const tier =
    overall >= 90 ? 'text-emerald-500'
    : overall >= 70 ? 'text-primary'
    : overall >= 50 ? 'text-amber-500'
    : 'text-orange-500'

  return (
    <div className="space-y-4 rounded-xl border-2 border-border/60 bg-card/40 p-5">
      {/* Header — overall score */}
      <div className="flex items-center justify-between border-b border-border/40 pb-4">
        <div className="flex items-center gap-2">
          <Sparkles className="size-3.5 text-primary" />
          <span className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">AI Review</span>
        </div>
        <div className="flex items-baseline gap-1">
          <span className={cn('text-3xl font-semibold tabular-nums', tier)}>{overall}</span>
          <span className="text-xs text-muted-foreground">/ 100</span>
        </div>
      </div>

      {/* Scores grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {scores.map((s) => (
          <div key={s.metric} className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground">{s.metric}</span>
              <span className="text-xs font-medium tabular-nums text-foreground">{s.value}</span>
            </div>
            <div className="h-1 rounded-full bg-border/40 overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-500"
                style={{ width: `${s.value}%` }}
              />
            </div>
            <p className="text-[11px] text-muted-foreground/80 leading-snug">{s.feedback}</p>
          </div>
        ))}
      </div>

      {/* Suggestions */}
      {suggestions.length > 0 && (
        <div className="pt-2 border-t border-border/40">
          <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-2">Suggestions</p>
          <ul className="space-y-1.5">
            {suggestions.map((s, i) => (
              <li key={i} className="flex gap-2 text-xs text-foreground/80">
                <span className="text-primary shrink-0">•</span>
                <span className="leading-relaxed">{s}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Corrected text */}
      {corrected_text && (
        <div className="pt-2 border-t border-border/40 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Corrected version</p>
            <Button size="sm" variant="ghost" className="h-6 px-2 text-xs gap-1" onClick={copy}>
              <Copy className="size-3" />
              Copy
            </Button>
          </div>
          <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground/90">{corrected_text}</p>
        </div>
      )}
    </div>
  )
}
