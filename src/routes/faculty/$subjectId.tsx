import { createFileRoute, useNavigate } from '@tanstack/react-router'
import React, { useEffect, useState, useMemo, useRef } from 'react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Bookmark, ExternalLink, X, ArrowLeft, FileText, CalendarClock, ListTree, Star, Sparkles } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { PdfViewer } from '@/components/library/pdf-viewer'
import { PdfPanelContext } from '@/lib/faculty/pdf-panel-context'
import { BacklinkActionsContext } from '@/lib/shared/backlink-actions-context'
import { FacultyShell } from '@/components/faculty/faculty-shell'
import { NotesList } from '@/components/faculty/notes-list'
import { NoteView, NotePreviewPanel, BlockRenderer } from '@/components/faculty/note-view'
import { FacultyNoteEditor } from '@/components/faculty/note-editor'
import { DeadlineList } from '@/components/faculty/deadline-list'
import { TopicList } from '@/components/faculty/topic-list'
import { TopicListReadonly } from '@/components/faculty/topic-list-readonly'
import { GradesTab } from '@/components/faculty/grades-tab'
import { QuizTab } from '@/components/faculty/quiz/quiz-tab'
import {
  getFacultySubject,
  getFacultyNote,
  listFacultyNotes,
  listFacultyDeadlines,
  listFacultyTopics,
  listFacultyTopicGroups,
  listFacultyTopicUnits,
  listTopicCitationsForSubject,
  listAllNotesSummary,
  deleteFacultyNote,
  createFacultyNote,
  setDeadlineNoteLink,
  updateFacultyNote,
} from '@/lib/faculty/queries'
import { getDevLabPost, listAllDevLabPostsSummary } from '@/lib/devlab/queries'
import type { DevLabPost } from '@/lib/devlab/types'
import type {
  FacultySubject,
  FacultyNote,
  FacultyDeadline,
  FacultyTopic,
  FacultyTopicGroup,
  FacultyTopicUnit,
  FacultyTopicCitation,
} from '@/lib/faculty/types'

export const Route = createFileRoute('/faculty/$subjectId')({
  validateSearch: (search: Record<string, unknown>) => ({
    note: typeof search.note === 'string' ? search.note : undefined,
  }),
  component: SubjectDetail,
})

// Editor-only state; note viewing is URL-driven via search.note

type CitationCtx = {
  bookId: string
  bookTitle: string
  storagePath: string
  insertFn: (page: number) => void
}

type RightPanel =
  | { kind: 'pdf'; storagePath: string; page: number; returnTo?: RightPanel }
  | { kind: 'note-preview'; note: FacultyNote; returnTo?: RightPanel }
  | { kind: 'devlab-preview'; post: DevLabPost; returnTo?: RightPanel }
  | { kind: 'temario'; returnTo?: RightPanel }

// title → entry for cross-subject and devlab navigation
type NoteIndexEntry =
  | { id: string; type: 'faculty'; subject_id: string }
  | { id: string; type: 'devlab'; category_id: string | null }
type NoteIndex = Map<string, NoteIndexEntry>

