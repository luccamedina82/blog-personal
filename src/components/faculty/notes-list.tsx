import { useState } from 'react'
import { Plus, Pencil, Trash2, CalendarDays, Clock, Star, FileText, Link2 } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { deleteFacultyNote } from '@/lib/faculty/queries'
import type { FacultyNote, FacultyNoteKind } from '@/lib/faculty/types'
import type { DevLabBlock } from '@/lib/devlab/types'

function readingTime(blocks: DevLabBlock[]): string {
  const words = blocks.reduce((acc, b) => {
    if (b.kind === 'text') return acc + b.html.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length
    if (b.kind === 'code') return acc + b.code.split('\n').length * 2
    return acc + 20
  }, 0)
  return `${Math.max(1, Math.round(words / 200))} min`
}

const KIND_FILTERS: Array<{ value: FacultyNoteKind | 'all'; label: string }> = [
  { value: 'all', label: 'Todas' },
  { value: 'clase', label: 'Clase' },
  { value: 'apunte', label: 'Apunte' },
  { value: 'resumen', label: 'Resumen' },
  { value: 'tp', label: 'TP' },
  { value: 'parcial', label: 'Parcial' },
  { value: 'final', label: 'Final' },
]

const KIND_BADGE: Record<FacultyNoteKind, string> = {
  clase: 'bg-blue-500/10 text-blue-600 border-blue-200 dark:border-blue-800',
  apunte: 'bg-violet-500/10 text-violet-600 border-violet-200 dark:border-violet-800',
  tp: 'bg-orange-500/10 text-orange-600 border-orange-200 dark:border-orange-800',
  parcial: 'bg-red-500/10 text-red-600 border-red-200 dark:border-red-800',
  final: 'bg-rose-500/10 text-rose-700 border-rose-200 dark:border-rose-800',
  resumen: 'bg-emerald-500/10 text-emerald-600 border-emerald-200 dark:border-emerald-800',
}

const KIND_ACCENT: Record<FacultyNoteKind, string> = {
  clase: 'bg-blue-500',
  apunte: 'bg-violet-500',
  tp: 'bg-orange-500',
  parcial: 'bg-red-500',
  final: 'bg-rose-500',
  resumen: 'bg-emerald-500',
}

type FilterValue = FacultyNoteKind | 'all' | 'vinculadas'

type Props = {
  notes: FacultyNote[]
  onNew: () => void
  onSelect: (note: FacultyNote) => void
  onEdit: (note: FacultyNote) => void
  onDeleted: (id: string) => void
  linkedToDeadlineIds?: Set<string>
}

export function NotesList({ notes, onNew, onSelect, onEdit, onDeleted, linkedToDeadlineIds }: Props) {
  const [filter, setFilter] = useState<FilterValue>('all')

  const visible =
    filter === 'all' ? notes
    : filter === 'vinculadas' ? notes.filter((n) => linkedToDeadlineIds?.has(n.id) ?? false)
    : notes.filter((n) => n.kind === filter)

  async function handleDelete(n: FacultyNote) {
    try {
      await deleteFacultyNote(n.id)
      onDeleted(n.id)
      toast.success(`"${n.title}" eliminada`)
    } catch {
      toast.error('Error al eliminar')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-1 flex-wrap">
          {KIND_FILTERS.map((f) => (
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
          {linkedToDeadlineIds && linkedToDeadlineIds.size > 0 && (
            <button
              type="button"
              onClick={() => setFilter('vinculadas')}
              className={cn(
                'h-7 px-3 rounded-full text-xs transition-colors',
                filter === 'vinculadas'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground bg-secondary/50 hover:bg-secondary',
              )}
            >
              Vinculadas
            </button>
          )}
        </div>
        <Button size="sm" className="gap-1.5 shrink-0" onClick={onNew}>
          <Plus className="size-3.5" />
          Nueva nota
        </Button>
      </div>

      {visible.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center rounded-xl border border-dashed border-border/70">
          <FileText className="size-8 text-muted-foreground/30 mb-3" />
          <p className="text-sm text-muted-foreground">
            {filter === 'all' ? 'Sin notas todavía.' : `Sin notas de tipo "${filter}".`}
          </p>
          {filter === 'all' && (
            <Button size="sm" variant="outline" className="mt-4" onClick={onNew}>
              Crear primera nota
            </Button>
          )}
        </div>
      ) : (
        <ul className="space-y-2">
          {visible.map((note) => {
            const isLinked = linkedToDeadlineIds?.has(note.id) ?? false
            return (
            <li key={note.id} className="group relative">
              <button
                type="button"
                onClick={() => onSelect(note)}
                className={cn(
                  'w-full flex items-stretch gap-3 rounded-lg border border-border/60 bg-card/30 text-left',
                  'hover:bg-card/70 hover:border-border transition-all overflow-hidden',
                )}
              >
                {/* Accent strip */}
                <span className={cn('w-1 shrink-0', KIND_ACCENT[note.kind])} aria-hidden />

                <div className="flex-1 min-w-0 px-4 py-3.5">
                  <div className="flex items-center gap-2 flex-wrap mb-1.5">
                    <Badge
                      variant="outline"
                      className={cn('text-[10px] uppercase tracking-wide font-medium', KIND_BADGE[note.kind])}
                    >
                      {note.kind}
                    </Badge>
                    {isLinked && (
                      <Badge
                        variant="outline"
                        className="text-[9px] uppercase tracking-wide font-medium bg-primary/5 text-primary/80 border-primary/20 gap-1"
                      >
                        <Link2 className="size-2.5" />
                        Vinculada
                      </Badge>
                    )}
                    {note.tags.slice(0, 3).map((t) => (
                      <Badge
                        key={t}
                        variant="secondary"
                        className="rounded-sm text-[9px] font-mono font-normal bg-secondary/40 border border-border/50 h-4 px-1.5"
                      >
                        {t}
                      </Badge>
                    ))}
                  </div>
                  <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors leading-snug">
                    {note.title}
                  </p>
                  <div className="mt-2 flex items-center gap-3 text-[11px] text-muted-foreground/70 flex-wrap">
                    {note.date && (
                      <span className="flex items-center gap-1">
                        <CalendarDays className="size-3" />
                        {new Date(note.date + 'T00:00:00').toLocaleDateString('es-AR', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <CalendarDays className="size-3" />
                      {new Date(note.created_at).toLocaleDateString('es-AR', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                    {note.blocks.length > 0 && (
                      <span className="flex items-center gap-1">
                        <Clock className="size-3" />
                        {readingTime(note.blocks)} read
                      </span>
                    )}
                    {note.grade != null && (
                      <span className={cn(
                        'flex items-center gap-1 font-medium tabular-nums',
                        note.grade >= 7 ? 'text-green-500' : note.grade >= 4 ? 'text-yellow-500' : 'text-red-500',
                      )}>
                        <Star className="size-3" />
                        {note.grade}
                      </span>
                    )}
                  </div>
                </div>
              </button>

              <div
                className="absolute top-2.5 right-2.5 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  onClick={() => onEdit(note)}
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
                      <AlertDialogTitle>¿Eliminar "{note.title}"?</AlertDialogTitle>
                      <AlertDialogDescription>No se puede deshacer.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => handleDelete(note)}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Eliminar
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
