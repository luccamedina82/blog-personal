import { useState } from 'react'
import { Plus, Trash2, ChevronUp, ChevronDown, ChevronRight } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import {
  createFacultyTopic, updateFacultyTopic, deleteFacultyTopic,
  createFacultyTopicGroup, updateFacultyTopicGroup, deleteFacultyTopicGroup,
  createFacultyTopicUnit, updateFacultyTopicUnit, deleteFacultyTopicUnit,
} from '@/lib/faculty/queries'
import type { FacultyTopic, FacultyTopicStatus, FacultyTopicGroup, FacultyTopicUnit } from '@/lib/faculty/types'

const STATUS_OPTIONS: Array<{ value: FacultyTopicStatus; label: string }> = [
  { value: 'pendiente', label: 'Pendiente' },
  { value: 'visto', label: 'Visto' },
  { value: 'dominado', label: 'Dominado' },
]

type AddingIn =
  | { kind: 'group' }
  | { kind: 'unit'; groupId: string }
  | { kind: 'topic'; unitId: string | null }
  | null

type Editing =
  | { kind: 'group'; id: string }
  | { kind: 'unit'; id: string }
  | { kind: 'topic'; id: string }
  | null

type Props = {
  subjectId: string
  groups: FacultyTopicGroup[]
  units: FacultyTopicUnit[]
  topics: FacultyTopic[]
  onGroupCreated: (g: FacultyTopicGroup) => void
  onGroupUpdated: (g: FacultyTopicGroup) => void
  onGroupDeleted: (id: string) => void
  onUnitCreated: (u: FacultyTopicUnit) => void
  onUnitUpdated: (u: FacultyTopicUnit) => void
  onUnitDeleted: (id: string) => void
  onTopicCreated: (t: FacultyTopic) => void
  onTopicUpdated: (t: FacultyTopic) => void
  onTopicDeleted: (id: string) => void
}

function MiniProgress({ dominado, total }: { dominado: number; total: number }) {
  const pct = total > 0 ? Math.round((dominado / total) * 100) : 0
  return (
    <div className="flex items-center gap-1.5 shrink-0">
      <div className="w-12 h-1 rounded-full bg-secondary overflow-hidden">
        <div className="h-1 rounded-full bg-green-500 transition-all duration-500" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[10px] text-muted-foreground tabular-nums whitespace-nowrap">
        {dominado}/{total}
      </span>
    </div>
  )
}

