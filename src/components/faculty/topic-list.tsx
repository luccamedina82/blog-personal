import { useState } from 'react'
import { Plus, Trash2, ChevronUp, ChevronDown, ChevronRight, Link2, X, BookOpen, FileText, FlaskConical, Check, Clock } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { TopicCitationPicker, type CitationResult } from './topic-citation-picker'
import { CountdownBadge } from './countdown-badge'
import {
  createFacultyTopic, updateFacultyTopic, deleteFacultyTopic,
  createFacultyTopicGroup, updateFacultyTopicGroup, deleteFacultyTopicGroup,
  createFacultyTopicUnit, updateFacultyTopicUnit, deleteFacultyTopicUnit,
  addTopicCitation, removeTopicCitation, linkGroupToDeadline,
} from '@/lib/faculty/queries'
import type {
  FacultyTopic, FacultyTopicStatus, FacultyTopicGroup, FacultyTopicUnit,
  FacultyTopicCitation, FacultyTopicCitationKind, FacultyDeadline,
  FacultyNote,
} from '@/lib/faculty/types'


const CITATION_ICON: Record<FacultyTopicCitationKind, React.ElementType> = {
  faculty_note: FileText,
  devlab_post: FlaskConical,
  library_book: BookOpen,
}

const CITATION_PREFIX: Record<FacultyTopicCitationKind, string> = {
  faculty_note: '📝',
  devlab_post: '🧪',
  library_book: '📖',
}

const GROUP_ACCENTS = [
  { border: 'border-l-teal-500/60', bg: 'bg-teal-500/5', color: '#14b8a6' },
  { border: 'border-l-violet-500/60', bg: 'bg-violet-500/5', color: '#8b5cf6' },
  { border: 'border-l-blue-500/60', bg: 'bg-blue-500/5', color: '#3b82f6' },
  { border: 'border-l-amber-500/60', bg: 'bg-amber-500/5', color: '#f59e0b' },
  { border: 'border-l-rose-500/60', bg: 'bg-rose-500/5', color: '#f43f5e' },
  { border: 'border-l-emerald-500/60', bg: 'bg-emerald-500/5', color: '#10b981' },
] as const

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
  deadlines: FacultyDeadline[]
  citationsByTopic: Map<string, FacultyTopicCitation[]>
  notes?: FacultyNote[]
  onNoteClick?: (note: FacultyNote) => void
  onGroupCreated: (g: FacultyTopicGroup) => void
  onGroupUpdated: (g: FacultyTopicGroup) => void
  onGroupDeleted: (id: string) => void
  onUnitCreated: (u: FacultyTopicUnit) => void
  onUnitUpdated: (u: FacultyTopicUnit) => void
  onUnitDeleted: (id: string) => void
  onTopicCreated: (t: FacultyTopic) => void
  onTopicUpdated: (t: FacultyTopic) => void
  onTopicDeleted: (id: string) => void
  onCitationAdded: (topicId: string, citation: FacultyTopicCitation) => void
  onCitationRemoved: (topicId: string, citationId: string) => void
  onCitationClick: (citation: FacultyTopicCitation) => void
}

function DonutRing({ mastered, total, color }: { mastered: number; total: number; color: string }) {
  const r = 14
  const circumference = 2 * Math.PI * r
  const dash = total === 0 ? 0 : (mastered / total) * circumference
  return (
    <svg width="34" height="34" viewBox="0 0 36 36" className="shrink-0 -rotate-90">
      <circle cx="18" cy="18" r={r} fill="none" stroke="currentColor" strokeWidth="3" className="text-border/30" />
      <circle
        cx="18" cy="18" r={r} fill="none"
        stroke={color} strokeWidth="3"
        strokeDasharray={`${dash} ${circumference}`}
        strokeLinecap="round"
        className="transition-all duration-500"
      />
    </svg>
  )
}

