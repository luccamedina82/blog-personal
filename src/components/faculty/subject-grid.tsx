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
          {visible.map((s) => (
            <div
              key={s.id}
              className={cn(
                'group relative flex flex-col gap-3 rounded-lg border border-border/70',
                'bg-card/40 hover:bg-card/80 p-5 transition-all duration-200',
                'hover:border-primary/30 hover:shadow-[0_0_0_1px_hsl(var(--primary)/0.15)]',
              )}
              style={s.color ? { borderLeftColor: s.color, borderLeftWidth: 3 } : undefined}
            >
              {/* Clickable overlay → subject detail */}
              <Link
                to="/faculty/$subjectId"
                params={{ subjectId: s.id }}
                className="absolute inset-0 rounded-lg"
                aria-label={s.name}
              />

              <div className="flex items-start justify-between relative z-10 pointer-events-none">
                <Badge
                  variant="outline"
                  className={cn('text-[10px] uppercase tracking-wide', STATUS_BADGE[s.status])}
                >
                  {STATUS_LABEL[s.status]}
                </Badge>
                <ChevronRight className="size-4 text-muted-foreground/40 group-hover:text-primary transition-colors" />
              </div>

              <div className="relative z-10 pointer-events-none flex-1">
                <p className="text-sm font-medium text-foreground">{s.name}</p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {[s.code, s.semester].filter(Boolean).join(' · ') || '—'}
                </p>
                {s.professor && (
                  <p className="mt-0.5 text-[11px] text-muted-foreground/70">{s.professor}</p>
                )}
                {topicsProgress?.[s.id] && topicsProgress[s.id].total > 0 && (
                  <div className="mt-2 space-y-1">
                    <div className="h-1 rounded-full bg-secondary overflow-hidden">
                      <div
                        className="h-1 rounded-full bg-green-500 transition-all duration-500"
                        style={{
                          width: `${Math.round((topicsProgress[s.id].dominado / topicsProgress[s.id].total) * 100)}%`,
                        }}
                      />
                    </div>
                    <p className="text-[10px] text-muted-foreground/60 tabular-nums">
                      {topicsProgress[s.id].dominado}/{topicsProgress[s.id].total} temas
                    </p>
                  </div>
                )}
              </div>

              <div
                className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity relative z-10"
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
          ))}
        </div>
      )}
    </div>
  )
}
