import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'
import { Library, Link2 } from 'lucide-react'
import { toast } from 'sonner'
import { listBooks, citationCountPerBook, setLastPageRead } from '@/lib/library/queries'
import { listTopicCitationsForBook } from '@/lib/faculty/queries'
import type { TopicCitationBacklink } from '@/lib/faculty/queries'
import { BookGrid } from '@/components/library/book-grid'
import { BookUploadDialog } from '@/components/library/book-upload-dialog'
import { BookEditDialog } from '@/components/library/book-edit-dialog'
import { PdfViewer } from '@/components/library/pdf-viewer'
import { ProgressSection } from '@/components/library/progress-section'
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from '@/components/ui/sheet'
import type { LibraryBook } from '@/lib/library/types'

export const Route = createFileRoute('/library/')({
  component: LibraryPage,
})

function LibraryPage() {
  'use no memo'
  const [books, setBooks] = useState<LibraryBook[]>([])
  const [citationCounts, setCitationCounts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [editing, setEditing] = useState<LibraryBook | null>(null)
  const [viewing, setViewing] = useState<LibraryBook | null>(null)
  const [topicCitations, setTopicCitations] = useState<TopicCitationBacklink[]>([])
  const pageSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastSavedPageRef = useRef<Map<string, number>>(new Map())

  useEffect(() => {
    load()
  }, [])

  useEffect(() => {
    if (!viewing) { setTopicCitations([]); return }
    listTopicCitationsForBook(viewing.id).then(setTopicCitations).catch(() => {})
  }, [viewing?.id])

  async function load() {
    setLoading(true)
    try {
      const bks = await listBooks()
      setBooks(bks)
      if (bks.length > 0) {
        const counts = await citationCountPerBook(bks.map((b) => b.id))
        setCitationCounts(counts)
      }
    } catch {
      toast.error('Error al cargar la biblioteca')
    } finally {
      setLoading(false)
    }
  }

  function handleCreated(book: LibraryBook) {
    setBooks((prev) => [book, ...prev])
  }

  function handleUpdated(book: LibraryBook) {
    setBooks((prev) => prev.map((b) => (b.id === book.id ? book : b)))
    setEditing(null)
    toast.success('Libro actualizado')
  }

  function handleDeleted(id: string) {
    setBooks((prev) => prev.filter((b) => b.id !== id))
    setCitationCounts((prev) => { const c = { ...prev }; delete c[id]; return c })
  }

  function handleOpen(book: LibraryBook) {
    setViewing(book)
  }

  function handlePageChange(bookId: string, page: number) {
    const book = books.find((b) => b.id === bookId)
    if (!book || book.progress_mode !== 'auto') return
    if (lastSavedPageRef.current.get(bookId) === page) return
    if (pageSaveTimer.current) clearTimeout(pageSaveTimer.current)
    pageSaveTimer.current = setTimeout(() => {
      lastSavedPageRef.current.set(bookId, page)
      setLastPageRead(bookId, page)
        .then(() => {
          setBooks((prev) => prev.map((b) => (b.id === bookId ? { ...b, last_page_read: page } : b)))
        })
        .catch(() => {})
    }, 1200)
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-6 p-6 lg:p-8">
        <div className="h-7 w-32 bg-secondary/60 rounded animate-pulse" />
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="rounded-lg bg-secondary/40 animate-pulse aspect-[2/3]" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 p-6 lg:p-8">
      {/* Header */}
      <div className="flex items-end gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center size-11 rounded-xl bg-primary/10 ring-1 ring-primary/20">
            <Library className="size-5 text-primary" />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Personal</p>
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">Biblioteca</h1>
          </div>
        </div>
        {books.length > 0 && (
          <div className="ml-auto flex items-center gap-4 text-[11px] tabular-nums">
            <LibraryStat label="Libros" value={String(books.length)} />
            <LibraryStat
              label="Leyendo"
              value={String(books.filter((b) => {
                const p = b.last_page_read; const t = b.page_count
                return p != null && t != null && p > 0 && p < t
              }).length)}
            />
            <LibraryStat
              label="Terminados"
              value={String(books.filter((b) => {
                const p = b.last_page_read; const t = b.page_count
                return p != null && t != null && p >= t
              }).length)}
            />
          </div>
        )}
      </div>

      <ProgressSection
        books={books}
        onUpdated={(b) => setBooks((prev) => prev.map((x) => (x.id === b.id ? b : x)))}
        onOpen={handleOpen}
      />

      <BookGrid
        books={books}
        citationCounts={citationCounts}
        onNew={() => setUploadOpen(true)}
        onEdit={setEditing}
        onDeleted={handleDeleted}
        onOpen={handleOpen}
        onUpdated={(b) => setBooks((prev) => prev.map((x) => (x.id === b.id ? b : x)))}
      />

      <BookUploadDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        onCreated={handleCreated}
      />

      {editing && (
        <BookEditDialog
          open={!!editing}
          onOpenChange={(v) => { if (!v) setEditing(null) }}
          book={editing}
          onUpdated={handleUpdated}
        />
      )}

      <Sheet open={!!viewing} onOpenChange={(v) => { if (!v) setViewing(null) }}>
        <SheetContent side="right" className="w-full sm:max-w-2xl p-0 flex flex-col">
          <SheetHeader className="px-4 pt-4 pb-0 pr-12 shrink-0">
            <div className="min-w-0">
              <SheetTitle className="text-base font-medium truncate">
                {viewing?.title}
              </SheetTitle>
              {viewing?.author && (
                <p className="text-xs text-muted-foreground mt-0.5 truncate">{viewing.author}</p>
              )}
            </div>
          </SheetHeader>
          {topicCitations.length > 0 && (
            <div className="px-4 py-2 border-y border-border/40 bg-secondary/10 shrink-0">
              <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground mb-1.5 flex items-center gap-1">
                <Link2 className="size-3" />
                Citado en temas
              </p>
              <div className="flex flex-wrap gap-1.5">
                {topicCitations.map((c) => (
                  <span
                    key={c.citation_id}
                    className="inline-flex items-center gap-1 text-[10px] text-muted-foreground bg-secondary rounded-full px-2 py-0.5"
                  >
                    <span className="font-medium text-foreground/70 max-w-[80px] truncate">{c.subject_name}</span>
                    <span className="text-muted-foreground/50">·</span>
                    <span className="max-w-[100px] truncate">{c.topic_title}</span>
                  </span>
                ))}
              </div>
            </div>
          )}
          <div className="flex-1 min-h-0 mt-3">
            {viewing && (
              <PdfViewer
                storagePath={viewing.storage_path}
                initialPage={viewing.last_page_read ?? 1}
                onPageChange={(p) => handlePageChange(viewing.id, p)}
                className="h-full"
              />
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}

function LibraryStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col items-end">
      <span className="text-lg font-semibold text-foreground tabular-nums leading-none">{value}</span>
      <span className="text-[9px] uppercase tracking-[0.16em] text-muted-foreground/70 mt-0.5">{label}</span>
    </div>
  )
}