export function TopicList({
  subjectId,
  groups,
  units,
  topics,
  onGroupCreated,
  onGroupUpdated,
  onGroupDeleted,
  onUnitCreated,
  onUnitUpdated,
  onUnitDeleted,
  onTopicCreated,
  onTopicUpdated,
  onTopicDeleted,
}: Props) {
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set())
  const [collapsedUnits, setCollapsedUnits] = useState<Set<string>>(new Set())
  const [addingIn, setAddingIn] = useState<AddingIn>(null)
  const [addTitle, setAddTitle] = useState('')
  const [editing, setEditing] = useState<Editing>(null)
  const [editTitle, setEditTitle] = useState('')

  const sortedGroups = [...groups].sort((a, b) => a.order_index - b.order_index)
  const unclassified = topics.filter((t) => !t.unit_id).sort((a, b) => a.order_index - b.order_index)
  const totalDominado = topics.filter((t) => t.status === 'dominado').length
  const overallProgress = topics.length > 0 ? Math.round((totalDominado / topics.length) * 100) : 0
  const showUnclassified = sortedGroups.length === 0 || unclassified.length > 0

  function startAdding(what: AddingIn) {
    setAddingIn(what)
    setAddTitle('')
  }

  async function submitAdd(e: React.FormEvent) {
    e.preventDefault()
    const title = addTitle.trim()
    if (!title || !addingIn) return
    try {
      if (addingIn.kind === 'group') {
        const nextIndex =
          sortedGroups.length > 0 ? sortedGroups[sortedGroups.length - 1].order_index + 1 : 0
        const created = await createFacultyTopicGroup({
          subject_id: subjectId,
          title,
          order_index: nextIndex,
        })
        onGroupCreated(created)
      } else if (addingIn.kind === 'unit') {
        const gUnits = units
          .filter((u) => u.group_id === addingIn.groupId)
          .sort((a, b) => a.order_index - b.order_index)
        const nextIndex = gUnits.length > 0 ? gUnits[gUnits.length - 1].order_index + 1 : 0
        const created = await createFacultyTopicUnit({
          subject_id: subjectId,
          group_id: addingIn.groupId,
          title,
          order_index: nextIndex,
        })
        onUnitCreated(created)
      } else if (addingIn.kind === 'topic') {
        const uTopics = topics
          .filter((t) => t.unit_id === addingIn.unitId)
          .sort((a, b) => a.order_index - b.order_index)
        const nextIndex = uTopics.length > 0 ? uTopics[uTopics.length - 1].order_index + 1 : 0
        const created = await createFacultyTopic({
          subject_id: subjectId,
          title,
          order_index: nextIndex,
          status: 'pendiente',
          unit_id: addingIn.unitId,
        })
        onTopicCreated(created)
      }
      setAddingIn(null)
      setAddTitle('')
    } catch {
      toast.error('Error al crear')
    }
  }

  async function commitEdit() {
    const title = editTitle.trim()
    if (!editing) return
    const snapshot = editing
    setEditing(null)
    if (!title) return
    try {
      if (snapshot.kind === 'group') {
        const g = groups.find((x) => x.id === snapshot.id)
        if (!g || g.title === title) return
        await updateFacultyTopicGroup(g.id, { title })
        onGroupUpdated({ ...g, title })
      } else if (snapshot.kind === 'unit') {
        const u = units.find((x) => x.id === snapshot.id)
        if (!u || u.title === title) return
        await updateFacultyTopicUnit(u.id, { title })
        onUnitUpdated({ ...u, title })
      } else {
        const t = topics.find((x) => x.id === snapshot.id)
        if (!t || t.title === title) return
        await updateFacultyTopic(t.id, { title })
        onTopicUpdated({ ...t, title })
      }
    } catch {
      toast.error('Error al renombrar')
    }
  }

  async function handleStatusChange(t: FacultyTopic, status: FacultyTopicStatus) {
    try {
      await updateFacultyTopic(t.id, { status })
      onTopicUpdated({ ...t, status })
    } catch {
      toast.error('Error al actualizar')
    }
  }

  async function moveGroup(list: FacultyTopicGroup[], idx: number, dir: -1 | 1) {
    const a = list[idx]
    const b = list[idx + dir]
    if (!b) return
    try {
      await Promise.all([
        updateFacultyTopicGroup(a.id, { order_index: b.order_index }),
        updateFacultyTopicGroup(b.id, { order_index: a.order_index }),
      ])
      onGroupUpdated({ ...a, order_index: b.order_index })
      onGroupUpdated({ ...b, order_index: a.order_index })
    } catch {
      toast.error('Error al reordenar')
    }
  }

  async function moveUnit(list: FacultyTopicUnit[], idx: number, dir: -1 | 1) {
    const a = list[idx]
    const b = list[idx + dir]
    if (!b) return
    try {
      await Promise.all([
        updateFacultyTopicUnit(a.id, { order_index: b.order_index }),
        updateFacultyTopicUnit(b.id, { order_index: a.order_index }),
      ])
      onUnitUpdated({ ...a, order_index: b.order_index })
      onUnitUpdated({ ...b, order_index: a.order_index })
    } catch {
      toast.error('Error al reordenar')
    }
  }

  async function moveTopic(list: FacultyTopic[], idx: number, dir: -1 | 1) {
    const a = list[idx]
    const b = list[idx + dir]
    if (!b) return
    try {
      await Promise.all([
        updateFacultyTopic(a.id, { order_index: b.order_index }),
        updateFacultyTopic(b.id, { order_index: a.order_index }),
      ])
      onTopicUpdated({ ...a, order_index: b.order_index })
      onTopicUpdated({ ...b, order_index: a.order_index })
    } catch {
      toast.error('Error al reordenar')
    }
  }

  async function handleDeleteGroup(g: FacultyTopicGroup) {
    try {
      await deleteFacultyTopicGroup(g.id)
      onGroupDeleted(g.id)
      toast.success(`"${g.title}" eliminado`)
    } catch {
      toast.error('Error al eliminar')
    }
  }

  async function handleDeleteUnit(u: FacultyTopicUnit) {
    try {
      await deleteFacultyTopicUnit(u.id)
      onUnitDeleted(u.id)
      toast.success(`"${u.title}" eliminado`)
    } catch {
      toast.error('Error al eliminar')
    }
  }

  async function handleDeleteTopic(t: FacultyTopic) {
    try {
      await deleteFacultyTopic(t.id)
      onTopicDeleted(t.id)
      toast.success(`"${t.title}" eliminado`)
    } catch {
      toast.error('Error al eliminar')
    }
  }

  function renderTopicRows(sortedTopics: FacultyTopic[]) {
    if (sortedTopics.length === 0) return null
    return (
      <ul className="space-y-0.5 mb-1.5">
        {sortedTopics.map((t, i) => (
          <li
            key={t.id}
            className="group flex items-center gap-2 rounded border border-border/40 bg-card/30 px-2.5 py-1.5"
          >
            <div className="flex flex-col shrink-0">
              <button
                type="button"
                onClick={() => moveTopic(sortedTopics, i, -1)}
                disabled={i === 0}
                className="text-muted-foreground/40 hover:text-muted-foreground transition-colors disabled:opacity-0 disabled:pointer-events-none"
              >
                <ChevronUp className="size-3" />
              </button>
              <button
                type="button"
                onClick={() => moveTopic(sortedTopics, i, 1)}
                disabled={i === sortedTopics.length - 1}
                className="text-muted-foreground/40 hover:text-muted-foreground transition-colors disabled:opacity-0 disabled:pointer-events-none"
              >
                <ChevronDown className="size-3" />
              </button>
            </div>

            <span
              className={cn(
                'shrink-0 size-2 rounded-full',
                t.status === 'dominado' && 'bg-green-500',
                t.status === 'visto' && 'bg-blue-400',
                t.status === 'pendiente' && 'bg-muted-foreground/25',
              )}
            />

            {editing?.kind === 'topic' && editing.id === t.id ? (
              <input
                autoFocus
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                onBlur={commitEdit}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') commitEdit()
                  if (e.key === 'Escape') setEditing(null)
                }}
                className="flex-1 min-w-0 bg-transparent text-sm outline-none border-b border-primary/40 py-0.5"
              />
            ) : (
              <span
                className="flex-1 min-w-0 text-sm truncate cursor-text"
                onDoubleClick={() => {
                  setEditing({ kind: 'topic', id: t.id })
                  setEditTitle(t.title)
                }}
              >
                {t.title}
              </span>
            )}

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
                      onClick={() => handleDeleteTopic(t)}
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
    )
  }

  function renderAddTopicTrigger(unitId: string | null) {
    if (addingIn?.kind === 'topic' && addingIn.unitId === unitId) {
      return (
        <form onSubmit={submitAdd} className="flex items-center gap-2 mt-1">
          <input
            autoFocus
            value={addTitle}
            onChange={(e) => setAddTitle(e.target.value)}
            placeholder="Nuevo tema…"
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setAddingIn(null)
                setAddTitle('')
              }
            }}
            className="flex-1 h-7 rounded border border-primary/30 bg-card/40 px-2.5 text-xs outline-none focus:border-primary/60 transition-colors placeholder:text-muted-foreground/40"
          />
          <Button
            type="submit"
            size="sm"
            variant="outline"
            disabled={!addTitle.trim()}
            className="h-7 px-2 text-xs gap-1 shrink-0"
          >
            <Plus className="size-3" /> Agregar
          </Button>
          <button
            type="button"
            onClick={() => {
              setAddingIn(null)
              setAddTitle('')
            }}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            ✕
          </button>
        </form>
      )
    }
    return (
      <button
        type="button"
        onClick={() => startAdding({ kind: 'topic', unitId })}
        className="flex items-center gap-1 text-[11px] text-muted-foreground/50 hover:text-muted-foreground transition-colors mt-1"
      >
        <Plus className="size-3" /> Agregar tema
      </button>
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-foreground">
          Temario
          <span className="ml-2 text-[11px] text-muted-foreground tabular-nums">
            ({topics.length} temas)
          </span>
        </p>
      </div>

      {topics.length > 0 && (
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span>Progreso total</span>
            <span className="tabular-nums">
              {totalDominado}/{topics.length} dominados ({overallProgress}%)
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
            <div
              className="h-1.5 rounded-full bg-green-500 transition-all duration-500"
              style={{ width: `${overallProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Groups */}
      {sortedGroups.map((group, gi) => {
        const gUnits = [...units]
          .filter((u) => u.group_id === group.id)
          .sort((a, b) => a.order_index - b.order_index)
        const gTopics = topics.filter((t) => gUnits.some((u) => u.id === t.unit_id))
        const gDominado = gTopics.filter((t) => t.status === 'dominado').length
        const isCollapsed = collapsedGroups.has(group.id)

        return (
          <div key={group.id} className="rounded-lg border border-border/60 bg-card/20 overflow-hidden">
            {/* Group header */}
            <div className="flex items-center gap-2 px-3 py-2 bg-card/40 border-b border-border/40">
              <button
                type="button"
                onClick={() =>
                  setCollapsedGroups((prev) => {
                    const next = new Set(prev)
                    if (next.has(group.id)) next.delete(group.id)
                    else next.add(group.id)
                    return next
                  })
                }
                className="text-muted-foreground/60 hover:text-muted-foreground transition-colors shrink-0"
              >
                <ChevronRight
                  className={cn('size-3.5 transition-transform', !isCollapsed && 'rotate-90')}
                />
              </button>

              {editing?.kind === 'group' && editing.id === group.id ? (
                <input
                  autoFocus
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  onBlur={commitEdit}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') commitEdit()
                    if (e.key === 'Escape') setEditing(null)
                  }}
                  className="flex-1 min-w-0 bg-transparent text-sm font-medium outline-none border-b border-primary/40 py-0.5"
                />
              ) : (
                <span
                  className="text-sm font-medium flex-1 min-w-0 truncate cursor-text"
                  onDoubleClick={() => {
                    setEditing({ kind: 'group', id: group.id })
                    setEditTitle(group.title)
                  }}
                >
                  {group.title}
                </span>
              )}

              {gTopics.length > 0 && (
                <MiniProgress dominado={gDominado} total={gTopics.length} />
              )}

              <div className="flex flex-col shrink-0">
                <button
                  type="button"
                  onClick={() => moveGroup(sortedGroups, gi, -1)}
                  disabled={gi === 0}
                  className="text-muted-foreground/40 hover:text-muted-foreground transition-colors disabled:opacity-0 disabled:pointer-events-none"
                >
                  <ChevronUp className="size-3" />
                </button>
                <button
                  type="button"
                  onClick={() => moveGroup(sortedGroups, gi, 1)}
                  disabled={gi === sortedGroups.length - 1}
                  className="text-muted-foreground/40 hover:text-muted-foreground transition-colors disabled:opacity-0 disabled:pointer-events-none"
                >
                  <ChevronDown className="size-3" />
                </button>
              </div>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <button
                    type="button"
                    className="flex items-center justify-center size-5 rounded text-muted-foreground/40 hover:text-destructive hover:bg-secondary transition-colors shrink-0"
                  >
                    <Trash2 className="size-3" />
                  </button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>¿Eliminar "{group.title}"?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Se eliminan todas sus unidades. Los temas quedan sin clasificar.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => handleDeleteGroup(group)}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Eliminar
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>

            {/* Group content */}
            {!isCollapsed && (
              <div className="p-3 space-y-2">
                {gUnits.map((unit, ui) => {
                  const uTopics = topics
                    .filter((t) => t.unit_id === unit.id)
                    .sort((a, b) => a.order_index - b.order_index)
                  const uDominado = uTopics.filter((t) => t.status === 'dominado').length
                  const isUnitCollapsed = collapsedUnits.has(unit.id)

                  return (
                    <div
                      key={unit.id}
                      className="rounded-md border border-border/40 bg-background/20 overflow-hidden"
                    >
                      {/* Unit header */}
                      <div className="flex items-center gap-2 px-2.5 py-1.5 bg-card/20">
                        <button
                          type="button"
                          onClick={() =>
                            setCollapsedUnits((prev) => {
                              const next = new Set(prev)
                              if (next.has(unit.id)) next.delete(unit.id)
                              else next.add(unit.id)
                              return next
                            })
                          }
                          className="text-muted-foreground/50 hover:text-muted-foreground transition-colors shrink-0"
                        >
                          <ChevronRight
                            className={cn(
                              'size-3 transition-transform',
                              !isUnitCollapsed && 'rotate-90',
                            )}
                          />
                        </button>

                        {editing?.kind === 'unit' && editing.id === unit.id ? (
                          <input
                            autoFocus
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            onBlur={commitEdit}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') commitEdit()
                              if (e.key === 'Escape') setEditing(null)
                            }}
                            className="flex-1 min-w-0 bg-transparent text-xs font-medium outline-none border-b border-primary/40 py-0.5"
                          />
                        ) : (
                          <span
                            className="text-xs font-medium text-foreground/80 flex-1 min-w-0 truncate cursor-text"
                            onDoubleClick={() => {
                              setEditing({ kind: 'unit', id: unit.id })
                              setEditTitle(unit.title)
                            }}
                          >
                            {unit.title}
                          </span>
                        )}

                        {uTopics.length > 0 && (
                          <MiniProgress dominado={uDominado} total={uTopics.length} />
                        )}

                        <div className="flex flex-col shrink-0">
                          <button
                            type="button"
                            onClick={() => moveUnit(gUnits, ui, -1)}
                            disabled={ui === 0}
                            className="text-muted-foreground/40 hover:text-muted-foreground transition-colors disabled:opacity-0 disabled:pointer-events-none"
                          >
                            <ChevronUp className="size-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => moveUnit(gUnits, ui, 1)}
                            disabled={ui === gUnits.length - 1}
                            className="text-muted-foreground/40 hover:text-muted-foreground transition-colors disabled:opacity-0 disabled:pointer-events-none"
                          >
                            <ChevronDown className="size-3" />
                          </button>
                        </div>

                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <button
                              type="button"
                              className="flex items-center justify-center size-5 rounded text-muted-foreground/40 hover:text-destructive hover:bg-secondary transition-colors shrink-0"
                            >
                              <Trash2 className="size-3" />
                            </button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>¿Eliminar "{unit.title}"?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Los temas quedan sin clasificar.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeleteUnit(unit)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Eliminar
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>

                      {/* Unit topics */}
                      {!isUnitCollapsed && (
                        <div className="px-2.5 pt-2 pb-2.5">
                          {renderTopicRows(uTopics)}
                          {renderAddTopicTrigger(unit.id)}
                        </div>
                      )}
                    </div>
                  )
                })}

                {/* Add unit */}
                {addingIn?.kind === 'unit' && addingIn.groupId === group.id ? (
                  <form onSubmit={submitAdd} className="flex items-center gap-2">
                    <input
                      autoFocus
                      value={addTitle}
                      onChange={(e) => setAddTitle(e.target.value)}
                      placeholder="Nueva unidad…"
                      onKeyDown={(e) => {
                        if (e.key === 'Escape') {
                          setAddingIn(null)
                          setAddTitle('')
                        }
                      }}
                      className="flex-1 h-7 rounded border border-primary/30 bg-card/40 px-2.5 text-xs outline-none focus:border-primary/60 transition-colors placeholder:text-muted-foreground/40"
                    />
                    <Button
                      type="submit"
                      size="sm"
                      variant="outline"
                      disabled={!addTitle.trim()}
                      className="h-7 px-2 text-xs gap-1 shrink-0"
                    >
                      <Plus className="size-3" /> Agregar
                    </Button>
                    <button
                      type="button"
                      onClick={() => {
                        setAddingIn(null)
                        setAddTitle('')
                      }}
                      className="text-xs text-muted-foreground hover:text-foreground"
                    >
                      ✕
                    </button>
                  </form>
                ) : (
                  <button
                    type="button"
                    onClick={() => startAdding({ kind: 'unit', groupId: group.id })}
                    className="flex items-center gap-1 text-xs text-muted-foreground/50 hover:text-muted-foreground transition-colors"
                  >
                    <Plus className="size-3.5" /> Agregar unidad
                  </button>
                )}
              </div>
            )}
          </div>
        )
      })}

      {/* Sin clasificar / fallback flat list */}
      {showUnclassified && (
        <div className="rounded-lg border border-dashed border-border/50 p-3 space-y-2">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground/50">
            {sortedGroups.length === 0 ? 'Temas' : 'Sin clasificar'}
            {unclassified.length > 0 && (
              <span className="ml-1 normal-case tracking-normal">({unclassified.length})</span>
            )}
          </p>
          {renderTopicRows(unclassified)}
          {renderAddTopicTrigger(null)}
        </div>
      )}

      {/* Add group */}
      {addingIn?.kind === 'group' ? (
        <form onSubmit={submitAdd} className="flex items-center gap-2">
          <input
            autoFocus
            value={addTitle}
            onChange={(e) => setAddTitle(e.target.value)}
            placeholder="Nombre del grupo (ej: Parcial 1)…"
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setAddingIn(null)
                setAddTitle('')
              }
            }}
            className="flex-1 h-8 rounded-md border border-primary/30 bg-card/40 px-3 text-sm outline-none focus:border-primary/60 transition-colors placeholder:text-muted-foreground/40"
          />
          <Button
            type="submit"
            size="sm"
            variant="outline"
            disabled={!addTitle.trim()}
            className="gap-1.5 shrink-0"
          >
            <Plus className="size-3.5" /> Agregar
          </Button>
          <button
            type="button"
            onClick={() => {
              setAddingIn(null)
              setAddTitle('')
            }}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            ✕
          </button>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => startAdding({ kind: 'group' })}
          className="flex items-center gap-1.5 text-sm text-muted-foreground/50 hover:text-muted-foreground transition-colors"
        >
          <Plus className="size-3.5" /> Agregar grupo
        </button>
      )}
    </div>
  )
}
