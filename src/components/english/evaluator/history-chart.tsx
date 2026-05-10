import { useState } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Trash2, ChevronDown, Copy, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { EvaluatorRun } from '@/lib/english/types'

interface HistoryChartProps {
  runs: EvaluatorRun[]
  onClear: () => void
}

export function HistoryChart({ runs, onClear }: HistoryChartProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  function handleCopy(run: EvaluatorRun) {
    if (!run.corrected_text) return
    navigator.clipboard.writeText(run.corrected_text)
    setCopiedId(run.id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const chartData = [...runs]
    .reverse()
    .slice(-20)
    .map((run) => ({
      date: new Date(run.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      overall: Math.round(run.scores.reduce((a, s) => a + s.value, 0) / run.scores.length),
    }))

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-1">History</p>
          <h3 className="text-base font-medium tracking-tight">Progress over time</h3>
        </div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive h-8 text-xs gap-1.5">
              <Trash2 className="size-3" />
              Clear history
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Clear all evaluator history?</AlertDialogTitle>
              <AlertDialogDescription>
                This deletes all {runs.length} saved runs permanently. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={onClear} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Delete all
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {runs.length >= 2 ? (
        <div className="rounded-lg border border-border/70 bg-card/40 p-5">
          <div className="h-[180px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                <CartesianGrid stroke="var(--border)" strokeDasharray="2 3" vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  domain={[40, 100]}
                  tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    background: 'var(--card)',
                    border: '1px solid var(--border)',
                    borderRadius: '6px',
                    fontSize: '12px',
                    color: 'var(--foreground)',
                  }}
                  labelStyle={{ color: 'var(--muted-foreground)', marginBottom: 4 }}
                  formatter={(val: number) => [val, 'Overall']}
                />
                <Line
                  dataKey="overall"
                  stroke="var(--primary)"
                  strokeWidth={1.5}
                  dot={{ fill: 'var(--primary)', r: 3, strokeWidth: 0 }}
                  activeDot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Run 2+ analyses to see your progress chart.</p>
      )}

      {/* Recent runs table */}
      <div className="rounded-lg border border-border/70 overflow-hidden bg-card/40">
        <div className="grid grid-cols-[1fr_80px_60px_32px] text-[10px] uppercase tracking-[0.18em] text-muted-foreground bg-background/40 border-b border-border/70">
          <div className="px-4 py-2.5">Date</div>
          <div className="px-4 py-2.5">Source</div>
          <div className="px-4 py-2.5 text-right">Overall</div>
          <div />
        </div>
        <ul className="divide-y divide-border/70">
          {runs.slice(0, 10).map((run) => {
            const overall = Math.round(run.scores.reduce((a, s) => a + s.value, 0) / run.scores.length)
            const expanded = expandedId === run.id
            const hasDetail = (run.suggestions?.length > 0) || !!run.corrected_text

            return (
              <li key={run.id} className="divide-y divide-border/70">
                <button
                  type="button"
                  onClick={() => hasDetail && setExpandedId(expanded ? null : run.id)}
                  className={cn(
                    'w-full grid grid-cols-[1fr_80px_60px_32px] text-[13px] transition-colors text-left',
                    hasDetail ? 'hover:bg-card/60 cursor-pointer' : 'cursor-default',
                    expanded && 'bg-card/60',
                  )}
                >
                  <div className="px-4 py-3 text-muted-foreground tabular-nums">
                    {new Date(run.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })}
                  </div>
                  <div className="px-4 py-3 text-muted-foreground capitalize">{run.source}</div>
                  <div className="px-4 py-3 text-right font-mono text-foreground">{overall}</div>
                  <div className="flex items-center justify-center">
                    {hasDetail && (
                      <ChevronDown className={cn('size-3.5 text-muted-foreground/60 transition-transform', expanded && 'rotate-180')} />
                    )}
                  </div>
                </button>

                {expanded && (
                  <div className="px-4 py-4 space-y-4 bg-background/30">
                    {run.suggestions?.length > 0 && (
                      <div>
                        <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-2">Suggestions</p>
                        <ul className="space-y-1.5">
                          {run.suggestions.map((s, i) => (
                            <li key={i} className="flex gap-2.5 text-[13px] text-muted-foreground leading-relaxed">
                              <span className="text-primary/60 font-mono text-[11px] mt-0.5 shrink-0">{i + 1}.</span>
                              {s}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {run.corrected_text && (
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Corrected version</p>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 px-2 text-[11px] text-muted-foreground gap-1.5"
                            onClick={(e) => { e.stopPropagation(); handleCopy(run) }}
                          >
                            {copiedId === run.id
                              ? <><Check className="size-3 text-green-500" />Copied</>
                              : <><Copy className="size-3" />Copy</>
                            }
                          </Button>
                        </div>
                        <p className="text-[13px] text-foreground/85 leading-relaxed whitespace-pre-wrap bg-secondary/30 rounded-md px-3 py-2.5">
                          {run.corrected_text}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}