function SubjectDetail() {
  const { subjectId } = Route.useParams()
  const search = Route.useSearch()
  const navigate = useNavigate({ from: '/faculty/$subjectId' })

  const [subject, setSubject] = useState<FacultySubject | null>(null)
  const [notes, setNotes] = useState<FacultyNote[]>([])
  const [deadlines, setDeadlines] = useState<FacultyDeadline[]>([])
  const [topics, setTopics] = useState<FacultyTopic[]>([])
  const [groups, setGroups] = useState<FacultyTopicGroup[]>([])
  const [units, setUnits] = useState<FacultyTopicUnit[]>([])
  const [citationsByTopic, setCitationsByTopic] = useState<Map<string, FacultyTopicCitation[]>>(new Map())
  const [noteIndex, setNoteIndex] = useState<NoteIndex>(new Map())
  const [loading, setLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [editNote, setEditNote] = useState<FacultyNote | undefined>()
  const [activeTab, setActiveTab] = useState<'notas' | 'deadlines' | 'temario' | 'calificaciones' | 'quiz'>('notas')
  const [rightPanel, setRightPanel] = useState<RightPanel | null>(null)
  const [citationCtx, setCitationCtx] = useState<CitationCtx | null>(null)
  const insertFnRef = useRef<((page: number) => void) | null>(null)

  const pdfCtxValue = useMemo(
    () => ({
      openPdf: (storagePath: string, page = 1) =>
        setRightPanel({ kind: 'pdf', storagePath, page }),
      startCitationBrowse: (
        book: { id: string; title: string; storage_path: string },
        insertFn: (page: number) => void,
      ) => {
        insertFnRef.current = insertFn
        setCitationCtx({ bookId: book.id, bookTitle: book.title, storagePath: book.storage_path, insertFn })
        setRightPanel({ kind: 'pdf', storagePath: book.storage_path, page: 1 })
      },
    }),
    [],
  )

  const linkedNoteIds = useMemo(
    () => new Set(deadlines.map((d) => d.note_id).filter((id): id is string => id !== null)),
    [deadlines],
  )

  function openNote(noteId: string) {
    navigate({ to: '/faculty/$subjectId', params: { subjectId }, search: { note: noteId } })
    setIsEditing(false)
    setEditNote(undefined)
  }

  function closeNote() {
    navigate({ to: '/faculty/$subjectId', params: { subjectId }, search: { note: undefined } })
  }

  function openEditor(note?: FacultyNote) {
    setIsEditing(true)
    setEditNote(note)
  }

  function closeEditor() {
    setIsEditing(false)
    setEditNote(undefined)
  }

  function closeRightPanel() {
    setRightPanel(null)
    setCitationCtx(null)
    insertFnRef.current = null
  }

  function handleCiteAtPage(page: number) {
    citationCtx?.insertFn(page)
    toast.success(`Cita insertada — pág. ${page}`)
  }

  function handleBacklinkNavigate(title: string) {
    // Same-subject note
    const local = notes.find((n) => n.title === title)
    if (local) {
      openNote(local.id)
      setRightPanel((prev) => (prev?.kind === 'note-preview' ? null : prev))
      return
    }
    const entry = noteIndex.get(title)
    if (!entry) { toast.error(`"${title}" no encontrado`); return }
    if (entry.type === 'devlab') {
      navigate({ to: '/devlab', search: { post: entry.id, category: entry.category_id ?? undefined } })
    } else {
      navigate({
        to: '/faculty/$subjectId',
        params: { subjectId: entry.subject_id },
        search: { note: entry.id },
      })
    }
  }

  async function handleBacklinkPreview(title: string) {
    // Same-subject note
    const local = notes.find((n) => n.title === title)
    if (local) {
      setCitationCtx(null)
      insertFnRef.current = null
      setRightPanel({ kind: 'note-preview', note: local })
      return
    }
    const entry = noteIndex.get(title)
    if (!entry) { toast.error(`"${title}" no encontrado`); return }
    setCitationCtx(null)
    insertFnRef.current = null
    try {
      if (entry.type === 'devlab') {
        const post = await getDevLabPost(entry.id)
        setRightPanel({ kind: 'devlab-preview', post })
      } else {
        const note = await getFacultyNote(entry.id)
        setRightPanel({ kind: 'note-preview', note })
      }
    } catch {
      toast.error('Error al cargar')
    }
  }

  function handleOpenFullNote(note: FacultyNote) {
    if (note.subject_id === subjectId) {
      openNote(note.id)
      setRightPanel(null)
    } else {
      // Cross-subject: navigate
      navigate({
        to: '/faculty/$subjectId',
        params: { subjectId: note.subject_id },
        search: { note: note.id },
      })
    }
  }

  useEffect(() => {
    Promise.all([
      getFacultySubject(subjectId),
      listFacultyNotes(subjectId),
      listFacultyDeadlines(subjectId),
      listFacultyTopics(subjectId),
      listFacultyTopicGroups(subjectId),
      listFacultyTopicUnits(subjectId),
      listAllNotesSummary(),
      listAllDevLabPostsSummary(),
    ])
      .then(([s, n, d, t, g, u, allNotes, allPosts]) => {
        setSubject(s)
        setNotes(n)
        setDeadlines(d)
        setTopics(t)
        setGroups(g)
        setUnits(u)
        const idx: NoteIndex = new Map()
        for (const an of allNotes) idx.set(an.title, { id: an.id, type: 'faculty', subject_id: an.subject_id })
        for (const ap of allPosts) idx.set(ap.title, { id: ap.id, type: 'devlab', category_id: ap.category_id })
        setNoteIndex(idx)
        // Load citations for all topics
        if (t.length > 0) {
          listTopicCitationsForSubject(t.map((x) => x.id))
            .then((citations) => {
              const map = new Map<string, FacultyTopicCitation[]>()
              for (const c of citations) {
                if (!map.has(c.topic_id)) map.set(c.topic_id, [])
                map.get(c.topic_id)!.push(c)
              }
              setCitationsByTopic(map)
            })
            .catch(() => {})
        }
      })
      .catch(() => toast.error('Error al cargar materia'))
      .finally(() => setLoading(false))
  }, [subjectId])


  function handleCitationAdded(topicId: string, citation: FacultyTopicCitation) {
    setCitationsByTopic((prev) => {
      const next = new Map(prev)
      next.set(topicId, [...(next.get(topicId) ?? []), citation])
      return next
    })
  }

  function handleCitationRemoved(topicId: string, citationId: string) {
    setCitationsByTopic((prev) => {
      const next = new Map(prev)
      next.set(topicId, (next.get(topicId) ?? []).filter((c) => c.id !== citationId))
      return next
    })
  }

  async function handleCitationClick(citation: FacultyTopicCitation, returnTo?: RightPanel) {
    if (citation.source_kind === 'library_book') {
      if (citation.source_storage_path) {
        setRightPanel({ kind: 'pdf', storagePath: citation.source_storage_path, page: citation.page ?? 1, returnTo })
      }
    } else if (citation.source_kind === 'faculty_note') {
      const local = notes.find((n) => n.id === citation.source_id)
      if (local) {
        setRightPanel({ kind: 'note-preview', note: local, returnTo })
      } else {
        try {
          const note = await getFacultyNote(citation.source_id)
          setRightPanel({ kind: 'note-preview', note, returnTo })
        } catch {
          toast.error('Error al cargar nota')
        }
      }
    } else {
      try {
        const post = await getDevLabPost(citation.source_id)
        setRightPanel({ kind: 'devlab-preview', post, returnTo })
      } catch {
        toast.error('Error al cargar post')
      }
    }
  }

  function handleCitationClickFromTemario(citation: FacultyTopicCitation) {
    handleCitationClick(citation, { kind: 'temario' })
  }

  async function handleAssociateNoteToTopic(noteId: string, topicId: string) {
    try {
      await updateFacultyNote(noteId, { topic_id: topicId })
      setNotes((prev) => prev.map((n) => (n.id === noteId ? { ...n, topic_id: topicId } : n)))
      if (editNote?.id === noteId) setEditNote({ ...editNote, topic_id: topicId })
      toast.success('Nota asociada al tema')
    } catch {
      toast.error('Error al asociar')
    }
  }

  function handleViewDeadlineNote(noteId: string) {
    openNote(noteId)
  }

  async function handleCreateDeadlineNote(d: FacultyDeadline) {
    try {
      const created = await createFacultyNote({
        subject_id: subjectId,
        topic_id: null,
        kind: 'resumen',
        title: `Devolución — ${d.title}`,
        date: new Date().toISOString().split('T')[0],
        blocks: [],
        tags: [],
        grade: null,
      })
      await setDeadlineNoteLink(d.id, created.id)
      setNotes((prev) => [created, ...prev])
      setDeadlines((prev) => prev.map((x) => (x.id === d.id ? { ...x, note_id: created.id } : x)))
      openEditor(created)
      toast.success('Nota creada')
    } catch {
      toast.error('Error al crear nota')
    }
  }

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

  // Derive current note from URL — makes browser back/forward work
  const viewingNote = !isEditing ? notes.find((n) => n.id === search.note) ?? null : null

  // ── Note view ─────────────────────────────────────────────────────────────

  if (viewingNote) {
    const note = viewingNote

    async function handleDeleteFromView() {
      try {
        await deleteFacultyNote(note.id)
        setNotes((prev) => prev.filter((n) => n.id !== note.id))
        closeNote()
        closeRightPanel()
        toast.success(`"${note.title}" eliminada`)
      } catch {
        toast.error('Error al eliminar')
      }
    }

    return (
      <PdfPanelContext.Provider value={pdfCtxValue}>
        <NoteSplitLayout
          rightPanel={rightPanel}
          onClosePanel={closeRightPanel}
          citationCtx={citationCtx}
          onCiteAtPage={handleCiteAtPage}
          onOpenFullNote={handleOpenFullNote}
          onOpenDevLabPost={() => {
            if (rightPanel?.kind !== 'devlab-preview') return
            navigate({
              to: '/devlab',
              search: { post: rightPanel.post.id, category: rightPanel.post.category_id ?? undefined },
            })
          }}
          onNoteBacklinkClick={handleBacklinkNavigate}
          onNoteBacklinkPreview={handleBacklinkPreview}
        >
          <NoteView
            note={note}
            subject={subject}
            onBack={() => { closeNote(); closeRightPanel() }}
            onEdit={() => openEditor(note)}
            onDelete={handleDeleteFromView}
            onBacklinkClick={handleBacklinkNavigate}
            onBacklinkPreview={handleBacklinkPreview}
          />
        </NoteSplitLayout>
      </PdfPanelContext.Provider>
    )
  }

  // ── Note editor ───────────────────────────────────────────────────────────

  if (isEditing) {
    return (
      <BacklinkActionsContext.Provider value={{ onNavigate: handleBacklinkNavigate, onPreview: handleBacklinkPreview }}>
      <PdfPanelContext.Provider value={pdfCtxValue}>
        <NoteSplitLayout
          rightPanel={rightPanel}
          onClosePanel={closeRightPanel}
          citationCtx={citationCtx}
          onCiteAtPage={handleCiteAtPage}
          onOpenFullNote={handleOpenFullNote}
          onOpenDevLabPost={() => {
            if (rightPanel?.kind !== 'devlab-preview') return
            navigate({
              to: '/devlab',
              search: { post: rightPanel.post.id, category: rightPanel.post.category_id ?? undefined },
            })
          }}
          onNoteBacklinkClick={handleBacklinkNavigate}
          onNoteBacklinkPreview={handleBacklinkPreview}
          onSetRightPanel={setRightPanel}
          temarioPanelProps={{
            topics,
            groups,
            units,
            citationsByTopic,
            notes,
            onCitationClick: handleCitationClickFromTemario,
            onNoteClick: (n) =>
              setRightPanel({ kind: 'note-preview', note: n, returnTo: { kind: 'temario' } }),
            currentTopicId: editNote?.topic_id ?? null,
            currentNoteId: editNote?.id ?? null,
            onAssociate: editNote
              ? (topicId: string) => handleAssociateNoteToTopic(editNote.id, topicId)
              : undefined,
          }}
        >
          <FacultyNoteEditor
            subject={subject}
            topics={topics}
            groups={groups}
            units={units}
            initial={editNote}
            onSaved={(saved) => {
              setNotes((prev) => {
                const exists = prev.find((n) => n.id === saved.id)
                if (exists) return prev.map((n) => (n.id === saved.id ? saved : n))
                return [saved, ...prev]
              })
              closeEditor()
              closeRightPanel()
            }}
            onCancel={() => { closeEditor(); closeRightPanel() }}
            onOpenTemario={() => setRightPanel({ kind: 'temario' })}
          />
        </NoteSplitLayout>
      </PdfPanelContext.Provider>
      </BacklinkActionsContext.Provider>
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
      accentColor={subject.color}
    >
      <div className="grid gap-8 lg:grid-cols-[1fr_220px]">
        <section>
          {/* Tabs — segmented pill with icons */}
          <div className="relative inline-flex items-center gap-0.5 p-1 mb-6 rounded-lg border border-border/60 bg-card/40 backdrop-blur-sm overflow-x-auto max-w-full">
            {([
              { value: 'notas', label: 'Notas', icon: FileText, count: notes.length, accent: 'bg-primary' },
              { value: 'deadlines', label: 'Deadlines', icon: CalendarClock, count: pendingDeadlines, accent: 'bg-orange-500' },
              { value: 'temario', label: 'Temario', icon: ListTree, count: topics.length, accent: 'bg-secondary text-muted-foreground' },
              { value: 'calificaciones', label: 'Calificaciones', icon: Star, count: deadlines.filter((d) => d.grade != null).length, accent: 'bg-secondary text-muted-foreground' },
              { value: 'quiz', label: 'Quiz', icon: Sparkles, count: 0, accent: 'bg-secondary text-muted-foreground' },
            ] as const).map((tab) => {
              const Icon = tab.icon
              const active = activeTab === tab.value
              return (
                <button
                  key={tab.value}
                  type="button"
                  onClick={() => setActiveTab(tab.value)}
                  className={cn(
                    'relative flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-all',
                    active
                      ? 'bg-primary/10 text-primary shadow-sm ring-1 ring-primary/20'
                      : 'text-muted-foreground hover:text-foreground hover:bg-secondary/40',
                  )}
                >
                  <Icon className={cn('size-3.5', active ? 'text-primary' : 'text-muted-foreground/70')} />
                  {tab.label}
                  {tab.count > 0 && (
                    <span className={cn(
                      'ml-0.5 inline-flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full text-[9px] font-semibold tabular-nums',
                      active
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-secondary text-muted-foreground',
                    )}>
                      {tab.count}
                    </span>
                  )}
                </button>
              )
            })}
          </div>

          {activeTab === 'notas' && (
            <NotesList
              notes={notes}
              onNew={() => openEditor()}
              onSelect={(note) => openNote(note.id)}
              onEdit={(note) => openEditor(note)}
              onDeleted={(id) => setNotes((prev) => prev.filter((n) => n.id !== id))}
              linkedToDeadlineIds={linkedNoteIds}
            />
          )}

          {activeTab === 'deadlines' && (
            <DeadlineList
              deadlines={deadlines}
              subjectId={subjectId}
              onCreated={(d) => setDeadlines((prev) => [...prev, d])}
              onUpdated={(d) => setDeadlines((prev) => prev.map((x) => (x.id === d.id ? d : x)))}
              onDeleted={(id) => setDeadlines((prev) => prev.filter((d) => d.id !== id))}
              onViewNote={handleViewDeadlineNote}
              onCreateNote={handleCreateDeadlineNote}
            />
          )}

          {activeTab === 'calificaciones' && <GradesTab subjectId={subjectId} />}

          {activeTab === 'quiz' && (
            <QuizTab subjectId={subjectId} notes={notes} />
          )}

          {activeTab === 'temario' && (
            <TopicList
              subjectId={subjectId}
              groups={groups}
              units={units}
              topics={topics}
              deadlines={deadlines}
              citationsByTopic={citationsByTopic}
              notes={notes}
              onNoteClick={(n) => openNote(n.id)}
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
              onCitationAdded={handleCitationAdded}
              onCitationRemoved={handleCitationRemoved}
              onCitationClick={handleCitationClick}
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
// Left panel always in same tree position → editor/noteview never remounts when
// right panel opens or closes, preserving unsaved state.

type TemarioPanelProps = {
  topics: FacultyTopic[]
  groups: FacultyTopicGroup[]
  units: FacultyTopicUnit[]
  citationsByTopic: Map<string, FacultyTopicCitation[]>
  notes?: FacultyNote[]
  onCitationClick: (citation: FacultyTopicCitation) => void
  onNoteClick?: (note: FacultyNote) => void
  currentTopicId?: string | null
  currentNoteId?: string | null
  onAssociate?: (topicId: string) => void
}

function NoteSplitLayout({
  children,
  rightPanel,
  onClosePanel,
  onSetRightPanel,
  citationCtx,
  onCiteAtPage,
  onOpenFullNote,
  onOpenDevLabPost,
  onNoteBacklinkClick,
  onNoteBacklinkPreview,
  temarioPanelProps,
}: {
  children: React.ReactNode
  rightPanel: RightPanel | null
  onClosePanel: () => void
  onSetRightPanel?: (panel: RightPanel | null) => void
  citationCtx: CitationCtx | null
  onCiteAtPage: (page: number) => void
  onOpenFullNote?: (note: FacultyNote) => void
  onOpenDevLabPost?: () => void
  onNoteBacklinkClick?: (title: string) => void
  onNoteBacklinkPreview?: (title: string) => void
  temarioPanelProps?: TemarioPanelProps
}) {
  const [currentPdfPage, setCurrentPdfPage] = useState(1)
  const pdfPanel = rightPanel?.kind === 'pdf' ? rightPanel : null
  const notePanel = rightPanel?.kind === 'note-preview' ? rightPanel : null
  const devlabPanel = rightPanel?.kind === 'devlab-preview' ? rightPanel : null
  const temarioPanel = rightPanel?.kind === 'temario' ? rightPanel : null
  const returnTo = rightPanel?.returnTo
  const handleBack = () => {
    if (returnTo && onSetRightPanel) onSetRightPanel(returnTo)
    else onClosePanel()
  }

  useEffect(() => {
    if (pdfPanel) setCurrentPdfPage(pdfPanel.page)
  }, [pdfPanel?.storagePath, pdfPanel?.page])

  return (
    <div className="flex overflow-hidden" style={{ height: '100dvh' }}>
      {/* Left — stable, never remounts regardless of right panel state */}
      <div
        className="h-full overflow-y-auto shrink-0"
        style={{ width: rightPanel ? '55%' : '100%' }}
      >
        {children}
      </div>
      {/* Right — appears/disappears without touching the left tree */}
      {rightPanel && (
        <div className="flex-1 h-full flex flex-col border-l border-border/60 min-w-0">
          {/* Panel header */}
          <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/60 bg-background/80 shrink-0 gap-2">
            {returnTo && (
              <button
                type="button"
                onClick={handleBack}
                className="flex items-center gap-1 h-6 px-1.5 rounded text-[11px] text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors shrink-0"
                title="Volver al temario"
              >
                <ArrowLeft className="size-3" />
              </button>
            )}
            {pdfPanel ? (
              <>
                <span className="text-[11px] text-muted-foreground font-medium">PDF</span>
                <div className="flex items-center gap-2 ml-auto">
                  {citationCtx && (
                    <button
                      type="button"
                      onClick={() => onCiteAtPage(currentPdfPage)}
                      className="flex items-center gap-1 h-6 px-2 rounded text-[11px] bg-primary/10 text-primary hover:bg-primary/20 transition-colors font-medium"
                      title="Insertar cita en la nota"
                    >
                      <Bookmark className="size-3" />
                      Citar pág. {currentPdfPage}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={onClosePanel}
                    className="flex items-center justify-center size-5 rounded text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                    title="Cerrar panel"
                  >
                    <X className="size-3.5" />
                  </button>
                </div>
              </>
            ) : notePanel ? (
              <>
                <span className="text-[11px] font-medium truncate max-w-[160px]">
                  {notePanel.note.title}
                </span>
                <div className="flex items-center gap-1.5 ml-auto shrink-0">
                  <button
                    type="button"
                    onClick={() => onOpenFullNote?.(notePanel.note)}
                    className="flex items-center justify-center size-5 rounded text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                    title="Abrir nota completa"
                  >
                    <ExternalLink className="size-3" />
                  </button>
                  <button
                    type="button"
                    onClick={onClosePanel}
                    className="flex items-center justify-center size-5 rounded text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                    title="Cerrar panel"
                  >
                    <X className="size-3.5" />
                  </button>
                </div>
              </>
            ) : devlabPanel ? (
              <>
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium shrink-0">DevLab</span>
                  <span className="text-[11px] font-medium truncate max-w-[140px]">{devlabPanel.post.title}</span>
                </div>
                <div className="flex items-center gap-1.5 ml-auto shrink-0">
                  <button
                    type="button"
                    onClick={onOpenDevLabPost}
                    className="flex items-center justify-center size-5 rounded text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                    title="Ir a la nota en DevLab"
                  >
                    <ExternalLink className="size-3" />
                  </button>
                  <button
                    type="button"
                    onClick={onClosePanel}
                    className="flex items-center justify-center size-5 rounded text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                    title="Cerrar panel"
                  >
                    <X className="size-3.5" />
                  </button>
                </div>
              </>
            ) : temarioPanel ? (
              <>
                <span className="text-[11px] text-muted-foreground font-medium">Temario</span>
                <button
                  type="button"
                  onClick={onClosePanel}
                  className="ml-auto flex items-center justify-center size-5 rounded text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                  title="Cerrar panel"
                >
                  <X className="size-3.5" />
                </button>
              </>
            ) : null}
          </div>

          {/* Panel body */}
          {pdfPanel ? (
            <PdfViewer
              storagePath={pdfPanel.storagePath}
              initialPage={pdfPanel.page}
              onPageChange={setCurrentPdfPage}
              className="flex-1 min-h-0"
            />
          ) : notePanel ? (
            <NotePreviewPanel
              note={notePanel.note}
              onBacklinkClick={onNoteBacklinkClick}
              onBacklinkPreview={onNoteBacklinkPreview}
            />
          ) : devlabPanel ? (
            <DevLabPreviewPanel post={devlabPanel.post} />
          ) : temarioPanel && temarioPanelProps ? (
            <div className="flex-1 overflow-y-auto min-h-0">
              <TopicListReadonly {...temarioPanelProps} />
            </div>
          ) : null}
        </div>
      )}
    </div>
  )
}

function DevLabPreviewPanel({ post }: { post: DevLabPost }) {
  return (
    <div className="flex-1 overflow-y-auto min-h-0">
      <article className="px-6 py-8">
        <header className="mb-8">
          <h1 className="text-2xl font-semibold tracking-tight text-balance leading-tight">
            {post.title}
          </h1>
          {post.excerpt && (
            <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{post.excerpt}</p>
          )}
          {post.tags.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-1.5">
              {post.tags.map((tag) => (
                <Badge
                  key={tag}
                  variant="secondary"
                  className="rounded-md text-[10px] font-mono font-normal bg-secondary/50 border border-border/60"
                >
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </header>

        <div className="h-px bg-border/40 mb-6" />

        <section className="space-y-8">
          {post.blocks.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin contenido.</p>
          ) : (
            post.blocks.map((block) => (
              <BlockRenderer
                key={block.id}
                block={block}
                noteTitle={post.title}
                noteId={post.id}
              />
            ))
          )}
        </section>
      </article>
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
