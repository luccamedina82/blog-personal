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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Trash2, ChevronDown, Copy, Check, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  clearEvaluatorHistory,
  deleteRecentEvaluatorRuns,
  keepRecentEvaluatorRuns,
  countEvaluatorRuns,
} from '@/lib/english/queries'
import type { EvaluatorRun } from '@/lib/english/types'

interface HistoryChartProps {
  runs: EvaluatorRun[]
  onClear: () => void
}

export function HistoryChart({ runs, onClear }: HistoryChartProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  // ── Clear dialog ──────────────────────────────────────────────────────────
  type ClearMode = 'delete-recent' | 'keep-recent' | 'delete-all'
  const [clearOpen, setClearOpen] = useState(false)
  const [clearMode, setClearMode] = useState<ClearMode>('delete-all')
  const [clearN, setClearN] = useState(10)
  const [totalCount, setTotalCount] = useState<number | null>(null)
  const [clearing, setClearing] = useState(false)

  async function openClearDialog() {
    setClearMode('delete-all')
    setClearN(10)
    setClearOpen(true)
    const count = await countEvaluatorRuns()
    setTotalCount(count)
  }

  function deleteCount(): number {
    const total = totalCount ?? 0
    if (clearMode === 'delete-all') return total
    if (clearMode === 'delete-recent') return Math.min(Math.max(clearN, 0), total)
    if (clearMode === 'keep-recent') return Math.max(0, total - Math.max(clearN, 0))
    return 0
  }

  function isNInvalid(): boolean {
    if (clearMode === 'delete-all') return false
    if (clearN < 1) return true
    if (clearMode === 'delete-recent' && clearN > (totalCount ?? 0)) return true
    if (clearMode === 'keep-recent' && clearN >= (totalCount ?? 0)) return true
    return false
  }

  async function handleConfirmClear() {
    setClearing(true)
    try {
      if (clearMode === 'delete-all') await clearEvaluatorHistory()
      else if (clearMode === 'delete-recent') await deleteRecentEvaluatorRuns(clearN)
      else await keepRecentEvaluatorRuns(clearN)
      setClearOpen(false)
      onClear()
    } finally {
      setClearing(false)
    }
  }

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
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground hover:text-destructive h-8 text-xs gap-1.5"
          onClick={openClearDialog}
        >
          <Trash2 className="size-3" />
          Clear history
        </Button>

        <Dialog open={clearOpen} onOpenChange={setClearOpen}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Clear evaluator history</DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-1">
              {/* Mode selector */}
              <div className="space-y-2">
                {(
                  [
                    { id: 'delete-all', label: 'Eliminar todos los registros' },
                    { id: 'delete-recent', label: 'Eliminar los últimos N registros' },
                    { id: 'keep-recent', label: 'Conservar solo los últimos N' },
                  ] satisfies { id: ClearMode; label: string }[]
                ).map((m) => (
                  <label
                    key={m.id}
                    className="flex items-center gap-3 rounded-md border border-border/60 px-3 py-2.5 cursor-pointer hover:bg-secondary/40 transition-colors"
                  >
                    <input
                      type="radio"
                      name="clear-mode"
                      value={m.id}
                      checked={clearMode === m.id}
                      onChange={() => setClearMode(m.id)}
                      className="accent-primary"
                    />
                    <span className="text-sm">{m.label}</span>
                  </label>
                ))}
              </div>

              {/* N input */}
              {clearMode !== 'delete-all' && (
                <div className="space-y-1.5">
                  <label className="text-[11px] text-muted-foreground uppercase tracking-wide">
                    Cantidad de registros (N)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={totalCount ?? undefined}
                    value={clearN}
                    onChange={(e) => setClearN(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full rounded-md border border-border/70 bg-background/60 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary/40 transition-colors"
                  />
                  {isNInvalid() && totalCount !== null && (
                    <p className="text-[11px] text-destructive">
                      {clearMode === 'delete-recent'
                        ? `Solo hay ${totalCount} registro${totalCount !== 1 ? 's' : ''}. N debe ser ≤ ${totalCount}.`
                        : `N debe ser menor que ${totalCount} para eliminar algo.`}
                    </p>
                  )}
                </div>
              )}

              {/* Preview */}
              <div className={cn(
                'rounded-md px-3 py-2.5 text-sm',
                deleteCount() > 0
                  ? 'bg-destructive/8 border border-destructive/20 text-destructive'
                  : 'bg-secondary/40 border border-border/50 text-muted-foreground',
              )}>
                {totalCount === null ? (
                  <span className="flex items-center gap-2"><Loader2 className="size-3 animate-spin" />Calculando…</span>
                ) : deleteCount() === 0 ? (
                  'No hay registros para eliminar.'
                ) : (
                  <>
                    Se eliminarán{' '}
                    <strong>{deleteCount()}</strong>{' '}
                    registro{deleteCount() !== 1 ? 's' : ''} de{' '}
                    <strong>{totalCount}</strong>.
                    {' '}Esta acción no se puede deshacer.
                  </>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" size="sm" onClick={() => setClearOpen(false)} disabled={clearing}>
                Cancelar
              </Button>
              <Button
                variant="destructive"
                size="sm"
                disabled={clearing || totalCount === null || deleteCount() === 0 || isNInvalid()}
                onClick={handleConfirmClear}
              >
                {clearing && <Loader2 className="size-3 animate-spin" />}
                Eliminar {deleteCount() > 0 ? deleteCount() : ''} registro{deleteCount() !== 1 ? 's' : ''}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
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
