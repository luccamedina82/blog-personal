import { useState, useEffect } from 'react'
import { ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'
import { DevLabPostEditor } from '@/components/devlab-post-editor'
import { createFacultyNote, updateFacultyNote, listAllNotesSummary } from '@/lib/faculty/queries'
import { BacklinkSuggestionsContext } from '@/lib/faculty/backlinks-context'
import type {
  FacultyNote,
  FacultyNoteKind,
  FacultySubject,
  FacultyTopic,
  FacultyTopicGroup,
  FacultyTopicUnit,
} from '@/lib/faculty/types'
import type { DevLabPost } from '@/lib/devlab/types'
import type { PostDraft } from '@/components/devlab-post-editor'

const KIND_OPTIONS: Array<{ value: FacultyNoteKind; label: string }> = [
  { value: 'clase', label: 'Clase' },
  { value: 'apunte', label: 'Apunte' },
  { value: 'tp', label: 'TP' },
  { value: 'parcial', label: 'Parcial' },
  { value: 'final', label: 'Final' },
]

const GRADED_KINDS: FacultyNoteKind[] = ['tp', 'parcial', 'final']

type Props = {
  subject: FacultySubject
  topics?: FacultyTopic[]
  groups?: FacultyTopicGroup[]
  units?: FacultyTopicUnit[]
  initial?: FacultyNote
  onSaved: (note: FacultyNote) => void
  onCancel: () => void
}

export function FacultyNoteEditor({
  subject,
  topics = [],
  groups = [],
  units = [],
  initial,
  onSaved,
  onCancel,
}: Props) {
  const isEdit = !!initial

  const [suggestions, setSuggestions] = useState<Array<{ id: string; title: string; hint?: string }>>([])

  useEffect(() => {
    listAllNotesSummary()
      .then((rows) =>
        setSuggestions(
          rows
            .filter((n) => !initial || n.id !== initial.id)
            .map((n) => ({ id: n.id, title: n.title, hint: n.kind })),
        ),
      )
      .catch(() => {})
  }, [initial?.id])

  const [kind, setKind] = useState<FacultyNoteKind>(initial?.kind ?? 'clase')
  const [date, setDate] = useState(initial?.date ?? '')
  const [grade, setGrade] = useState(initial?.grade != null ? String(initial.grade) : '')
  const [topicId, setTopicId] = useState<string | null>(initial?.topic_id ?? null)

  const needsGrade = GRADED_KINDS.includes(kind)

  // DevLabPostEditor fakePost: maps FacultyNote → DevLabPost shape
  const fakePost: DevLabPost | undefined = initial
    ? {
        id: initial.id,
        user_id: initial.user_id,
        category_id: initial.subject_id,
        title: initial.title,
        excerpt: '',
        blocks: initial.blocks,
        tags: initial.tags,
        pinned: false,
        reading_time: null,
        created_at: initial.created_at,
      }
    : undefined

  async function handleSave(draft: PostDraft) {
    const payload = {
      subject_id: subject.id,
      topic_id: topicId,
      kind,
      title: draft.title,
      date: date || null,
      blocks: draft.blocks,
      tags: draft.tags,
      grade: needsGrade && grade ? parseFloat(grade) : null,
    }

    try {
      if (isEdit && initial) {
        await updateFacultyNote(initial.id, payload)
        onSaved({ ...initial, ...payload })
        toast.success('Nota actualizada')
      } else {
        const created = await createFacultyNote(payload)
        onSaved(created)
        toast.success('Nota creada')
      }
    } catch {
      toast.error(isEdit ? 'Error al actualizar' : 'Error al crear')
      throw new Error('save failed')
    }
  }

  return (
    <BacklinkSuggestionsContext.Provider value={suggestions}>
    <div className="flex flex-col min-h-full">
      {/* Faculty metadata bar — sits above DevLabPostEditor's sticky header */}
      <div className="px-6 lg:px-14 pt-6 pb-4 border-b border-border/40 bg-background/90 backdrop-blur flex items-center gap-4 flex-wrap sticky top-0 z-20">
        <button
          type="button"
          onClick={onCancel}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors shrink-0"
        >
          <ArrowLeft className="size-3.5" />
          {subject.name}
        </button>

        <div className="flex items-center gap-2 flex-wrap ml-auto">
          {/* Kind select */}
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value as FacultyNoteKind)}
            className="h-7 rounded-md border border-border/60 bg-card/40 px-2 text-xs text-foreground/80 outline-none focus:border-primary/40 transition-colors"
          >
            {KIND_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>

          {/* Topic select — grouped when hierarchy exists */}
          {topics.length > 0 && (
            <select
              value={topicId ?? ''}
              onChange={(e) => setTopicId(e.target.value || null)}
              className="h-7 rounded-md border border-border/60 bg-card/40 px-2 text-xs text-foreground/80 outline-none focus:border-primary/40 transition-colors max-w-[200px]"
            >
              <option value="">Sin tema</option>
              {groups.length === 0 ? (
                topics.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title}
                  </option>
                ))
              ) : (
                <>
                  {groups.map((g) =>
                    units
                      .filter((u) => u.group_id === g.id)
                      .map((u) => {
                        const uTopics = topics.filter((t) => t.unit_id === u.id)
                        if (uTopics.length === 0) return null
                        return (
                          <optgroup key={u.id} label={`${g.title} — ${u.title}`}>
                            {uTopics.map((t) => (
                              <option key={t.id} value={t.id}>
                                {t.title}
                              </option>
                            ))}
                          </optgroup>
                        )
                      }),
                  )}
                  {(() => {
                    const unclassified = topics.filter((t) => !t.unit_id)
                    if (unclassified.length === 0) return null
                    return (
                      <optgroup label="Sin clasificar">
                        {unclassified.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.title}
                          </option>
                        ))}
                      </optgroup>
                    )
                  })()}
                </>
              )}
            </select>
          )}

          {/* Date */}
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="h-7 rounded-md border border-border/60 bg-card/40 px-2 text-xs text-foreground/80 outline-none focus:border-primary/40 transition-colors"
          />

          {/* Grade — only for tp/parcial/final */}
          {needsGrade && (
            <input
              type="number"
              step="0.25"
              min={0}
              max={10}
              placeholder="Nota"
              value={grade}
              onChange={(e) => setGrade(e.target.value)}
              className="h-7 w-20 rounded-md border border-border/60 bg-card/40 px-2 text-xs text-foreground/80 outline-none focus:border-primary/40 transition-colors"
            />
          )}
        </div>
      </div>

      {/* Reuse DevLabPostEditor for title + tags + blocks */}
      <DevLabPostEditor
        categoryLabel={subject.name}
        categoryId={subject.id}
        initial={fakePost}
        onSave={handleSave}
        onCancel={onCancel}
      />
    </div>
    </BacklinkSuggestionsContext.Provider>
  )
}
