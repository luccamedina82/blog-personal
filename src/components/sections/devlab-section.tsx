import { useState, useEffect, useMemo, useRef } from 'react'
import React from 'react'
import { useNavigate } from '@tanstack/react-router'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { DevLabPostEditor } from '@/components/devlab-post-editor'
import { CategoryForm } from '@/components/devlab/category-form'
import { getDevLabIcon } from '@/components/devlab/icon-map'
import { PdfViewer } from '@/components/library/pdf-viewer'
import { PdfPanelContext } from '@/lib/shared/pdf-panel-context'
import { BacklinkSuggestionsContext } from '@/lib/shared/backlinks-context'
import { BacklinkActionsContext } from '@/lib/shared/backlink-actions-context'
import { BlockRenderer, NotePreviewPanel } from '@/components/faculty/note-view'
import { replaceCitationsForNote } from '@/lib/library/queries'
import {
  listAllNotesSummary, getFacultyNote,
} from '@/lib/faculty/queries'
import { toast } from 'sonner'
import {
  ArrowLeft, Clock, CalendarDays, ChevronRight, BookOpen,
  Plus, Pencil, Trash2, Loader2, Bookmark, X, ExternalLink, Sparkles,
} from 'lucide-react'
import { GenerateCardsModal } from '@/components/ai/generate-cards-modal'
import { blocksToPlainText } from '@/lib/ai/extract'
import {
  listDevLabCategories, createDevLabCategory, updateDevLabCategory, deleteDevLabCategory,
  listDevLabPosts, createDevLabPost, updateDevLabPost, deleteDevLabPost,
  getDevLabPost, listAllDevLabPostsSummary,
} from '@/lib/devlab/queries'
import type { DevLabCategory, DevLabPost, DevLabBlock, PostDraft } from '@/lib/devlab/types'
import type { FacultyNote } from '@/lib/faculty/types'

// ── Types ─────────────────────────────────────────────────────────────────────

type CitationCtx = {
  bookId: string
  bookTitle: string
  storagePath: string
  insertFn: (page: number) => void
}

type RightPanel =
  | { kind: 'pdf'; storagePath: string; page: number }
  | { kind: 'note-preview'; note: FacultyNote }
  | { kind: 'devlab-preview'; post: DevLabPost }

type NoteIndexEntry =
  | { id: string; type: 'faculty'; subject_id: string }
  | { id: string; type: 'devlab'; category_id: string | null }
type NoteIndex = Map<string, NoteIndexEntry>

// ── View state ────────────────────────────────────────────────────────────────

type View =
  | { kind: 'categories' }
  | { kind: 'posts'; categoryId: string }
  | { kind: 'post'; categoryId: string; postId: string }
  | { kind: 'editor'; categoryId: string; editPost?: DevLabPost }

// ── Category grid ─────────────────────────────────────────────────────────────

