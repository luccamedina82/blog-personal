import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { FacultyShell } from '@/components/faculty/faculty-shell'
import { NotesList } from '@/components/faculty/notes-list'
import { NoteView } from '@/components/faculty/note-view'
import { FacultyNoteEditor } from '@/components/faculty/note-editor'
import { DeadlineList } from '@/components/faculty/deadline-list'
import { TopicList } from '@/components/faculty/topic-list'
import {
  getFacultySubject,
  listFacultyNotes,
  listFacultyDeadlines,
  listFacultyTopics,
  deleteFacultyNote,
} from '@/lib/faculty/queries'
import type { FacultySubject, FacultyNote, FacultyDeadline, FacultyTopic } from '@/lib/faculty/types'

export const Route = createFileRoute('/faculty/$subjectId')({
  component: SubjectDetail,
})

type View =
  | { kind: 'list' }
  | { kind: 'note'; noteId: string }
  | { kind: 'editor'; editNote?: FacultyNote }

function SubjectDetail() {
  const { subjectId } = Route.useParams()
  const [subject, setSubject] = useState<FacultySubject | null>(null)
  const [notes, setNotes] = useState<FacultyNote[]>([])
  const [deadlines, setDeadlines] = useState<FacultyDeadline[]>([])
  const [topics, setTopics] = useState<FacultyTopic[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<View>({ kind: 'list' })
  const [activeTab, setActiveTab] = useState<'notas' | 'deadlines' | 'temario'>('notas')

  useEffect(() => {
    Promise.all([
      getFacultySubject(subjectId),
      listFacultyNotes(subjectId),
      listFacultyDeadlines(subjectId),
      listFacultyTopics(subjectId),
    ])
      .then(([s, n, d, t]) => {
        setSubject(s)
        setNotes(n)
        setDeadlines(d)
        setTopics(t)
      })
      .catch(() => toast.error('Error al cargar materia'))
      .finally(() => setLoading(false))
  }, [subjectId])

  if (loading) {
    return (
      <FacultyShell back={{ to: '/faculty', label: 'Materias' }} title="Cargando…">
        <p className="text-xs text-muted-foreground">Cargando…</p>
      </FacultyShell>
    )
  }

  if (!subject) {
    return (
      <FacultyShell back={{ to: '/faculty', label: 'Materias' }} title="No encontrada">
        <p className="text-sm text-muted-foreground">Esta materia no existe.</p>
      </FacultyShell>
    )
  }

  // ── Note view ─────────────────────────────────────────────────────────────

  if (view.kind === 'note') {
    const note = notes.find((n) => n.id === view.noteId)
    if (!note) { setView({ kind: 'list' }); return null }

    async function handleDeleteFromView() {
      try {
        await deleteFacultyNote(note!.id)
        setNotes((prev) => prev.filter((n) => n.id !== note!.id))
        setView({ kind: 'list' })
        toast.success(`"${note!.title}" eliminada`)
      } catch {
        toast.error('Error al eliminar')
      }
    }

    return (
      <NoteView
        note={note}
        subject={subject}
        onBack={() => setView({ kind: 'list' })}
        onEdit={() => setView({ kind: 'editor', editNote: note })}
        onDelete={handleDeleteFromView}
      />
    )
  }

  // ── Note editor ───────────────────────────────────────────────────────────

  if (view.kind === 'editor') {
    return (
      <FacultyNoteEditor
        subject={subject}
        topics={topics}
        initial={view.editNote}
        onSaved={(saved) => {
          setNotes((prev) => {
            const exists = prev.find((n) => n.id === saved.id)
            if (exists) return prev.map((n) => (n.id === saved.id ? saved : n))
            return [saved, ...prev]
          })
          setView({ kind: 'list' })
        }}
        onCancel={() => setView({ kind: 'list' })}
      />
    )
  }

  // ── Subject detail (list) ─────────────────────────────────────────────────

  const pendingDeadlines = deadlines.filter((d) => !d.done).length

  return (
    <FacultyShell
      back={{ to: '/faculty', label: 'Materias' }}
      title={subject.name}
      subtitle={
        [subject.code, subject.semester, subject.professor].filter(Boolean).join(' · ') || undefined
      }
    >
      <div className="grid gap-8 lg:grid-cols-[1fr_220px]">
        <section>
          {/* Tabs */}
          <div className="flex gap-0 border-b border-border mb-6">
            {(['notas', 'deadlines', 'temario'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={cn(
                  'relative px-4 py-2.5 text-sm whitespace-nowrap transition-colors capitalize',
                  activeTab === tab
                    ? 'text-foreground after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-primary after:rounded-t'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {tab === 'notas' ? 'Notas' : tab === 'deadlines' ? 'Deadlines' : 'Temario'}
                {tab === 'deadlines' && pendingDeadlines > 0 && (
                  <span className="ml-1.5 inline-flex items-center justify-center size-4 rounded-full bg-primary text-primary-foreground text-[9px] font-medium">
                    {pendingDeadlines}
                  </span>
                )}
                {tab === 'temario' && topics.length > 0 && (
                  <span className="ml-1.5 inline-flex items-center justify-center size-4 rounded-full bg-secondary text-muted-foreground text-[9px] font-medium">
                    {topics.length}
                  </span>
                )}
              </button>
            ))}
          </div>

          {activeTab === 'notas' && (
            <NotesList
              notes={notes}
              onNew={() => setView({ kind: 'editor' })}
              onSelect={(note) => setView({ kind: 'note', noteId: note.id })}
              onEdit={(note) => setView({ kind: 'editor', editNote: note })}
              onDeleted={(id) => setNotes((prev) => prev.filter((n) => n.id !== id))}
            />
          )}

          {activeTab === 'deadlines' && (
            <DeadlineList
              deadlines={deadlines}
              subjectId={subjectId}
              onCreated={(d) => setDeadlines((prev) => [...prev, d])}
              onUpdated={(d) => setDeadlines((prev) => prev.map((x) => (x.id === d.id ? d : x)))}
              onDeleted={(id) => setDeadlines((prev) => prev.filter((d) => d.id !== id))}
            />
          )}

          {activeTab === 'temario' && (
            <TopicList
              subjectId={subjectId}
              topics={topics}
              onCreated={(t) => setTopics((prev) => [...prev, t])}
              onUpdated={(t) => setTopics((prev) => prev.map((x) => (x.id === t.id ? t : x)))}
              onDeleted={(id) => setTopics((prev) => prev.filter((t) => t.id !== id))}
            />
          )}
        </section>

        <aside>
          <SubjectMeta
            subject={subject}
            notesCount={notes.length}
            pendingDeadlines={pendingDeadlines}
            topics={topics}
          />
        </aside>
      </div>
    </FacultyShell>
  )
}

function SubjectMeta({
  subject,
  notesCount,
  pendingDeadlines,
  topics,
}: {
  subject: FacultySubject
  notesCount: number
  pendingDeadlines: number
  topics: FacultyTopic[]
}) {
  const dominado = topics.filter((t) => t.status === 'dominado').length
  const topicProgress = topics.length > 0 ? Math.round((dominado / topics.length) * 100) : null

  const stats = [
    { label: 'Estado', value: subject.status },
    { label: 'Notas', value: String(notesCount) },
    { label: 'Deadlines pend.', value: String(pendingDeadlines) },
    { label: 'Créditos', value: subject.credits != null ? String(subject.credits) : '—' },
  ]

  return (
    <div className="space-y-3">
      <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Info</p>
      <div className="space-y-2">
        {stats.map((s) => (
          <div key={s.label} className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">{s.label}</span>
            <span className="font-medium text-foreground">{s.value}</span>
          </div>
        ))}
      </div>

      {topicProgress !== null && (
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span>Temario</span>
            <span className="tabular-nums">{dominado}/{topics.length} ({topicProgress}%)</span>
          </div>
          <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
            <div
              className="h-1.5 rounded-full bg-green-500 transition-all duration-500"
              style={{ width: `${topicProgress}%` }}
            />
          </div>
        </div>
      )}

      {subject.color && (
        <div className="h-1.5 rounded-full mt-3" style={{ backgroundColor: subject.color }} />
      )}
    </div>
  )
}