export function TopicList({
  subjectId,
  groups,
  units,
  topics,
  deadlines,
  citationsByTopic,
  notes = [],
  onNoteClick,
  onGroupCreated,
  onGroupUpdated,
  onGroupDeleted,
  onUnitCreated,
  onUnitUpdated,
  onUnitDeleted,
  onTopicCreated,
  onTopicUpdated,
  onTopicDeleted,
  onCitationAdded,
  onCitationRemoved,
  onCitationClick,
}: Props) {
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set())
  const [collapsedUnits, setCollapsedUnits] = useState<Set<string>>(new Set())
  const [addingIn, setAddingIn] = useState<AddingIn>(null)
  const [addTitle, setAddTitle] = useState('')
  const [editing, setEditing] = useState<Editing>(null)
  const [editTitle, setEditTitle] = useState('')
  const [pickerTopicId, setPickerTopicId] = useState<string | null>(null)
  const [filterStatus, setFilterStatus] = useState<'all' | FacultyTopicStatus>('all')

  const sortedGroups = [...groups].sort((a, b) => a.order_index - b.order_index)
  const unclassified = topics.filter((t) => !t.unit_id).sort((a, b) => a.order_index - b.order_index)
  const totalDominado = topics.filter((t) => t.status === 'dominado').length
  const overallProgress = topics.length > 0 ? Math.round((totalDominado / topics.length) * 100) : 0
  const showUnclassified = sortedGroups.length === 0 || unclassified.length > 0

  function applyFilter(list: FacultyTopic[]) {
    if (filterStatus === 'all') return list
    return list.filter((t) => t.status === filterStatus)
  }

  function cycleStatus(t: FacultyTopic) {
    const next: Record<FacultyTopicStatus, FacultyTopicStatus> = {
      pendiente: 'visto',
      visto: 'dominado',
      dominado: 'pendiente',
    }
    handleStatusChange(t, next[t.status])
  }
  const examDeadlines = deadlines.filter((d) =>
    ['parcial', 'final', 'recuperatorio'].includes(d.kind),
  )

  async function handleLinkDeadline(group: FacultyTopicGroup, deadlineId: string | null) {
    try {
      await linkGroupToDeadline(group.id, deadlineId)
      onGroupUpdated({ ...group, deadline_id: deadlineId })
    } catch {
      toast.error('Error al vincular')
    }
  }

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

  async function handleCitationConfirm(topicId: string, result: CitationResult) {
    try {
      const citations = citationsByTopic.get(topicId) ?? []
      const nextIndex = citations.length > 0 ? Math.max(...citations.map((c) => c.order_index)) + 1 : 0
      const created = await addTopicCitation({
        topic_id: topicId,
        source_kind: result.source_kind,
        source_id: result.source_id,
        source_title: result.source_title,
        source_storage_path: result.source_storage_path,
        page: result.page,
        order_index: nextIndex,
      })
      onCitationAdded(topicId, created)
      toast.success('Cita agregada')
    } catch {
      toast.error('Error al citar')
    }
  }

  async function handleRemoveCitation(topicId: string, citationId: string) {
    try {
      await removeTopicCitation(citationId)
      onCitationRemoved(topicId, citationId)
    } catch {
      toast.error('Error al eliminar cita')
    }
  }

  function renderCitationChips(topicId: string) {
    const citations = citationsByTopic.get(topicId) ?? []
    const associatedNotes = notes.filter((n) => n.topic_id === topicId)
    if (citations.length === 0 && associatedNotes.length === 0) return null
    return (
      <div className="flex flex-wrap gap-1 mt-1">
        {associatedNotes.map((n) => (
          <button
            key={`note-${n.id}`}
            type="button"
            onClick={() => onNoteClick?.(n)}
            title={`Nota asociada: ${n.title}`}
            className="flex items-center gap-1 h-5 rounded-full bg-blue-500/10 border border-blue-500/40 px-2 text-[10px] text-blue-400 hover:bg-blue-500/20 transition-colors cursor-pointer"
          >
            <FileText className="size-2.5 shrink-0" />
            <span className="truncate max-w-[120px]">📝 {n.title}</span>
          </button>
        ))}
        {citations.map((c) => {
          const IconComp = CITATION_ICON[c.source_kind]
          return (
            <div
              key={c.id}
              className="group/chip flex items-center gap-1 h-5 rounded-full bg-secondary/60 border border-border/50 px-2 text-[10px] text-muted-foreground hover:bg-primary/10 hover:border-primary/30 hover:text-foreground transition-colors cursor-pointer"
            >
              <button
                type="button"
                onClick={() => onCitationClick(c)}
                className="flex items-center gap-1 hover:text-foreground transition-colors min-w-0"
                title={c.source_title ?? undefined}
              >
                <IconComp className="size-2.5 shrink-0" />
                <span className="truncate max-w-[120px]">
                  {CITATION_PREFIX[c.source_kind]} {c.source_title}
                  {c.page != null && ` p.${c.page}`}
                </span>
              </button>
              <button
                type="button"
                onClick={() => handleRemoveCitation(topicId, c.id)}
                className="opacity-0 group-hover/chip:opacity-100 text-muted-foreground/50 hover:text-destructive transition-all ml-0.5 shrink-0"
                title="Quitar cita"
              >
                <X className="size-2.5" />
              </button>
            </div>
          )
        })}
      </div>
    )
  }

  function renderTopicRows(sortedTopics: FacultyTopic[]) {
    if (sortedTopics.length === 0) return null
    return (
      <ul className="space-y-0.5">
        {sortedTopics.map((t) => (
          <li key={t.id} className="group/topic">
            <div className="flex items-start gap-2.5 py-1.5 px-1 rounded hover:bg-secondary/20 transition-colors">
              {/* Status circle — click to cycle P→V→D */}
              <button
                type="button"
                onClick={() => cycleStatus(t)}
                title={`${t.status} — click para cambiar`}
                className="mt-0.5 shrink-0 focus:outline-none"
              >
                <span className={cn(
                  'flex size-5 items-center justify-center rounded-full transition-all',
                  t.status === 'dominado' && 'bg-green-500',
                  t.status === 'visto' && 'border-2 border-blue-400',
                  t.status === 'pendiente' && 'border border-muted-foreground/30 hover:border-muted-foreground/60',
                )}>
                  {t.status === 'dominado' && <Check className="size-3 text-white" />}
                  {t.status === 'visto' && <Clock className="size-3 text-blue-400" />}
                </span>
              </button>

              {/* Title + citations */}
              <div className="flex-1 min-w-0">
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
                    className="w-full bg-transparent text-sm outline-none border-b border-primary/40 py-0.5"
                  />
                ) : (
                  <span
                    className={cn(
                      'text-sm leading-snug cursor-text block',
                      t.status === 'dominado' && 'text-muted-foreground/50 line-through',
                      t.status === 'visto' && 'text-foreground/80',
                      t.status === 'pendiente' && 'text-foreground',
                    )}
                    onDoubleClick={() => {
                      setEditing({ kind: 'topic', id: t.id })
                      setEditTitle(t.title)
                    }}
                  >
                    {t.title}
                  </span>
                )}
                {renderCitationChips(t.id)}
              </div>

              {/* Actions — hover reveal */}
              <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover/topic:opacity-100 transition-opacity mt-0.5">
                <button
                  type="button"
                  onClick={() => setPickerTopicId(t.id)}
                  title="Citar recurso"
                  className="flex items-center justify-center size-5 rounded text-muted-foreground/40 hover:text-primary hover:bg-primary/10 transition-colors"
                >
                  <Link2 className="size-3" />
                </button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <button
                      type="button"
                      className="flex items-center justify-center size-5 rounded text-muted-foreground/40 hover:text-destructive hover:bg-secondary transition-colors"
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

      {topics.length > 0 && (
        <div className="flex gap-1 flex-wrap">
          {(
            [
              { value: 'all', label: 'Todo' },
              { value: 'pendiente', label: 'Pendiente' },
              { value: 'visto', label: 'Visto' },
              { value: 'dominado', label: 'Dominado' },
            ] as const
          ).map((f) => {
            const count =
              f.value === 'all'
                ? topics.length
                : topics.filter((t) => t.status === f.value).length
            return (
              <button
                key={f.value}
                type="button"
                onClick={() => setFilterStatus(f.value)}
                className={cn(
                  'h-6 px-2.5 rounded-full text-[11px] transition-colors',
                  filterStatus === f.value
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary/60 text-muted-foreground hover:bg-secondary hover:text-foreground',
                )}
              >
                {f.label}{' '}
                <span className="opacity-60 tabular-nums">{count}</span>
              </button>
            )
          })}
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

        if (filterStatus !== 'all' && applyFilter(gTopics).length === 0) return null

        const accent = GROUP_ACCENTS[gi % GROUP_ACCENTS.length]
        const gPct = gTopics.length > 0 ? Math.round((gDominado / gTopics.length) * 100) : 0

        return (
          <div key={group.id} className={cn('rounded-lg border border-border/50 border-l-4 overflow-hidden', accent.border)}>
            {/* Group header */}
            <div className={cn('flex items-center gap-2 px-4 py-3 border-b border-border/30', accent.bg)}>
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
                className="text-muted-foreground/50 hover:text-muted-foreground transition-colors shrink-0"
              >
                <ChevronDown
                  className={cn('size-4 transition-transform duration-200', isCollapsed && '-rotate-90')}
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

              {group.deadline_id && (() => {
                const linked = deadlines.find((d) => d.id === group.deadline_id)
                return linked ? <CountdownBadge dueAt={linked.due_at} done={linked.done} /> : null
              })()}

              {gTopics.length > 0 && (
                <div className="flex items-center gap-2.5 shrink-0 ml-auto">
                  <div className="text-right hidden sm:block">
                    <p className="text-xs font-semibold tabular-nums text-foreground/80">{gPct}%</p>
                    <p className="text-[10px] text-muted-foreground tabular-nums">{gDominado}/{gTopics.length} dominados</p>
                  </div>
                  <DonutRing mastered={gDominado} total={gTopics.length} color={accent.color} />
                </div>
              )}

              {/* Deadline link selector */}
              {examDeadlines.length > 0 && (
                <select
                  value={group.deadline_id ?? ''}
                  onChange={(e) => handleLinkDeadline(group, e.target.value || null)}
                  className="shrink-0 h-6 rounded border border-border/60 bg-card/40 px-1.5 text-[11px] outline-none focus:border-primary/40 transition-colors text-muted-foreground max-w-[110px]"
                  title="Vincular a examen"
                >
                  <option value="">Sin examen</option>
                  {examDeadlines.map((d) => (
                    <option key={d.id} value={d.id}>{d.title}</option>
                  ))}
                </select>
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
                  const filteredUTopics = applyFilter(uTopics)
                  if (filterStatus !== 'all' && filteredUTopics.length === 0) return null
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
                          <div className="flex items-center gap-1.5 shrink-0 ml-auto">
                            <div className="w-14 h-1 rounded-full bg-secondary overflow-hidden">
                              <div
                                className="h-1 rounded-full bg-primary/50 transition-all duration-500"
                                style={{ width: `${Math.round((uDominado / uTopics.length) * 100)}%` }}
                              />
                            </div>
                            <span className="text-[10px] text-muted-foreground tabular-nums whitespace-nowrap">
                              {uDominado}/{uTopics.length}
                            </span>
                          </div>
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
                          {renderTopicRows(filteredUTopics)}
                          {filterStatus === 'all' && renderAddTopicTrigger(unit.id)}
                        </div>
                      )}
                    </div>
                  )
                })}

                {/* Add unit */}
                {filterStatus === 'all' && addingIn?.kind === 'unit' && addingIn.groupId === group.id ? (
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
                ) : filterStatus === 'all' ? (
                  <button
                    type="button"
                    onClick={() => startAdding({ kind: 'unit', groupId: group.id })}
                    className="flex items-center gap-1 text-xs text-muted-foreground/50 hover:text-muted-foreground transition-colors"
                  >
                    <Plus className="size-3.5" /> Agregar unidad
                  </button>
                ) : null}
              </div>
            )}
          </div>
        )
      })}

      {/* Sin clasificar / fallback flat list */}
      {showUnclassified && (filterStatus === 'all' || applyFilter(unclassified).length > 0) && (
        <div className="rounded-lg border border-dashed border-border/50 p-3 space-y-2">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground/50">
            {sortedGroups.length === 0 ? 'Temas' : 'Sin clasificar'}
            {unclassified.length > 0 && (
              <span className="ml-1 normal-case tracking-normal">({unclassified.length})</span>
            )}
          </p>
          {renderTopicRows(applyFilter(unclassified))}
          {filterStatus === 'all' && renderAddTopicTrigger(null)}
        </div>
      )}

      {/* Add group */}
      {filterStatus === 'all' && addingIn?.kind === 'group' ? (
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
      ) : filterStatus === 'all' ? (
        <button
          type="button"
          onClick={() => startAdding({ kind: 'group' })}
          className="flex items-center gap-1.5 text-sm text-muted-foreground/50 hover:text-muted-foreground transition-colors"
        >
          <Plus className="size-3.5" /> Agregar grupo
        </button>
      ) : null}

      {/* Citation picker dialog */}
      <TopicCitationPicker
        open={pickerTopicId !== null}
        onOpenChange={(v) => { if (!v) setPickerTopicId(null) }}
        onConfirm={(result) => {
          if (pickerTopicId) handleCitationConfirm(pickerTopicId, result)
        }}
      />
    </div>
  )
}
