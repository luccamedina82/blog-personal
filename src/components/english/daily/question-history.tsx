import { useState } from 'react'
import { ChevronDown, ChevronRight, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { ReviewDisplay } from './review-display'
import type { DailyQuestionWithAnswer } from '@/lib/english/daily-questions'

interface Props {
  items: DailyQuestionWithAnswer[]
  onDelete: (id: string) => void
}

const TONE_TINT: Record<string, string> = {
  casual: 'bg-amber-500/10 text-amber-500 border-amber-500/30',
  formal: 'bg-blue-500/10 text-blue-500 border-blue-500/30',
  technical: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30',
}

function relativeDate(iso: string): string {
  const d = new Date(iso)
  const diff = Date.now() - d.getTime()
  const days = Math.floor(diff / 86400000)
  if (days === 0) return 'today'
  if (days === 1) return 'yesterday'
  if (days < 7) return `${days}d ago`
  if (days < 30) return `${Math.floor(days / 7)}w ago`
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function QuestionHistory({ items, onDelete }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  if (items.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-8">
        No answers yet. Generate your first question above ↑
      </p>
    )
  }

  return (
    <div className="space-y-3">
      <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">History</p>
      <ul className="space-y-2">
        {items.map((item) => {
          const isExpanded = expandedId === item.id
          const hasAnswer = item.answer != null
          return (
            <li
              key={item.id}
              className="rounded-xl border border-border/60 bg-card/30 hover:bg-card/50 transition-colors"
            >
              <div className="flex items-start gap-3 p-4">
                <button
                  type="button"
                  onClick={() => setExpandedId(isExpanded ? null : item.id)}
                  className="mt-0.5 shrink-0 text-muted-foreground/50 hover:text-muted-foreground transition-colors"
                >
                  {isExpanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                </button>

                <button
                  type="button"
                  onClick={() => setExpandedId(isExpanded ? null : item.id)}
                  className="flex-1 min-w-0 text-left"
                >
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <span
                      className={cn(
                        'inline-flex text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded-full border',
                        TONE_TINT[item.tone] ?? 'bg-secondary/60 text-muted-foreground border-border/60',
                      )}
                    >
                      {item.tone}
                    </span>
                    <span className="text-[10px] text-muted-foreground/70">
                      {relativeDate(item.created_at)}
                    </span>
                    {hasAnswer && item.answer?.overall != null && (
                      <span className="ml-auto text-xs font-semibold tabular-nums text-primary">
                        {item.answer.overall}/100
                      </span>
                    )}
                    {!hasAnswer && (
                      <span className="ml-auto text-[10px] text-muted-foreground/60 italic">
                        unanswered
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-foreground leading-snug line-clamp-2">{item.question}</p>
                </button>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7 text-muted-foreground/40 hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete question?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Also deletes the answer and review. Cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => onDelete(item.id)}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>

              {isExpanded && item.answer && (
                <div className="border-t border-border/40 p-4 space-y-4">
                  <div className="space-y-1.5">
                    <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                      Your answer
                    </p>
                    <p className="text-sm whitespace-pre-wrap leading-relaxed text-foreground/90">
                      {item.answer.answer_text}
                    </p>
                  </div>
                  <ReviewDisplay
                    scores={item.answer.scores}
                    overall={item.answer.overall}
                    corrected_text={item.answer.corrected_text}
                    suggestions={item.answer.suggestions}
                  />
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