function CategoryGrid({
  categories,
  postCounts,
  onSelect,
  onEdit,
  onDelete,
  onNew,
}: {
  categories: DevLabCategory[]
  postCounts: Record<string, number>
  onSelect: (id: string) => void
  onEdit: (cat: DevLabCategory) => void
  onDelete: (cat: DevLabCategory) => void
  onNew: () => void
}) {
  return (
    <div className="px-6 lg:px-14 py-10 lg:py-16 max-w-5xl">
      <div className="mb-10 flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-2">Dev Lab</p>
          <h1 className="text-2xl font-semibold tracking-tight">Technical Notes</h1>
          <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
            A structured collection of notes on computer science fundamentals — compilers, networks,
            systems, and the stuff that matters at the bottom of the stack.
          </p>
        </div>
        <Button size="sm" className="gap-1.5 shrink-0" onClick={onNew}>
          <Plus className="size-3.5" />
          New category
        </Button>
      </div>

      {categories.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
          <p className="text-sm text-muted-foreground">No categories yet.</p>
          <Button size="sm" variant="outline" onClick={onNew}>Create your first category</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {categories.map((cat) => {
            const Icon = getDevLabIcon(cat.icon)
            const total = postCounts[cat.id] ?? 0
            return (
              <div
                key={cat.id}
                className={cn(
                  'group relative flex flex-col items-start gap-3 rounded-lg border border-border/70',
                  'bg-card/40 hover:bg-card/80 p-5 transition-all duration-200',
                  'hover:border-primary/30 hover:shadow-[0_0_0_1px_hsl(var(--primary)/0.15)]',
                )}
              >
                <button type="button" onClick={() => onSelect(cat.id)} className="absolute inset-0 rounded-lg" aria-label={cat.label} />
                <div className="flex w-full items-start justify-between relative z-10 pointer-events-none">
                  <span className="flex size-9 items-center justify-center rounded-md bg-secondary/60 border border-border/60">
                    <Icon className="size-4 text-primary" />
                  </span>
                  <ChevronRight className="size-4 text-muted-foreground/40 group-hover:text-primary transition-colors mt-1" />
                </div>
                <div className="relative z-10 pointer-events-none">
                  <p className="text-sm font-medium text-foreground">{cat.label}</p>
                  <p className="mt-1 text-xs text-muted-foreground leading-relaxed line-clamp-2">{cat.description}</p>
                </div>
                <div className="w-full flex items-center justify-between relative z-10">
                  <p className="text-[10px] text-muted-foreground/60 tabular-nums pointer-events-none">
                    {total} {total === 1 ? 'note' : 'notes'}
                  </p>
                  <div
                    className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button type="button" onClick={() => onEdit(cat)}
                      className="flex items-center justify-center size-6 rounded text-muted-foreground/50 hover:text-foreground hover:bg-secondary transition-colors">
                      <Pencil className="size-3" />
                    </button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <button type="button"
                          className="flex items-center justify-center size-6 rounded text-muted-foreground/50 hover:text-destructive hover:bg-secondary transition-colors">
                          <Trash2 className="size-3" />
                        </button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete "{cat.label}"?</AlertDialogTitle>
                          <AlertDialogDescription>
                            All posts in this category will become uncategorized. Cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => onDelete(cat)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Post list ─────────────────────────────────────────────────────────────────

function PostList({
  category,
  posts,
  loading,
  onSelect,
  onEdit,
  onDelete,
  onBack,
  onNewPost,
}: {
  category: DevLabCategory
  posts: DevLabPost[]
  loading: boolean
  onSelect: (postId: string) => void
  onEdit: (post: DevLabPost) => void
  onDelete: (post: DevLabPost) => void
  onBack: () => void
  onNewPost: () => void
}) {
  const Icon = getDevLabIcon(category.icon)
  return (
    <div className="px-6 lg:px-14 py-10 lg:py-16 max-w-3xl">
      <button type="button" onClick={onBack}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mb-8">
        <ArrowLeft className="size-3.5" />
        All categories
      </button>

      <div className="flex items-start justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-md bg-secondary/60 border border-border/60">
            <Icon className="size-5 text-primary" />
          </span>
          <div>
            <h2 className="text-xl font-semibold tracking-tight">{category.label}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">{category.description}</p>
          </div>
        </div>
        <button type="button" onClick={onNewPost}
          className="flex items-center gap-1.5 shrink-0 h-8 px-3 rounded-md border border-border/60 bg-card/40 hover:bg-card/80 hover:border-primary/30 text-xs text-muted-foreground hover:text-foreground transition-all">
          <Plus className="size-3.5" />
          New post
        </button>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Loading posts…
        </div>
      ) : posts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
          <p className="text-sm text-muted-foreground">No posts yet.</p>
          <Button size="sm" variant="outline" onClick={onNewPost}>Write the first post</Button>
        </div>
      ) : (
        <ul className="divide-y divide-border/50">
          {posts.map((post) => (
            <li key={post.id} className="group relative">
              <button type="button" onClick={() => onSelect(post.id)}
                className="w-full flex flex-col sm:flex-row sm:items-start gap-3 py-5 text-left hover:bg-secondary/20 -mx-3 px-3 rounded-md transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1.5">
                    {post.pinned && <span className="text-[9px] uppercase tracking-[0.18em] text-primary font-medium">Pinned</span>}
                    {post.tags.slice(0, 2).map((t) => (
                      <Badge key={t} variant="secondary" className="rounded-sm text-[9px] font-mono font-normal bg-secondary/40 border border-border/50 h-4 px-1.5">{t}</Badge>
                    ))}
                  </div>
                  <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors leading-snug">{post.title}</p>
                  {post.excerpt && <p className="mt-1 text-xs text-muted-foreground leading-relaxed line-clamp-2">{post.excerpt}</p>}
                  <div className="mt-2.5 flex items-center gap-3 text-[11px] text-muted-foreground/70">
                    <span className="flex items-center gap-1">
                      <CalendarDays className="size-3" />
                      {new Date(post.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                    {post.reading_time && (
                      <span className="flex items-center gap-1">
                        <Clock className="size-3" />
                        {post.reading_time}
                      </span>
                    )}
                  </div>
                </div>
                <ChevronRight className="size-4 text-muted-foreground/30 group-hover:text-primary transition-colors shrink-0 mt-0.5 sm:mt-1" />
              </button>
              <div
                className="absolute top-4 right-8 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => e.stopPropagation()}
              >
                <button type="button" onClick={() => onEdit(post)}
                  className="flex items-center justify-center size-6 rounded text-muted-foreground/50 hover:text-foreground hover:bg-secondary transition-colors">
                  <Pencil className="size-3" />
                </button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <button type="button"
                      className="flex items-center justify-center size-6 rounded text-muted-foreground/50 hover:text-destructive hover:bg-secondary transition-colors">
                      <Trash2 className="size-3" />
                    </button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete "{post.title}"?</AlertDialogTitle>
                      <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => onDelete(post)}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// ── Post view ─────────────────────────────────────────────────────────────────

function PostView({
  category,
  post,
  onBack,
  onEdit,
  onDelete,
  onBacklinkClick,
  onBacklinkPreview,
}: {
  category: DevLabCategory
  post: DevLabPost
  onBack: () => void
  onEdit: () => void
  onDelete: () => void
  onBacklinkClick?: (title: string) => void
  onBacklinkPreview?: (title: string) => void
}) {
  const [showCards, setShowCards] = useState(false)
  return (
    <div className="flex flex-col min-h-full">
      {/* Sticky nav bar */}
      <div className="sticky top-0 z-10 flex items-center justify-between px-6 lg:px-10 py-3 border-b border-border/50 bg-background/80 backdrop-blur-md">
        <button type="button" onClick={onBack}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="size-3.5" />
          {category.label}
        </button>
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => setShowCards(true)}
            className="flex items-center gap-1.5 h-7 px-2.5 rounded-md text-xs text-muted-foreground hover:text-foreground border border-border/60 hover:border-border transition-colors">
            <Sparkles className="size-3" />
            Cards
          </button>
          <button type="button" onClick={onEdit}
            className="flex items-center gap-1.5 h-7 px-2.5 rounded-md text-xs text-muted-foreground hover:text-foreground border border-border/60 hover:border-border transition-colors">
            <Pencil className="size-3" />
            Edit
          </button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button type="button"
                className="flex items-center gap-1.5 h-7 px-2.5 rounded-md text-xs text-muted-foreground hover:text-destructive border border-border/60 hover:border-destructive/40 transition-colors">
                <Trash2 className="size-3" />
                Delete
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete "{post.title}"?</AlertDialogTitle>
                <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={onDelete}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <article className="flex-1 px-6 lg:px-10 py-10 lg:py-14">
        <header className="mb-10 max-w-2xl">
          <div className="flex items-center gap-3 text-[11px] text-muted-foreground mb-5">
            <span className="text-primary uppercase tracking-[0.18em] font-medium">{category.label}</span>
            <span className="size-0.5 rounded-full bg-muted-foreground/40" />
            <span className="flex items-center gap-1">
              <CalendarDays className="size-3" />
              {new Date(post.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
            {post.reading_time && (
              <>
                <span className="size-0.5 rounded-full bg-muted-foreground/40" />
                <span className="flex items-center gap-1">
                  <Clock className="size-3" />
                  {post.reading_time} read
                </span>
              </>
            )}
          </div>
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-balance leading-tight">{post.title}</h1>
          {post.excerpt && (
            <p className="mt-4 text-base text-muted-foreground leading-relaxed text-pretty">{post.excerpt}</p>
          )}
          {post.tags.length > 0 && (
            <div className="mt-5 flex flex-wrap gap-1.5">
              {post.tags.map((t) => (
                <Badge key={t} variant="secondary" className="rounded-md text-[10px] font-mono font-normal bg-secondary/50 border border-border/60">{t}</Badge>
              ))}
            </div>
          )}
        </header>

        <div className="h-px bg-border/40 mb-5 max-w-2xl" />

        <section className="space-y-8">
          {post.blocks.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-4 py-20 text-center max-w-2xl">
              <BookOpen className="size-8 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">No content yet.</p>
            </div>
          ) : (
            post.blocks.map((block) => (
              <BlockRenderer
                key={block.id}
                block={block}
                noteTitle={post.title}
                noteId={post.id}
                onBacklinkClick={onBacklinkClick}
                onBacklinkPreview={onBacklinkPreview}
              />
            ))
          )}
        </section>
      </article>

      <GenerateCardsModal
        open={showCards}
        onClose={() => setShowCards(false)}
        content={blocksToPlainText(post.title, post.blocks ?? [])}
        sourceKind="devlab"
        sourceRef={post.id}
      />
    </div>
  )
}

// ── Split layout ──────────────────────────────────────────────────────────────

function PostSplitLayout({
  children,
  rightPanel,
  onClosePanel,
  citationCtx,
  onCiteAtPage,
  onBacklinkClick,
  onBacklinkPreview,
}: {
  children: React.ReactNode
  rightPanel: RightPanel | null
  onClosePanel: () => void
  citationCtx: CitationCtx | null
  onCiteAtPage: (page: number) => void
  onBacklinkClick?: (title: string) => void
  onBacklinkPreview?: (title: string) => void
}) {
  const [currentPdfPage, setCurrentPdfPage] = useState(1)
  const pdfPanel = rightPanel?.kind === 'pdf' ? rightPanel : null
  const notePanel = rightPanel?.kind === 'note-preview' ? rightPanel : null
  const devlabPanel = rightPanel?.kind === 'devlab-preview' ? rightPanel : null

  useEffect(() => {
    if (pdfPanel) setCurrentPdfPage(pdfPanel.page)
  }, [pdfPanel?.storagePath, pdfPanel?.page])

  return (
    <div className="flex overflow-hidden" style={{ height: '100dvh' }}>
      <div
        className="h-full overflow-y-auto shrink-0"
        style={{ width: rightPanel ? '55%' : '100%' }}
      >
        {children}
      </div>
      {rightPanel && (
        <div className="flex-1 h-full flex flex-col border-l border-border/60 min-w-0">
          <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/60 bg-background/80 shrink-0 gap-2">
            {pdfPanel ? (
              <>
                <span className="text-[11px] text-muted-foreground font-medium">PDF</span>
                <div className="flex items-center gap-2 ml-auto">
                  {citationCtx && (
                    <button
                      type="button"
                      onClick={() => onCiteAtPage(currentPdfPage)}
                      className="flex items-center gap-1 h-6 px-2 rounded text-[11px] bg-primary/10 text-primary hover:bg-primary/20 transition-colors font-medium"
                      title="Insertar cita en el post"
                    >
                      <Bookmark className="size-3" />
                      Citar pág. {currentPdfPage}
                    </button>
                  )}
                  <button type="button" onClick={onClosePanel} className="flex items-center justify-center size-5 rounded text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
                    <X className="size-3.5" />
                  </button>
                </div>
              </>
            ) : notePanel ? (
              <>
                <span className="text-[11px] font-medium truncate max-w-[160px]">{notePanel.note.title}</span>
                <button type="button" onClick={onClosePanel} className="ml-auto flex items-center justify-center size-5 rounded text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
                  <X className="size-3.5" />
                </button>
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
                    onClick={() => onBacklinkClick?.(devlabPanel.post.title)}
                    className="flex items-center justify-center size-5 rounded text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                    title="Ir al post"
                  >
                    <ExternalLink className="size-3" />
                  </button>
                  <button type="button" onClick={onClosePanel} className="flex items-center justify-center size-5 rounded text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
                    <X className="size-3.5" />
                  </button>
                </div>
              </>
            ) : null}
          </div>

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
              onBacklinkClick={onBacklinkClick}
              onBacklinkPreview={onBacklinkPreview}
            />
          ) : devlabPanel ? (
            <DevLabPreviewPanel post={devlabPanel.post} onBacklinkClick={onBacklinkClick} onBacklinkPreview={onBacklinkPreview} />
          ) : null}
        </div>
      )}
    </div>
  )
}

function DevLabPreviewPanel({
  post,
  onBacklinkClick,
  onBacklinkPreview,
}: {
  post: DevLabPost
  onBacklinkClick?: (title: string) => void
  onBacklinkPreview?: (title: string) => void
}) {
  return (
    <div className="flex-1 overflow-y-auto min-h-0">
      <article className="px-6 py-8">
        <header className="mb-6">
          <h1 className="text-xl font-semibold tracking-tight text-balance leading-tight">{post.title}</h1>
          {post.excerpt && <p className="mt-2 text-sm text-muted-foreground">{post.excerpt}</p>}
          {post.tags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {post.tags.map((t) => (
                <Badge key={t} variant="secondary" className="rounded-md text-[10px] font-mono font-normal bg-secondary/50 border border-border/60">{t}</Badge>
              ))}
            </div>
          )}
        </header>
        <div className="h-px bg-border/40 mb-5" />
        <section className="space-y-6">
          {post.blocks.length === 0
            ? <p className="text-sm text-muted-foreground">Sin contenido.</p>
            : post.blocks.map((block) => (
                <BlockRenderer
                  key={block.id}
                  block={block}
                  noteTitle={post.title}
                  noteId={post.id}
                  onBacklinkClick={onBacklinkClick}
                  onBacklinkPreview={onBacklinkPreview}
                />
              ))
          }
        </section>
      </article>
    </div>
  )
}

// ── Root component ────────────────────────────────────────────────────────────

export function DevLabSection({ initialPostId, initialCategoryId }: { initialPostId?: string; initialCategoryId?: string } = {}) {
  const navigate = useNavigate()
  const [view, setView] = useState<View>({ kind: 'categories' })
  const [categories, setCategories] = useState<DevLabCategory[]>([])
  const [posts, setPosts] = useState<DevLabPost[]>([])
  const [postCounts, setPostCounts] = useState<Record<string, number>>({})
  const [loadingCats, setLoadingCats] = useState(true)
  const [loadingPosts, setLoadingPosts] = useState(false)
  const [catFormOpen, setCatFormOpen] = useState(false)
  const [editingCat, setEditingCat] = useState<DevLabCategory | null>(null)
  const [rightPanel, setRightPanel] = useState<RightPanel | null>(null)
  const [citationCtx, setCitationCtx] = useState<CitationCtx | null>(null)
  const insertFnRef = useRef<((page: number) => void) | null>(null)
  const [noteIndex, setNoteIndex] = useState<NoteIndex>(new Map())
  const [backlinkSuggestions, setBacklinkSuggestions] = useState<Array<{ id: string; title: string; hint?: string }>>([])
  const pdfCtxValue = useMemo(
    () => ({
      openPdf: (storagePath: string, page = 1) => setRightPanel({ kind: 'pdf', storagePath, page }),
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

  function closeRightPanel() {
    setRightPanel(null)
    setCitationCtx(null)
    insertFnRef.current = null
  }

  // Keep legacy alias used inside handlers
  const closePdfAndCitation = closeRightPanel

  function goToView(newView: View) {
    setView(newView)
    if (newView.kind === 'categories') {
      navigate({ to: '/devlab', search: { post: undefined, category: undefined } })
    } else if (newView.kind === 'posts') {
      navigate({ to: '/devlab', search: { post: undefined, category: newView.categoryId } })
    } else if (newView.kind === 'post') {
      navigate({ to: '/devlab', search: { category: newView.categoryId, post: newView.postId } })
    }
    // editor: no URL change (transient)
  }

  function handleCiteAtPage(page: number) {
    citationCtx?.insertFn(page)
    toast.success(`Cita insertada — pág. ${page}`)
  }

  // ── Backlink support ──────────────────────────────────────────────────────

  function handleBacklinkNavigate(title: string) {
    const entry = noteIndex.get(title)
    if (!entry) { toast.error(`"${title}" no encontrado`); return }
    if (entry.type === 'devlab') {
      if (entry.category_id) goToView({ kind: 'post', categoryId: entry.category_id, postId: entry.id })
    } else {
      navigate({
        to: '/faculty/$subjectId',
        params: { subjectId: entry.subject_id },
        search: { note: entry.id },
      })
    }
  }

  async function handleBacklinkPreview(title: string) {
    const entry = noteIndex.get(title)
    if (!entry) { toast.error(`"${title}" no encontrado`); return }
    try {
      if (entry.type === 'devlab') {
        const post = await getDevLabPost(entry.id)
        setRightPanel({ kind: 'devlab-preview', post })
        setCitationCtx(null)
      } else {
        const note = await getFacultyNote(entry.id)
        setRightPanel({ kind: 'note-preview', note })
        setCitationCtx(null)
      }
    } catch {
      toast.error('Error al cargar')
    }
  }

  const backlinkActionsValue = useMemo(
    () => ({ onNavigate: handleBacklinkNavigate, onPreview: handleBacklinkPreview }),
    [noteIndex],
  )

  function syncCitations(postId: string, blocks: DevLabBlock[]) {
    const citations: { book_id: string; page: number }[] = []
    const parser = new DOMParser()
    for (const block of blocks) {
      if (block.kind !== 'text') continue
      const doc = parser.parseFromString(block.html, 'text/html')
      doc.querySelectorAll<HTMLElement>('[data-bc]').forEach((el) => {
        const bookId = el.dataset.bookId
        const page = Number(el.dataset.page ?? 1)
        if (bookId) citations.push({ book_id: bookId, page })
      })
    }
    replaceCitationsForNote('devlab_post', postId, citations).catch((err) => {
      console.error('[citations] sync error:', err)
    })
  }

  // Load backlink suggestions + build note index on mount
  useEffect(() => {
    Promise.all([listAllNotesSummary(), listAllDevLabPostsSummary()])
      .then(([notes, posts]) => {
        const idx: NoteIndex = new Map()
        const noteSugs = notes.map((n) => {
          idx.set(n.title, { id: n.id, type: 'faculty', subject_id: n.subject_id })
          return { id: n.id, title: n.title, hint: n.subject_name || n.kind }
        })
        const postSugs = posts.map((p) => {
          idx.set(p.title, { id: p.id, type: 'devlab', category_id: p.category_id })
          return { id: p.id, title: p.title, hint: p.category_label ? `DevLab · ${p.category_label}` : 'DevLab' }
        })
        setNoteIndex(idx)
        setBacklinkSuggestions([...noteSugs, ...postSugs])
      })
      .catch(() => {})
  }, [])

  // Load categories on mount
  useEffect(() => {
    listDevLabCategories()
      .then(async (cats) => {
        setCategories(cats)
        // Load post counts in parallel
        const counts = await Promise.all(
          cats.map((c) => listDevLabPosts(c.id).then((p) => ({ id: c.id, count: p.length }))),
        )
        setPostCounts(Object.fromEntries(counts.map(({ id, count }) => [id, count])))
      })
      .catch(() => toast.error('Failed to load categories'))
      .finally(() => setLoadingCats(false))
  }, [])

  // Load posts when entering a category
  useEffect(() => {
    if (view.kind !== 'posts') return
    setLoadingPosts(true)
    listDevLabPosts(view.categoryId)
      .then(setPosts)
      .catch(() => toast.error('Failed to load posts'))
      .finally(() => setLoadingPosts(false))
  }, [view.kind === 'posts' ? view.categoryId : null])

  // Sync URL params → view state (handles deep links and browser back/forward)
  useEffect(() => {
    if (initialPostId && initialCategoryId) {
      if (view.kind === 'post' && view.postId === initialPostId && view.categoryId === initialCategoryId) return
      setLoadingPosts(true)
      listDevLabPosts(initialCategoryId)
        .then((categoryPosts) => {
          setPosts(categoryPosts)
          setView({ kind: 'post', categoryId: initialCategoryId, postId: initialPostId })
        })
        .catch(() => {})
        .finally(() => setLoadingPosts(false))
    } else if (initialCategoryId && !initialPostId) {
      if (view.kind === 'editor') return
      if (view.kind === 'posts' && view.categoryId === initialCategoryId) return
      setView({ kind: 'posts', categoryId: initialCategoryId })
    } else if (!initialCategoryId && !initialPostId) {
      if (view.kind === 'editor') return
      if (view.kind === 'categories') return
      setView({ kind: 'categories' })
    }
  }, [initialPostId, initialCategoryId])

  // ── Category CRUD ──────────────────────────────────────────────────────────

  async function handleCreateCategory(payload: Parameters<typeof createDevLabCategory>[0]) {
    try {
      const cat = await createDevLabCategory(payload)
      setCategories((prev) => [...prev, cat])
      setPostCounts((prev) => ({ ...prev, [cat.id]: 0 }))
      toast.success('Category created')
    } catch {
      toast.error('Failed to create category')
      throw new Error('create failed')
    }
  }

  async function handleUpdateCategory(payload: Parameters<typeof updateDevLabCategory>[1]) {
    if (!editingCat) return
    try {
      await updateDevLabCategory(editingCat.id, payload)
      setCategories((prev) => prev.map((c) => (c.id === editingCat.id ? { ...c, ...payload } : c)))
      setEditingCat(null)
      toast.success('Category updated')
    } catch {
      toast.error('Failed to update category')
      throw new Error('update failed')
    }
  }

  async function handleDeleteCategory(cat: DevLabCategory) {
    try {
      await deleteDevLabCategory(cat.id)
      setCategories((prev) => prev.filter((c) => c.id !== cat.id))
      toast.success('Category deleted')
    } catch {
      toast.error('Failed to delete category')
    }
  }

  // ── Post CRUD ──────────────────────────────────────────────────────────────

  function computeReadingTime(blocks: DevLabBlock[]): string {
    const words = blocks.reduce((acc, b) => {
      if (b.kind === 'text') return acc + b.html.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length
      if (b.kind === 'code') return acc + b.code.split('\n').length * 2
      return acc + 20
    }, 0)
    return `${Math.max(1, Math.round(words / 200))} min`
  }

  async function handleSavePost(draft: PostDraft) {
    const categoryId = view.kind === 'editor' ? view.categoryId : null
    const payload = {
      category_id: draft.category_id,
      title: draft.title,
      excerpt: draft.excerpt || null,
      blocks: draft.blocks,
      tags: draft.tags,
      pinned: false,
      reading_time: computeReadingTime(draft.blocks),
    }

    if (view.kind === 'editor' && view.editPost) {
      // Update
      await updateDevLabPost(view.editPost.id, payload)
      setPosts((prev) => prev.map((p) => p.id === view.editPost!.id ? { ...p, ...payload } : p))
      syncCitations(view.editPost.id, draft.blocks)
      toast.success('Post updated')
      goToView({ kind: 'posts', categoryId: categoryId! })
      closePdfAndCitation()
    } else {
      // Create
      const post = await createDevLabPost(payload)
      setPosts((prev) => [post, ...prev])
      setPostCounts((prev) => ({ ...prev, [categoryId!]: (prev[categoryId!] ?? 0) + 1 }))
      syncCitations(post.id, draft.blocks)
      toast.success('Post published')
      goToView({ kind: 'posts', categoryId: categoryId! })
      closePdfAndCitation()
    }
  }

  async function handleDeletePost(post: DevLabPost) {
    try {
      await deleteDevLabPost(post.id)
      setPosts((prev) => prev.filter((p) => p.id !== post.id))
      const catId = view.kind === 'post' ? view.categoryId : (view.kind === 'posts' ? view.categoryId : null)
      if (catId) setPostCounts((prev) => ({ ...prev, [catId]: Math.max(0, (prev[catId] ?? 1) - 1) }))
      toast.success('Post deleted')
      if (view.kind === 'post') { goToView({ kind: 'posts', categoryId: view.categoryId }); closePdfAndCitation() }
    } catch {
      toast.error('Failed to delete post')
    }
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  function getCat(id: string) {
    return categories.find((c) => c.id === id)
  }

  function getPost(id: string) {
    return posts.find((p) => p.id === id)
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  const catForView = view.kind === 'posts' || view.kind === 'post' || view.kind === 'editor'
    ? getCat(view.categoryId)
    : undefined
  const postForView = view.kind === 'post' ? getPost(view.postId) : undefined

  return (
    <div className="min-h-screen">
      {loadingCats && (
        <div className="flex items-center gap-2 px-6 py-16 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Loading…
        </div>
      )}

      {!loadingCats && view.kind === 'categories' && (
        <CategoryGrid
          categories={categories}
          postCounts={postCounts}
          onSelect={(id) => goToView({ kind: 'posts', categoryId: id })}
          onEdit={(cat) => { setEditingCat(cat); setCatFormOpen(true) }}
          onDelete={handleDeleteCategory}
          onNew={() => { setEditingCat(null); setCatFormOpen(true) }}
        />
      )}

      {!loadingCats && view.kind === 'posts' && catForView && (
        <PostList
          category={catForView}
          posts={posts}
          loading={loadingPosts}
          onSelect={(postId) => goToView({ kind: 'post', categoryId: view.categoryId, postId })}
          onEdit={(post) => setView({ kind: 'editor', categoryId: view.categoryId, editPost: post })}
          onDelete={handleDeletePost}
          onBack={() => goToView({ kind: 'categories' })}
          onNewPost={() => setView({ kind: 'editor', categoryId: view.categoryId })}
        />
      )}

      {!loadingCats && view.kind === 'post' && catForView && postForView && (
        <BacklinkSuggestionsContext.Provider value={backlinkSuggestions}>
          <BacklinkActionsContext.Provider value={backlinkActionsValue}>
            <PdfPanelContext.Provider value={pdfCtxValue}>
              <PostSplitLayout
                rightPanel={rightPanel}
                onClosePanel={closeRightPanel}
                citationCtx={citationCtx}
                onCiteAtPage={handleCiteAtPage}
                onBacklinkClick={handleBacklinkNavigate}
                onBacklinkPreview={handleBacklinkPreview}
              >
                <PostView
                  category={catForView}
                  post={postForView}
                  onBack={() => { goToView({ kind: 'posts', categoryId: view.categoryId }); closeRightPanel() }}
                  onEdit={() => setView({ kind: 'editor', categoryId: view.categoryId, editPost: postForView })}
                  onDelete={() => handleDeletePost(postForView)}
                  onBacklinkClick={handleBacklinkNavigate}
                  onBacklinkPreview={handleBacklinkPreview}
                />
              </PostSplitLayout>
            </PdfPanelContext.Provider>
          </BacklinkActionsContext.Provider>
        </BacklinkSuggestionsContext.Provider>
      )}

      {!loadingCats && view.kind === 'editor' && catForView && (
        <BacklinkSuggestionsContext.Provider value={backlinkSuggestions}>
          <BacklinkActionsContext.Provider value={backlinkActionsValue}>
            <PdfPanelContext.Provider value={pdfCtxValue}>
              <PostSplitLayout
                rightPanel={rightPanel}
                onClosePanel={closeRightPanel}
                citationCtx={citationCtx}
                onCiteAtPage={handleCiteAtPage}
                onBacklinkClick={handleBacklinkNavigate}
                onBacklinkPreview={handleBacklinkPreview}
              >
                <DevLabPostEditor
                  categoryLabel={catForView.label}
                  categoryId={view.categoryId}
                  initial={view.editPost}
                  onSave={handleSavePost}
                  onCancel={() => { goToView({ kind: 'posts', categoryId: view.categoryId }); closeRightPanel() }}
                />
              </PostSplitLayout>
            </PdfPanelContext.Provider>
          </BacklinkActionsContext.Provider>
        </BacklinkSuggestionsContext.Provider>
      )}

      {/* Always mounted — never remounts when view changes, Dialog opens reliably */}
      <CategoryForm
        open={catFormOpen}
        onOpenChange={(v) => { setCatFormOpen(v); if (!v) setEditingCat(null) }}
        initial={editingCat}
        onSubmit={editingCat ? handleUpdateCategory : handleCreateCategory}
      />
    </div>
  )
}
