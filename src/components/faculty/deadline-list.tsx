import { useState, useRef, useCallback } from 'react'
import { Plus, Pencil, Trash2, CheckSquare, Square, FileText, Star, CalendarClock, AlertCircle, Clock, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { CountdownBadge } from './countdown-badge'
import { DeadlineForm } from './deadline-form'
import {
  updateFacultyDeadline, deleteFacultyDeadline, setDeadlineGrade,
} from '@/lib/faculty/queries'
import type { FacultyDeadline, FacultyDeadlineKind } from '@/lib/faculty/types'

const KIND_LABEL: Record<FacultyDeadlineKind, string> = {
  tp: 'TP',
  parcial: 'Parcial',
  final: 'Final',
  recuperatorio: 'Recup.',
  entrega: 'Entrega',
}

const KIND_BADGE: Record<FacultyDeadlineKind, string> = {
  tp: 'bg-orange-500/10 text-orange-600 border-orange-200 dark:border-orange-800',
  parcial: 'bg-red-500/10 text-red-600 border-red-200 dark:border-red-800',
  final: 'bg-rose-500/10 text-rose-700 border-rose-200 dark:border-rose-800',
  recuperatorio: 'bg-yellow-500/10 text-yellow-700 border-yellow-200 dark:border-yellow-800',
  entrega: 'bg-blue-500/10 text-blue-600 border-blue-200 dark:border-blue-800',
}

type GroupTone = 'destructive' | 'orange' | 'yellow' | 'muted' | 'green'
type Group = { label: string; items: FacultyDeadline[]; tone: GroupTone; icon: React.ElementType }

const GROUP_STYLE: Record<GroupTone, { dot: string; text: string; border: string; bg: string }> = {
  destructive: { dot: 'bg-destructive', text: 'text-destructive', border: 'border-destructive/30', bg: 'bg-destructive/[0.04]' },
  orange:      { dot: 'bg-orange-500', text: 'text-orange-500', border: 'border-orange-500/30', bg: 'bg-orange-500/[0.04]' },
  yellow:      { dot: 'bg-yellow-500', text: 'text-yellow-600', border: 'border-yellow-500/30', bg: 'bg-yellow-500/[0.04]' },
  muted:       { dot: 'bg-muted-foreground/40', text: 'text-muted-foreground', border: 'border-border/60', bg: 'bg-card/20' },
  green:       { dot: 'bg-green-500', text: 'text-green-600', border: 'border-green-500/20', bg: 'bg-green-500/[0.03]' },
}

function groupDeadlines(deadlines: FacultyDeadline[]): Group[] {
  const now = new Date()
  now.setHours(0, 0, 0, 0)

  const vencido: FacultyDeadline[] = []
  const hoy: FacultyDeadline[] = []
  const semana: FacultyDeadline[] = []
  const mes: FacultyDeadline[] = []
  const despues: FacultyDeadline[] = []
  const hechos: FacultyDeadline[] = []

  for (const d of deadlines) {
    if (d.done) { hechos.push(d); continue }
    const due = new Date(d.due_at)
    due.setHours(0, 0, 0, 0)
    const diff = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    if (diff < 0) vencido.push(d)
    else if (diff === 0) hoy.push(d)
    else if (diff <= 7) semana.push(d)
    else if (diff <= 30) mes.push(d)
    else despues.push(d)
  }

  const groups: Group[] = []
  if (vencido.length) groups.push({ label: 'Vencido', items: vencido, tone: 'destructive', icon: AlertCircle })
  if (hoy.length) groups.push({ label: 'Hoy', items: hoy, tone: 'orange', icon: Clock })
  if (semana.length) groups.push({ label: 'Esta semana', items: semana, tone: 'yellow', icon: CalendarClock })
  if (mes.length) groups.push({ label: 'Este mes', items: mes, tone: 'muted', icon: CalendarClock })
  if (despues.length) groups.push({ label: 'Después', items: despues, tone: 'muted', icon: CalendarClock })
  if (hechos.length) groups.push({ label: 'Completados', items: hechos, tone: 'green', icon: CheckCircle2 })
  return groups
}

function gradeColor(g: number) {
  if (g >= 7) return 'text-green-500'
  if (g >= 4) return 'text-yellow-500'
  return 'text-red-500'
}

type Props = {
  deadlines: FacultyDeadline[]
  subjectId: string
  onCreated: (d: FacultyDeadline) => void
  onUpdated: (d: FacultyDeadline) => void
  onDeleted: (id: string) => void
  onViewNote?: (noteId: string) => void
  onCreateNote?: (d: FacultyDeadline) => Promise<void>
}

function GradeInput({ deadline, onUpdated }: { deadline: FacultyDeadline; onUpdated: (d: FacultyDeadline) => void }) {
  const [value, setValue] = useState(deadline.grade != null ? String(deadline.grade) : '')
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const save = useCallback(
    (v: string) => {
      const parsed = v === '' ? null : parseFloat(v)
      if (parsed === deadline.grade) return
      setDeadlineGrade(deadline.id, parsed)
        .then(() => onUpdated({ ...deadline, grade: parsed }))
        .catch(() => toast.error('Error al guardar nota'))
    },
    [deadline, onUpdated],
  )

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value
    setValue(v)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => save(v), 700)
  }

  return (
    <div className="flex items-center gap-1.5 mt-1.5">
      <Star className="size-3 text-yellow-500 shrink-0" />
      <input
        type="number"
        step="0.25"
        min={0}
        max={10}
        value={value}
        onChange={handleChange}
        placeholder="Nota (0–10)"
        className={cn(
          'h-6 w-28 rounded border border-border/60 bg-card/40 px-2 text-xs outline-none focus:border-primary/40 transition-colors',
          deadline.grade != null && gradeColor(deadline.grade),
        )}
      />
    </div>
  )
}

