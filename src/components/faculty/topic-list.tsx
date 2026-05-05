import React, { useState } from 'react'
import { Plus, Trash2, ChevronUp, ChevronDown } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { createFacultyTopic, updateFacultyTopic, deleteFacultyTopic } from '@/lib/faculty/queries'
import type { FacultyTopic, FacultyTopicStatus } from '@/lib/faculty/types'

const STATUS_OPTIONS: Array<{ value: FacultyTopicStatus; label: string }> = [
  { value: 'pendiente', label: 'Pendiente' },
  { value: 'visto', label: 'Visto' },
  { value: 'dominado', label: 'Dominado' },
]

type Props = {
  subjectId: string
  topics: FacultyTopic[]
  onCreated: (t: FacultyTopic) => void
  onUpdated: (t: FacultyTopic) => void
  onDeleted: (id: string) => void
}

export function TopicList({ subjectId, topics, onCreated, onUpdated, onDeleted }: Props) {
  const [newTitle, setNewTitle] = useState('')
  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')

  const sorted = [...topics].sort((a, b) => a.order_index - b.order_index)

  const dominado = sorted.filter((t) => t.status === 'dominado').length
  const progress = sorted.length > 0 ? Math.round((dominado / sorted.length) * 100) : 0

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!newTitle.trim()) return
    setAdding(true)
    try {
      const nextIndex = sorted.length > 0 ? sorted[sorted.length - 1].order_index + 1 : 0
      const created = await createFacultyTopic({
        subject_id: subjectId,
        title: newTitle.trim(),
        order_index: nextIndex,
        status: 'pendiente',
      })
      onCreated(created)
      setNewTitle('')
    } catch {
      toast.error('Error al crear tema')
    } finally {
      setAdding(false)
    }
  }

  async function handleStatusChange(t: FacultyTopic, status: FacultyTopicStatus) {
    try {
      await updateFacultyTopic(t.id, { status })
      onUpdated({ ...t, status })
    } catch {
      toast.error('Error al actualizar')
    }
  }

  async function handleMove(index: number, dir: -1 | 1) {
    const a = sorted[index]
    const b = sorted[index + dir]
    if (!b) return
    try {
      await Promise.all([
        updateFacultyTopic(a.id, { order_index: b.order_index }),
        updateFacultyTopic(b.id, { order_index: a.order_index }),
      ])
      onUpdated({ ...a, order_index: b.order_index })
      onUpdated({ ...b, order_index: a.order_index })
    } catch {
      toast.error('Error al reordenar')
    }
  }

  async function handleRenameCommit(t: FacultyTopic) {
    const title = editTitle.trim()
    setEditingId(null)
    if (!title || title === t.title) return
    try {
      await updateFacultyTopic(t.id, { title })
      onUpdated({ ...t, title })
    } catch {
      toast.error('Error al renombrar')
    }
  }

  async function handleDelete(t: FacultyTopic) {
    try {
      await deleteFacultyTopic(t.id)
      onDeleted(t.id)
      toast.success(`"${t.title}" eliminado`)
    } catch {
      toast.error('Error al eliminar')
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-foreground">
          Temario
          <span className="ml-2 text-[11px] text-muted-foreground tabular-nums">
            ({sorted.length} temas)
          </span>
        </p>
      </div>

      {sorted.length > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span>Progreso</span>
            <span className="tabular-nums">
              {dominado}/{sorted.length} dominados ({progress}%)
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
            <div
              className="h-1.5 rounded-full bg-green-500 transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {sorted.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center rounded-lg border border-dashed border-border">
          <p className="text-sm text-muted-foreground">Sin temas todavía.</p>
          <p className="text-xs text-muted-foreground/60 mt-1">
            Agrega los temas del programa de la materia.
          </p>
        </div>
      ) : (
        <ul className="space-y-1">
          {sorted.map((t, i) => (
            <li
              key={t.id}
              className="group flex items-center gap-2 rounded-md border border-border/70 bg-card/40 px-3 py-2 transition-all"
            >
              {/* Reorder */}
              <div className="flex flex-col gap-0 shrink-0">
                <button
                  type="button"
                  onClick={() => handleMove(i, -1)}
                  disabled={i === 0}
                  className="text-muted-foreground/40 hover:text-muted-foreground transition-colors disabled:opacity-0 disabled:pointer-events-none"
                >
                  <ChevronUp className="size-3" />
                </button>
                <button
                  type="button"
                  onClick={() => handleMove(i, 1)}
                  disabled={i === sorted.length - 1}
                  className="text-muted-foreground/40 hover:text-muted-foreground transition-colors disabled:opacity-0 disabled:pointer-events-none"
                >
                  <ChevronDown className="size-3" />
                </button>
              </div>

              {/* Status dot */}
              <span
                className={cn(
                  'shrink-0 size-2 rounded-full',
                  t.status === 'dominado' && 'bg-green-500',
                  t.status === 'visto' && 'bg-blue-400',
                  t.status === 'pendiente' && 'bg-muted-foreground/25',
                )}
              />

              {/* Title — double-click to rename */}
              {editingId === t.id ? (
                <input
                  autoFocus
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  onBlur={() => handleRenameCommit(t)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleRenameCommit(t)
                    if (e.key === 'Escape') setEditingId(null)
                  }}
                  className="flex-1 min-w-0 bg-transparent text-sm outline-none border-b border-primary/40 py-0.5"
                />
              ) : (
                <span
                  className="flex-1 min-w-0 text-sm truncate cursor-text"
                  onDoubleClick={() => {
                    setEditingId(t.id)
                    setEditTitle(t.title)
                  }}
                >
                  {t.title}
                </span>
              )}

              {/* Status select */}
              <select
                value={t.status}
                onChange={(e) => handleStatusChange(t, e.target.value as FacultyTopicStatus)}
                className={cn(
                  'shrink-0 h-6 rounded border border-border/60 bg-card/40 px-1.5 text-[11px] outline-none focus:border-primary/40 transition-colors',
                  t.status === 'dominado' && 'text-green-600',
                  t.status === 'visto' && 'text-blue-500',
                  t.status === 'pendiente' && 'text-muted-foreground',
                )}
              >
                {STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>

              {/* Delete */}
              <div className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
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
                      <AlertDialogTitle>¿Eliminar "{t.title}"?</AlertDialogTitle>
                      <AlertDialogDescription>No se puede deshacer.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => handleDelete(t)}
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
      )}

      {/* Add new topic */}
      <form onSubmit={handleAdd} className="flex items-center gap-2">
        <input
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="Nuevo tema…"
          className="flex-1 h-8 rounded-md border border-border/60 bg-card/40 px-3 text-sm outline-none focus:border-primary/40 transition-colors placeholder:text-muted-foreground/40"
        />
        <Button
          type="submit"
          size="sm"
          variant="outline"
          disabled={adding || !newTitle.trim()}
          className="gap-1.5 shrink-0"
        >
          <Plus className="size-3.5" />
          Agregar
        </Button>
      </form>
    </div>
  )
}
