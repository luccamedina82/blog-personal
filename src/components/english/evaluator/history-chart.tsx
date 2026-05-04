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
import { Trash2 } from 'lucide-react'
import type { EvaluatorRun } from '@/lib/english/types'

interface HistoryChartProps {
  runs: EvaluatorRun[]
  onClear: () => void
}

export function HistoryChart({ runs, onClear }: HistoryChartProps) {
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
        <div className="grid grid-cols-[1fr_80px_80px] text-[10px] uppercase tracking-[0.18em] text-muted-foreground bg-background/40 border-b border-border/70">
          <div className="px-4 py-2.5">Date</div>
          <div className="px-4 py-2.5">Source</div>
          <div className="px-4 py-2.5 text-right">Overall</div>
        </div>
        <ul className="divide-y divide-border/70">
          {runs.slice(0, 10).map((run) => {
            const overall = Math.round(run.scores.reduce((a, s) => a + s.value, 0) / run.scores.length)
            return (
              <li key={run.id} className="grid grid-cols-[1fr_80px_80px] text-[13px] hover:bg-card/60 transition-colors">
                <div className="px-4 py-3 text-muted-foreground tabular-nums">
                  {new Date(run.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })}
                </div>
                <div className="px-4 py-3 text-muted-foreground capitalize">{run.source}</div>
                <div className="px-4 py-3 text-right font-mono text-foreground">{overall}</div>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}
