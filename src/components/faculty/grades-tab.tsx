import { useState, useEffect } from 'react'
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
  tp: 'bg-orange-500/10 text-orange-600',
  parcial: 'bg-red-500/10 text-red-600',
  final: 'bg-rose-500/10 text-rose-700',
  recuperatorio: 'bg-yellow-500/10 text-yellow-700',
  entrega: 'bg-blue-500/10 text-blue-600',
}

function gradeColor(g: number) {
  if (g >= 7) return 'text-green-500'
  if (g >= 4) return 'text-yellow-500'
  return 'text-red-500'
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
    return <div className="rounded-md border border-dashed border-border p-8 text-center">
      <p className="text-sm text-muted-foreground animate-pulse">Cargando...</p>
    </div>
  }

  if (graded.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-border p-8 text-center">
        <p className="text-sm text-muted-foreground">Sin calificaciones registradas.</p>
        <p className="text-xs text-muted-foreground/60 mt-1">
          Marcá un deadline como hecho y asignale una nota para que aparezca aquí.
        </p>
      </div>
    )
  }

  const avg =
    Math.round((graded.reduce((sum, d) => sum + d.grade, 0) / graded.length) * 10) / 10

  return (
    <div className="space-y-5">
      <div className="flex items-baseline gap-2">
        <span className={`text-3xl font-semibold tabular-nums ${gradeColor(avg)}`}>{avg}</span>
        <span className="text-sm text-muted-foreground">
          / 10 · {graded.length} evaluación{graded.length !== 1 ? 'es' : ''}
        </span>
      </div>

      <div className="rounded-lg border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="px-4 py-2.5 text-left text-[11px] uppercase tracking-wider text-muted-foreground font-medium w-24">
                Tipo
              </th>
              <th className="px-4 py-2.5 text-left text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
                Título
              </th>
              <th className="px-4 py-2.5 text-left text-[11px] uppercase tracking-wider text-muted-foreground font-medium w-32">
                Fecha
              </th>
              <th className="px-4 py-2.5 text-right text-[11px] uppercase tracking-wider text-muted-foreground font-medium w-20">
                Nota
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {graded.map((d) => (
              <tr key={d.id} className="hover:bg-muted/20 transition-colors">
                <td className="px-4 py-2.5">
                  <span className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-medium ${KIND_BADGE[d.kind] ?? 'bg-secondary text-secondary-foreground'}`}>
                    {KIND_LABEL[d.kind] ?? d.kind}
                  </span>
                </td>
                <td className="px-4 py-2.5">{d.title}</td>
                <td className="px-4 py-2.5 text-xs text-muted-foreground tabular-nums">
                  {new Date(d.due_at).toLocaleDateString('es-AR', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </td>
                <td className={`px-4 py-2.5 text-right text-sm font-semibold tabular-nums ${gradeColor(d.grade)}`}>
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
