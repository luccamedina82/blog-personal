import { useState } from 'react'
import { ChevronDown, ChevronRight, BookOpen, FileText, FlaskConical, Check, Clock, Link2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type {
  FacultyTopic, FacultyTopicGroup, FacultyTopicUnit,
  FacultyTopicCitation, FacultyTopicCitationKind,
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
  { border: 'border-l-teal-500/60', bg: 'bg-teal-500/5' },
  { border: 'border-l-violet-500/60', bg: 'bg-violet-500/5' },
  { border: 'border-l-blue-500/60', bg: 'bg-blue-500/5' },
  { border: 'border-l-amber-500/60', bg: 'bg-amber-500/5' },
  { border: 'border-l-rose-500/60', bg: 'bg-rose-500/5' },
  { border: 'border-l-emerald-500/60', bg: 'bg-emerald-500/5' },
] as const

type Props = {
  groups: FacultyTopicGroup[]
  units: FacultyTopicUnit[]
  topics: FacultyTopic[]
  citationsByTopic: Map<string, FacultyTopicCitation[]>
  notes?: FacultyNote[]
  onCitationClick: (citation: FacultyTopicCitation) => void
  onNoteClick?: (note: FacultyNote) => void
  currentTopicId?: string | null
  currentNoteId?: string | null
  onAssociate?: (topicId: string) => void
}

export function TopicListReadonly({
  groups,
  units,
  topics,
  citationsByTopic,
  notes = [],
  onCitationClick,
  onNoteClick,
  currentTopicId,
  currentNoteId,
  onAssociate,
}: Props) {
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set())
  const [collapsedUnits, setCollapsedUnits] = useState<Set<string>>(new Set())

  const sortedGroups = [...groups].sort((a, b) => a.order_index - b.order_index)
  const unclassified = topics.filter((t) => !t.unit_id).sort((a, b) => a.order_index - b.order_index)
  const showUnclassified = sortedGroups.length === 0 || unclassified.length > 0

  function renderTopicChips(topicId: string) {
    const citations = citationsByTopic.get(topicId) ?? []
    const associatedNotes = notes.filter((n) => n.topic_id === topicId)
    if (citations.length === 0 && associatedNotes.length === 0) return null
    return (
      <div className="flex flex-wrap gap-1 mt-1">
        {associatedNotes.map((n) => {
          const isCurrent = currentNoteId === n.id
          return (
            <button
              key={`note-${n.id}`}
              type="button"
              onClick={() => onNoteClick?.(n)}
              title={`Nota asociada: ${n.title}`}
              className={cn(
                'flex items-center gap-1 h-5 rounded-full border px-2 text-[10px] transition-colors',
                isCurrent
                  ? 'bg-primary/15 border-primary/50 text-primary cursor-default'
                  : 'bg-blue-500/10 border-blue-500/40 text-blue-400 hover:bg-blue-500/20 cursor-pointer',
              )}
            >
              <FileText className="size-2.5 shrink-0" />
              <span className="truncate max-w-[120px]">
                📝 {n.title}{isCurrent && ' (actual)'}
              </span>
            </button>
          )
        })}
        {citations.map((c) => {
          const IconComp = CITATION_ICON[c.source_kind]
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => onCitationClick(c)}
              title={c.source_title ?? undefined}
              className="flex items-center gap-1 h-5 rounded-full bg-secondary/60 border border-border/50 px-2 text-[10px] text-muted-foreground hover:bg-primary/10 hover:border-primary/40 hover:text-foreground transition-colors cursor-pointer"
            >
              <IconComp className="size-2.5 shrink-0" />
              <span className="truncate max-w-[120px]">
                {CITATION_PREFIX[c.source_kind]} {c.source_title}
                {c.page != null && ` p.${c.page}`}
              </span>
            </button>
          )
        })}
      </div>
    )
  }

  function renderTopicRows(sortedTopics: FacultyTopic[]) {
    if (sortedTopics.length === 0) return null
    return (
      <ul className="space-y-0.5">
        {sortedTopics.map((t) => {
          const isCurrent = currentTopicId === t.id
          return (
            <li key={t.id} className="group/topic">
              <div
                className={cn(
                  'flex items-start gap-2.5 py-1.5 px-1 rounded transition-colors',
                  isCurrent ? 'bg-primary/10 ring-1 ring-primary/30' : 'hover:bg-secondary/20',
                )}
              >
                <span
                  className={cn(
                    'mt-0.5 shrink-0 flex size-5 items-center justify-center rounded-full',
                    t.status === 'dominado' && 'bg-green-500',
                    t.status === 'visto' && 'border-2 border-blue-400',
                    t.status === 'pendiente' && 'border border-muted-foreground/30',
                  )}
                  title={t.status}
                >
                  {t.status === 'dominado' && <Check className="size-3 text-white" />}
                  {t.status === 'visto' && <Clock className="size-3 text-blue-400" />}
                </span>

                <div className="flex-1 min-w-0">
                  <span
                    className={cn(
                      'text-sm leading-snug block',
                      t.status === 'dominado' && 'text-muted-foreground/60 line-through',
                      t.status === 'visto' && 'text-foreground/80',
                      t.status === 'pendiente' && 'text-foreground',
                    )}
                  >
                    {t.title}
                  </span>
                  {renderTopicChips(t.id)}
                </div>

                {onAssociate && !isCurrent && (
                  <button
                    type="button"
                    onClick={() => onAssociate(t.id)}
                    title="Asociar nota actual a este tema"
                    className="shrink-0 flex items-center gap-1 h-6 px-2 rounded text-[10px] text-muted-foreground/60 hover:text-primary hover:bg-primary/10 transition-colors opacity-0 group-hover/topic:opacity-100"
                  >
                    <Link2 className="size-3" />
                    Asociar
                  </button>
                )}
                {isCurrent && (
                  <span className="shrink-0 text-[10px] text-primary font-medium mt-1">
                    actual
                  </span>
                )}
              </div>
            </li>
          )
        })}
      </ul>
    )
  }

  return (
    <div className="space-y-4 px-4 py-4">
      {topics.length === 0 && (
        <p className="text-xs text-muted-foreground">Esta materia no tiene temario aún.</p>
      )}

      {sortedGroups.map((group, gi) => {
        const gUnits = [...units]
          .filter((u) => u.group_id === group.id)
          .sort((a, b) => a.order_index - b.order_index)
        const gTopics = topics.filter((t) => gUnits.some((u) => u.id === t.unit_id))
        const gDominado = gTopics.filter((t) => t.status === 'dominado').length
        const isCollapsed = collapsedGroups.has(group.id)
        const accent = GROUP_ACCENTS[gi % GROUP_ACCENTS.length]
        const gPct = gTopics.length > 0 ? Math.round((gDominado / gTopics.length) * 100) : 0

        return (
          <div
            key={group.id}
            className={cn('rounded-lg border border-border/50 border-l-4 overflow-hidden', accent.border)}
          >
            <div className={cn('flex items-center gap-2 px-3 py-2 border-b border-border/30', accent.bg)}>
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

              <span className="text-sm font-medium flex-1 min-w-0 truncate">{group.title}</span>

              {gTopics.length > 0 && (
                <span className="shrink-0 text-[10px] text-muted-foreground tabular-nums">
                  {gDominado}/{gTopics.length} · {gPct}%
                </span>
              )}
            </div>

            {!isCollapsed && (
              <div className="p-2 space-y-1.5">
                {gUnits.map((unit) => {
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
                      <div className="flex items-center gap-2 px-2 py-1.5 bg-card/20">
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
                        <span className="text-xs font-medium text-foreground/80 flex-1 min-w-0 truncate">
                          {unit.title}
                        </span>
                        <span className="shrink-0 text-[10px] text-muted-foreground tabular-nums">
                          {uDominado}/{uTopics.length}
                        </span>
                      </div>

                      {!isUnitCollapsed && (
                        <div className="px-2 pt-1.5 pb-2">
                          {uTopics.length > 0
                            ? renderTopicRows(uTopics)
                            : <p className="text-[10px] text-muted-foreground/50 px-1 py-1">Sin temas.</p>}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}

      {showUnclassified && unclassified.length > 0 && (
        <div className="rounded-lg border border-dashed border-border/50 p-2 space-y-1.5">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground/50 px-1">
            {sortedGroups.length === 0 ? 'Temas' : 'Sin clasificar'}
            <span className="ml-1 normal-case tracking-normal">({unclassified.length})</span>
          </p>
          {renderTopicRows(unclassified)}
        </div>
      )}
    </div>
  )
}
