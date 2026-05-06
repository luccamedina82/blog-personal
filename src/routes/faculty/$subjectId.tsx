import { createFileRoute } from '@tanstack/react-router'
import React, { useEffect, useState, useMemo } from 'react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { X } from 'lucide-react'
import { PanelGroup, Panel, PanelResizeHandle } from 'react-resizable-panels'
import { PdfViewer } from '@/components/library/pdf-viewer'
import { PdfPanelContext } from '@/lib/faculty/pdf-panel-context'
import { FacultyShell } from '@/components/faculty/faculty-shell'
import { NotesList } from '@/components/faculty/notes-list'
import { NoteView } from '@/components/faculty/note-view'
import { FacultyNoteEditor } from '@/components/faculty/note-editor'
import { DeadlineList } from '@/components/faculty/deadline-list'
import { TopicList } from '@/components/faculty/topic-list'
import { GradesTab } from '@/components/faculty/grades-tab'
import {
  getFacultySubject,
  listFacultyNotes,
  listFacultyDeadlines,
  listFacultyTopics,
  listFacultyTopicGroups,
  listFacultyTopicUnits,
  deleteFacultyNote,
} from '@/lib/faculty/queries'
import type {
  FacultySubject,
  FacultyNote,
  FacultyDeadline,
  FacultyTopic,
  FacultyTopicGroup,
  FacultyTopicUnit,
} from '@/lib/faculty/types'

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
  const [groups, setGroups] = useState<FacultyTopicGroup[]>([])
  const [units, setUnits] = useState<FacultyTopicUnit[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<View>({ kind: 'list' })
  const [activeTab, setActiveTab] = useState<'notas' | 'deadlines' | 'temario' | 'calificaciones'>('notas')
  const [pdfPanel, setPdfPanel] = useState<{ storagePath: string; page: number } | null>(null)

  const pdfCtxValue = useMemo(
    () => ({ openPdf: (storagePath: string, page = 1) => setPdfPanel({ storagePath, page }) }),
    [],
  )

  useEffect(() => {
    Promise.all([
      getFacultySubject(subjectId),
      listFacultyNotes(subjectId),
      listFacultyDeadlines(subjectId),
      listFacultyTopics(subjectId),
      listFacultyTopicGroups(subjectId),
      listFacultyTopicUnits(subjectId),
    ])
      .then(([s, n, d, t, g, u]) => {
        setSubject(s)
        setNotes(n)
        setDeadlines(d)
        setTopics(t)
        setGroups(g)
        setUnits(u)
      })
      .catch(() => toast.error('Error al cargar materia'))
      .finally(() => setLoading(false))
  }, [subjectId])

  if (loading) {
    return (
      <PdfPanelContext.Provider value={pdfCtxValue}>
        <FacultyShell back={{ to: '/faculty', label: 'Materias' }} title="Cargando…">
          <p className="text-xs text-muted-foreground">Cargando…</p>
        </FacultyShell>
      </PdfPanelContext.Provider>
    )
  }

  if (!subject) {
    return (
      <PdfPanelContext.Provider value={pdfCtxValue}>
        <FacultyShell back={{ to: '/faculty', label: 'Materias' }} title="No encontrada">
          <p className="text-sm text-muted-foreground">Esta materia no existe.</p>
        </FacultyShell>
      </PdfPanelContext.Provider>
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
        setPdfPanel(null)
        toast.success(`"${note!.title}" eliminada`)
      } catch {
        toast.error('Error al eliminar')
      }
    }

    return (
      <PdfPanelContext.Provider value={pdfCtxValue}>
        <NoteSplitLayout pdfPanel={pdfPanel} onClosePdf={() => setPdfPanel(null)}>
          <NoteView
            note={note}
            subject={subject}
            onBack={() => { setView({ kind: 'list' }); setPdfPanel(null) }}
            onEdit={() => setView({ kind: 'editor', editNote: note })}
            onDelete={handleDeleteFromView}
            onBacklinkClick={(title) => {
              const target = notes.find((n) => n.title === title)
              if (target) setView({ kind: 'note', noteId: target.id })
            }}
          />
        </NoteSplitLayout>
      </PdfPanelContext.Provider>
    )
  }

  // ── Note editor ───────────────────────────────────────────────────────────

  if (view.kind === 'editor') {
    return (
      <PdfPanelContext.Provider value={pdfCtxValue}>
        <NoteSplitLayout pdfPanel={pdfPanel} onClosePdf={() => setPdfPanel(null)}>
          <FacultyNoteEditor
            subject={subject}
            topics={topics}
            groups={groups}
            units={units}
            initial={view.editNote}
            onSaved={(saved) => {
              setNotes((prev) => {
                const exists = prev.find((n) => n.id === saved.id)
                if (exists) return prev.map((n) => (n.id === saved.id ? saved : n))
                return [saved, ...prev]
              })
              setView({ kind: 'list' })
              setPdfPanel(null)
            }}
            onCancel={() => { setView({ kind: 'list' }); setPdfPanel(null) }}
          />
        </NoteSplitLayout>
      </PdfPanelContext.Provider>
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
            {(['notas', 'deadlines', 'temario', 'calificaciones'] as const).map((tab) => {
              const gradedCount = notes.filter((n) => n.grade != null).length
              const label =
                tab === 'notas' ? 'Notas' :
                tab === 'deadlines' ? 'Deadlines' :
                tab === 'temario' ? 'Temario' : 'Calificaciones'
              return (
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
                  {label}
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
                  {tab === 'calificaciones' && gradedCount > 0 && (
                    <span className="ml-1.5 inline-flex items-center justify-center size-4 rounded-full bg-secondary text-muted-foreground text-[9px] font-medium">
                      {gradedCount}
                    </span>
                  )}
                </button>
              )
            })}
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

          {activeTab === 'calificaciones' && <GradesTab notes={notes} />}

          {activeTab === 'temario' && (
            <TopicList
              subjectId={subjectId}
              groups={groups}
              units={units}
              topics={topics}
              onGroupCreated={(g) => setGroups((prev) => [...prev, g])}
              onGroupUpdated={(g) => setGroups((prev) => prev.map((x) => (x.id === g.id ? g : x)))}
              onGroupDeleted={(id) => {
                const unitIds = new Set(units.filter((u) => u.group_id === id).map((u) => u.id))
                setTopics((prev) =>
                  prev.map((t) => (unitIds.has(t.unit_id ?? '') ? { ...t, unit_id: null } : t)),
                )
                setUnits((prev) => prev.filter((u) => u.group_id !== id))
                setGroups((prev) => prev.filter((g) => g.id !== id))
              }}
              onUnitCreated={(u) => setUnits((prev) => [...prev, u])}
              onUnitUpdated={(u) => setUnits((prev) => prev.map((x) => (x.id === u.id ? u : x)))}
              onUnitDeleted={(id) => {
                setTopics((prev) =>
                  prev.map((t) => (t.unit_id === id ? { ...t, unit_id: null } : t)),
                )
                setUnits((prev) => prev.filter((u) => u.id !== id))
              }}
              onTopicCreated={(t) => setTopics((prev) => [...prev, t])}
              onTopicUpdated={(t) => setTopics((prev) => prev.map((x) => (x.id === t.id ? t : x)))}
              onTopicDeleted={(id) => setTopics((prev) => prev.filter((t) => t.id !== id))}
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

// ── Split layout helper ───────────────────────────────────────────────────────

function NoteSplitLayout({
  children,
  pdfPanel,
  onClosePdf,
}: {
  children: React.ReactNode
  pdfPanel: { storagePath: string; page: number } | null
  onClosePdf: () => void
}) {
  if (!pdfPanel) return <>{children}</>
  return (
    <div className="flex overflow-hidden" style={{ height: '100dvh' }}>
      <PanelGroup direction="horizontal">
        <Panel defaultSize={55} minSize={30}>
          <div className="h-full overflow-y-auto">{children}</div>
        </Panel>
        <PanelResizeHandle className="w-px bg-border/50 hover:bg-primary/40 transition-colors data-[resize-handle-active]:bg-primary/60 cursor-col-resize" />
        <Panel defaultSize={45} minSize={20}>
          <div className="h-full flex flex-col border-l border-border/60">
            <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/60 bg-background/80 shrink-0">
              <span className="text-[11px] text-muted-foreground font-medium">PDF</span>
              <button
                type="button"
                onClick={onClosePdf}
                className="flex items-center justify-center size-5 rounded text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                title="Cerrar PDF"
              >
                <X className="size-3.5" />
              </button>
            </div>
            <PdfViewer
              storagePath={pdfPanel.storagePath}
              initialPage={pdfPanel.page}
              className="flex-1 min-h-0"
            />
          </div>
        </Panel>
      </PanelGroup>
    </div>
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