export function DeadlineList({
  deadlines,
  subjectId,
  onCreated,
  onUpdated,
  onDeleted,
  onViewNote,
  onCreateNote,
}: Props) {
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<FacultyDeadline | null>(null)
  const [toggling, setToggling] = useState<string | null>(null)
  const [creatingNote, setCreatingNote] = useState<string | null>(null)

  const groups = groupDeadlines(deadlines)

  function openCreate() { setEditing(null); setFormOpen(true) }
  function openEdit(d: FacultyDeadline) { setEditing(d); setFormOpen(true) }

  async function toggleDone(d: FacultyDeadline) {
    setToggling(d.id)
    try {
      await updateFacultyDeadline(d.id, { done: !d.done })
      onUpdated({ ...d, done: !d.done })
    } catch {
      toast.error('Error al actualizar')
    } finally {
      setToggling(null)
    }
  }

  async function handleDelete(d: FacultyDeadline) {
    try {
      await deleteFacultyDeadline(d.id)
      onDeleted(d.id)
      toast.success(`"${d.title}" eliminado`)
    } catch {
      toast.error('Error al eliminar')
    }
  }

  async function handleCreateNote(d: FacultyDeadline) {
    setCreatingNote(d.id)
    try {
      await onCreateNote?.(d)
    } finally {
      setCreatingNote(null)
    }
  }

  const isPastDue = (d: FacultyDeadline) => new Date(d.due_at) < new Date()

  const totalDone = deadlines.filter((d) => d.done).length
  const totalPending = deadlines.filter((d) => !d.done).length
  const overallPct = deadlines.length > 0 ? Math.round((totalDone / deadlines.length) * 100) : 0

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="space-y-1.5 min-w-0">
          <p className="text-sm font-medium text-foreground">
            Deadlines
            <span className="ml-2 text-[11px] text-muted-foreground tabular-nums">
              {totalPending} pend. · {totalDone} hechos
            </span>
          </p>
          {deadlines.length > 0 && (
            <div className="flex items-center gap-2">
              <div className="h-1 w-40 rounded-full bg-secondary overflow-hidden">
                <div
                  className="h-full rounded-full bg-green-500 transition-all duration-500"
                  style={{ width: `${overallPct}%` }}
                />
              </div>
              <span className="text-[10px] text-muted-foreground tabular-nums">{overallPct}%</span>
            </div>
          )}
        </div>
        <Button size="sm" className="gap-1.5 shrink-0" onClick={openCreate}>
          <Plus className="size-3.5" />
          Nuevo deadline
        </Button>
      </div>

      {groups.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center rounded-xl border border-dashed border-border/70">
          <CalendarClock className="size-8 text-muted-foreground/30 mb-3" />
          <p className="text-sm text-muted-foreground">Sin deadlines todavía.</p>
          <Button size="sm" variant="outline" className="mt-4" onClick={openCreate}>
            Crear primer deadline
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          {groups.map((group) => {
            const gStyle = GROUP_STYLE[group.tone]
            const GIcon = group.icon
            return (
            <div key={group.label}>
              <div className={cn('flex items-center gap-2 mb-2.5 pb-1.5 border-b', gStyle.border)}>
                <GIcon className={cn('size-3.5', gStyle.text)} />
                <p className={cn('text-[10px] uppercase tracking-[0.18em] font-semibold', gStyle.text)}>
                  {group.label}
                </p>
                <span className="ml-1 text-[10px] text-muted-foreground/60 tabular-nums">
                  {group.items.length}
                </span>
              </div>
              <ul className="space-y-1.5">
                {group.items.map((d) => (
                  <li
                    key={d.id}
                    className={cn(
                      'group relative flex items-start gap-3 rounded-lg border border-border/60 bg-card/30 p-3 transition-all overflow-hidden',
                      'hover:border-border hover:bg-card/60',
                      d.done && 'opacity-60',
                    )}
                  >
                    <span className={cn('absolute left-0 top-0 bottom-0 w-0.5', gStyle.dot)} aria-hidden />
                    {/* Toggle done */}
                    <button
                      type="button"
                      onClick={() => toggleDone(d)}
                      disabled={toggling === d.id}
                      className="mt-0.5 shrink-0 text-muted-foreground hover:text-primary transition-colors disabled:opacity-50"
                      aria-label={d.done ? 'Marcar pendiente' : 'Marcar hecho'}
                    >
                      {d.done
                        ? <CheckSquare className="size-4 text-green-600" />
                        : <Square className="size-4" />}
                    </button>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={cn('text-sm font-medium truncate', d.done && 'line-through')}>
                          {d.title}
                        </span>
                        <Badge
                          variant="outline"
                          className={cn('text-[9px] uppercase tracking-wide shrink-0', KIND_BADGE[d.kind])}
                        >
                          {KIND_LABEL[d.kind]}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 mt-1 flex-wrap">
                        <span className="text-[11px] text-muted-foreground/70 tabular-nums">
                          {new Date(d.due_at).toLocaleString('es-AR', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                        <CountdownBadge dueAt={d.due_at} done={d.done} />
                      </div>
                      {d.note && (
                        <p className="mt-1 text-[11px] text-muted-foreground leading-relaxed line-clamp-2">
                          {d.note}
                        </p>
                      )}

                      {/* Grade — si done o si ya venció */}
                      {(d.done || isPastDue(d)) && (
                        <GradeInput deadline={d} onUpdated={onUpdated} />
                      )}

                      {/* Nota vinculada */}
                      {d.note_id ? (
                        <button
                          type="button"
                          onClick={() => onViewNote?.(d.note_id!)}
                          className="mt-2 flex items-center gap-1.5 h-6 px-2 rounded text-[11px] text-primary/80 hover:text-primary bg-primary/5 hover:bg-primary/10 border border-primary/20 transition-colors"
                        >
                          <FileText className="size-3" />
                          Ver apuntes
                        </button>
                      ) : onCreateNote ? (
                        <button
                          type="button"
                          onClick={() => handleCreateNote(d)}
                          disabled={creatingNote === d.id}
                          className="mt-2 flex items-center gap-1.5 h-6 px-2 rounded text-[11px] text-muted-foreground hover:text-foreground bg-secondary/50 hover:bg-secondary border border-border/60 transition-colors disabled:opacity-50"
                        >
                          <FileText className="size-3" />
                          {creatingNote === d.id ? 'Creando…' : 'Cargar apuntes'}
                        </button>
                      ) : null}
                    </div>

                    {/* Edit / Delete */}
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <button
                        type="button"
                        onClick={() => openEdit(d)}
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
                            <AlertDialogTitle>¿Eliminar "{d.title}"?</AlertDialogTitle>
                            <AlertDialogDescription>No se puede deshacer.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(d)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Eliminar
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
            )
          })}
        </div>
      )}

      <DeadlineForm
        open={formOpen}
        onOpenChange={(v) => {
          setFormOpen(v)
          if (!v) setEditing(null)
        }}
        subjectId={subjectId}
        initial={editing}
        onCreated={onCreated}
        onUpdated={onUpdated}
      />
    </div>
  )
}
