import { useState, useEffect } from 'react'
import { Star, TrendingUp, TrendingDown, Award } from 'lucide-react'
import { cn } from '@/lib/utils'
import { listDeadlineGrades, type DeadlineGradeEntry } from '@/lib/faculty/queries'
import type { FacultyDeadlineKind } from '@/lib/faculty/types'

const KIND_LABEL: Record<FacultyDeadlineKind, string> = {
  tp: 'TP',
  parcial: 'Parcial',
  final: 'Final',
  recuperatorio: 'Recup.',
  entrega: 'Entrega',
}

const KIND_BADGE: Record<FacultyDeadlineKind, string> = {
  tp: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
  parcial: 'bg-red-500/10 text-red-500 border-red-500/20',
  final: 'bg-rose-500/10 text-rose-500 border-rose-500/20',
  recuperatorio: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
  entrega: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
}

function gradeColor(g: number) {
  if (g >= 7) return 'text-green-500'
  if (g >= 4) return 'text-yellow-500'
  return 'text-red-500'
}

function gradeBar(g: number) {
  if (g >= 7) return 'bg-green-500'
  if (g >= 4) return 'bg-yellow-500'
  return 'bg-red-500'
}

type Props = { subjectId: string }

export function GradesTab({ subjectId }: Props) {
  const [graded, setGraded] = useState<DeadlineGradeEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    listDeadlineGrades(subjectId)
      .then(setGraded)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [subjectId])

  if (loading) {
    return (
      <div className="rounded-xl border border-dashed border-border/70 p-12 text-center">
        <p className="text-sm text-muted-foreground animate-pulse">Cargando…</p>
      </div>
    )
  }

  if (graded.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center rounded-xl border border-dashed border-border/70">
        <Star className="size-8 text-muted-foreground/30 mb-3" />
        <p className="text-sm text-muted-foreground">Sin calificaciones registradas.</p>
        <p className="text-xs text-muted-foreground/60 mt-1.5 max-w-xs">
          Marcá un deadline como hecho y asignale una nota para que aparezca aquí.
        </p>
      </div>
    )
  }

  const sum = graded.reduce((s, d) => s + d.grade, 0)
  const avg = Math.round((sum / graded.length) * 10) / 10
  const best = graded.reduce((b, d) => (d.grade > b.grade ? d : b))
  const worst = graded.reduce((b, d) => (d.grade < b.grade ? d : b))
  const approved = graded.filter((d) => d.grade >= 4).length
  const approvedPct = Math.round((approved / graded.length) * 100)

  return (
    <div className="space-y-6">
      {/* KPI grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard
          icon={<Star className="size-4" />}
          label="Promedio"
          value={String(avg)}
          sub={`/ 10 · ${graded.length} eval.`}
          tone={avg >= 7 ? 'green' : avg >= 4 ? 'yellow' : 'red'}
        />
        <KpiCard
          icon={<TrendingUp className="size-4" />}
          label="Mejor"
          value={String(best.grade)}
          sub={best.title}
          tone="green"
        />
        <KpiCard
          icon={<TrendingDown className="size-4" />}
          label="Peor"
          value={String(worst.grade)}
          sub={worst.title}
          tone={worst.grade >= 4 ? 'yellow' : 'red'}
        />
        <KpiCard
          icon={<Award className="size-4" />}
          label="Aprobadas"
          value={`${approved}/${graded.length}`}
          sub={`${approvedPct}%`}
          tone="blue"
        />
      </div>

      {/* Distribution bar */}
      <div className="rounded-xl border border-border/60 bg-card/30 p-4">
        <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground/80 font-medium mb-3">
          Distribución
        </p>
        <div className="space-y-2">
          {graded.map((d) => {
            const pct = (d.grade / 10) * 100
            return (
              <div key={d.id} className="flex items-center gap-3">
                <span className={cn(
                  'inline-flex items-center justify-center min-w-[58px] h-5 rounded px-1.5 text-[10px] font-medium border shrink-0',
                  KIND_BADGE[d.kind] ?? 'bg-secondary text-muted-foreground border-border/50',
                )}>
                  {KIND_LABEL[d.kind] ?? d.kind}
                </span>
                <span className="text-xs text-foreground/80 flex-1 min-w-0 truncate">{d.title}</span>
                <div className="flex items-center gap-2 shrink-0 w-44">
                  <div className="flex-1 h-1.5 rounded-full bg-secondary overflow-hidden">
                    <div
                      className={cn('h-full rounded-full transition-all duration-500', gradeBar(d.grade))}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className={cn('text-xs font-semibold tabular-nums w-7 text-right', gradeColor(d.grade))}>
                    {d.grade}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border/60 overflow-hidden bg-card/30">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/60 bg-secondary/30">
              <th className="px-4 py-2.5 text-left text-[10px] uppercase tracking-[0.14em] text-muted-foreground font-semibold w-28">
                Tipo
              </th>
              <th className="px-4 py-2.5 text-left text-[10px] uppercase tracking-[0.14em] text-muted-foreground font-semibold">
                Título
              </th>
              <th className="px-4 py-2.5 text-left text-[10px] uppercase tracking-[0.14em] text-muted-foreground font-semibold w-32">
                Fecha
              </th>
              <th className="px-4 py-2.5 text-right text-[10px] uppercase tracking-[0.14em] text-muted-foreground font-semibold w-20">
                Nota
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {graded.map((d) => (
              <tr key={d.id} className="hover:bg-secondary/20 transition-colors">
                <td className="px-4 py-2.5">
                  <span className={cn(
                    'inline-flex items-center justify-center min-w-[58px] h-5 rounded px-1.5 text-[10px] font-medium border',
                    KIND_BADGE[d.kind] ?? 'bg-secondary text-muted-foreground border-border/50',
                  )}>
                    {KIND_LABEL[d.kind] ?? d.kind}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-sm">{d.title}</td>
                <td className="px-4 py-2.5 text-xs text-muted-foreground tabular-nums">
                  {new Date(d.due_at).toLocaleDateString('es-AR', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </td>
                <td className={cn('px-4 py-2.5 text-right text-sm font-semibold tabular-nums', gradeColor(d.grade))}>
                  {d.grade}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

const KPI_TONE: Record<string, { hover: string; icon: string; value: string }> = {
  green: { hover: 'hover:ring-green-500/20', icon: 'bg-green-500/10 text-green-400', value: 'text-green-500' },
  yellow: { hover: 'hover:ring-yellow-500/20', icon: 'bg-yellow-500/10 text-yellow-400', value: 'text-yellow-500' },
  red: { hover: 'hover:ring-red-500/20', icon: 'bg-red-500/10 text-red-400', value: 'text-red-500' },
  blue: { hover: 'hover:ring-blue-500/20', icon: 'bg-blue-500/10 text-blue-400', value: 'text-foreground' },
}

function KpiCard({
  icon,
  label,
  value,
  sub,
  tone,
}: {
  icon: React.ReactNode
  label: string
  value: string
  sub?: string
  tone: 'green' | 'yellow' | 'red' | 'blue'
}) {
  const t = KPI_TONE[tone]
  return (
    <div className={cn(
      'rounded-xl border border-border/60 bg-card/40 p-4 ring-1 ring-transparent transition-all hover:bg-card/70',
      t.hover,
    )}>
      <div className="flex items-center gap-2 mb-2">
        <div className={cn('flex size-7 items-center justify-center rounded-md', t.icon)}>
          {icon}
        </div>
        <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground/80 font-medium">{label}</p>
      </div>
      <p className={cn('text-2xl font-semibold tabular-nums tracking-tight', t.value)}>{value}</p>
      {sub && <p className="text-[11px] text-muted-foreground/70 mt-0.5 truncate">{sub}</p>}
    </div>
  )
}
