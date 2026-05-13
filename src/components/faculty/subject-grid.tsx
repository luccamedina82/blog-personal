import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { Plus, Pencil, Trash2, ChevronRight } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { deleteFacultySubject } from '@/lib/faculty/queries'
import type { TopicProgress } from '@/lib/faculty/queries'
import type { FacultySubject, FacultySubjectStatus } from '@/lib/faculty/types'

const STATUS_FILTERS: Array<{ value: FacultySubjectStatus | 'all'; label: string }> = [
  { value: 'all', label: 'Todas' },
  { value: 'cursando', label: 'Cursando' },
  { value: 'final-pendiente', label: 'Final pendiente' },
  { value: 'aprobada', label: 'Aprobada' },
  { value: 'recursar', label: 'Recursar' },
]

const STATUS_BADGE: Record<FacultySubjectStatus, string> = {
  cursando: 'bg-blue-500/10 text-blue-600 border-blue-200 dark:border-blue-800',
  'final-pendiente': 'bg-orange-500/10 text-orange-600 border-orange-200 dark:border-orange-800',
  aprobada: 'bg-green-500/10 text-green-600 border-green-200 dark:border-green-800',
  recursar: 'bg-red-500/10 text-red-600 border-red-200 dark:border-red-800',
}

const STATUS_LABEL: Record<FacultySubjectStatus, string> = {
  cursando: 'Cursando',
  'final-pendiente': 'Final pend.',
  aprobada: 'Aprobada',
  recursar: 'Recursar',
}

type Props = {
  subjects: FacultySubject[]
  topicsProgress?: Record<string, TopicProgress>
  onNew: () => void
  onEdit: (s: FacultySubject) => void
  onDeleted: (id: string) => void
}

export function SubjectGrid({ subjects, topicsProgress, onNew, onEdit, onDeleted }: Props) {
  const [filter, setFilter] = useState<FacultySubjectStatus | 'all'>('all')

  const visible = filter === 'all' ? subjects : subjects.filter((s) => s.status === filter)

  async function handleDelete(s: FacultySubject) {
    try {
      await deleteFacultySubject(s.id)
      onDeleted(s.id)
      toast.success(`"${s.name}" eliminada`)
    } catch {
      toast.error('Error al eliminar')
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-1 flex-wrap">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setFilter(f.value)}
              className={cn(
                'h-7 px-3 rounded-full text-xs transition-colors',
                filter === f.value
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground bg-secondary/50 hover:bg-secondary',
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
        <Button size="sm" className="gap-1.5 shrink-0" onClick={onNew}>
          <Plus className="size-3.5" />
          Nueva materia
        </Button>
      </div>

      {visible.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center rounded-lg border border-dashed border-border">
          <p className="text-sm text-muted-foreground">
            {filter === 'all' ? 'Sin materias todavía.' : `Sin materias con estado "${STATUS_LABEL[filter]}".`}
          </p>
          {filter === 'all' && (
            <Button size="sm" variant="outline" className="mt-3" onClick={onNew}>
              Crear primera materia
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {visible.map((s) => {
            const prog = topicsProgress?.[s.id]
            const pct = prog && prog.total > 0 ? Math.round((prog.dominado / prog.total) * 100) : null
            return (
            <div
              key={s.id}
              className={cn(
                'group relative flex flex-col rounded-xl border border-border/60',
                'bg-card/40 hover:bg-card/80 transition-all duration-200 overflow-hidden',
                'hover:border-border hover:shadow-lg hover:shadow-black/20 hover:-translate-y-0.5',
              )}
            >
              {/* Color band — full height left strip */}
              {s.color && (
                <span
                  className="absolute left-0 top-0 bottom-0 w-1"
                  style={{ backgroundColor: s.color }}
                  aria-hidden
                />
              )}

              {/* Subtle gradient glow on hover */}
              {s.color && (
                <span
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                  style={{
                    background: `radial-gradient(circle at top left, ${s.color}10, transparent 60%)`,
                  }}
                  aria-hidden
                />
              )}

              {/* Clickable overlay → subject detail */}
              <Link
                to="/faculty/$subjectId"
                params={{ subjectId: s.id }}
                search={{ note: undefined }}
                className="absolute inset-0 rounded-xl"
                aria-label={s.name}
              />

              <div className="relative p-5 pl-6 flex flex-col gap-3 flex-1 pointer-events-none">
                <div className="flex items-start justify-between">
                  <Badge
                    variant="outline"
                    className={cn('text-[10px] uppercase tracking-wide font-medium', STATUS_BADGE[s.status])}
                  >
                    {STATUS_LABEL[s.status]}
                  </Badge>
                  <ChevronRight className="size-4 text-muted-foreground/30 group-hover:text-foreground group-hover:translate-x-0.5 transition-all" />
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-base font-semibold text-foreground leading-snug tracking-tight line-clamp-2">{s.name}</p>
                  <p className="mt-1.5 text-[11px] text-muted-foreground tabular-nums">
                    {[s.code, s.semester].filter(Boolean).join(' · ') || '—'}
                  </p>
                  {s.professor && (
                    <p className="mt-0.5 text-[11px] text-muted-foreground/70 truncate">{s.professor}</p>
                  )}
                </div>

                {pct !== null && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground/80">
                      <span className="uppercase tracking-wider">Temario</span>
                      <span className="tabular-nums font-medium text-foreground/80">{pct}%</span>
                    </div>
                    <div className="h-1 rounded-full bg-secondary/80 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${pct}%`,
                          backgroundColor: s.color ?? undefined,
                        }}
                      />
                    </div>
                    <p className="text-[10px] text-muted-foreground/60 tabular-nums">
                      {prog!.dominado}/{prog!.total} temas dominados
                    </p>
                  </div>
                )}

                <div
                  className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity relative pointer-events-auto"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    onClick={() => onEdit(s)}
                    className="flex items-center justify-center size-6 rounded text-muted-foreground/50 hover:text-foreground hover:bg-secondary transition-colors"
                  >
                    <Pencil className="size-3" />
                  </button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <button
                        type="button"
                        className="flex items-center justify-center size-6 rounded text-muted-foreground/50 hover:text-destructive hover:bg-secondary transition-colors"
                      >
                        <Trash2 className="size-3" />
                      </button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>¿Eliminar "{s.name}"?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Se eliminan todas las notas y deadlines de esta materia. No se puede deshacer.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDelete(s)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Eliminar
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
