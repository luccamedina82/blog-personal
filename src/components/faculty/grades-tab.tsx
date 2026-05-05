import type { FacultyNote } from '@/lib/faculty/types'

const KIND_LABEL: Record<string, string> = { tp: 'TP', parcial: 'Parcial', final: 'Final' }

function gradeColor(g: number) {
  if (g >= 7) return 'text-green-500'
  if (g >= 4) return 'text-yellow-500'
  return 'text-red-500'
}

type Props = { notes: FacultyNote[] }

export function GradesTab({ notes }: Props) {
  const graded = notes
    .filter((n) => n.grade != null)
    .sort((a, b) => (b.date ?? b.created_at).localeCompare(a.date ?? a.created_at))

  if (graded.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-border p-8 text-center">
        <p className="text-sm text-muted-foreground">Sin calificaciones registradas.</p>
        <p className="text-xs text-muted-foreground/60 mt-1">
          Las notas tipo TP, Parcial o Final con nota asignada aparecen aquí.
        </p>
      </div>
    )
  }

  const avg =
    Math.round((graded.reduce((sum, n) => sum + n.grade!, 0) / graded.length) * 10) / 10

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
              <th className="px-4 py-2.5 text-left text-[11px] uppercase tracking-wider text-muted-foreground font-medium w-20">
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
            {graded.map((n) => (
              <tr key={n.id} className="hover:bg-muted/20 transition-colors">
                <td className="px-4 py-2.5">
                  <span className="inline-block rounded px-1.5 py-0.5 text-[10px] font-medium bg-secondary text-secondary-foreground">
                    {KIND_LABEL[n.kind] ?? n.kind}
                  </span>
                </td>
                <td className="px-4 py-2.5">{n.title}</td>
                <td className="px-4 py-2.5 text-xs text-muted-foreground tabular-nums">
                  {n.date
                    ? new Date(n.date + 'T00:00:00').toLocaleDateString('es-AR', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })
                    : '—'}
                </td>
                <td
                  className={`px-4 py-2.5 text-right text-sm font-semibold tabular-nums ${gradeColor(n.grade!)}`}
                >
                  {n.grade}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
