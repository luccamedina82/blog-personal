import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { Library, Link2, X } from 'lucide-react'
import { toast } from 'sonner'
import { listBooks, citationCountPerBook } from '@/lib/library/queries'
import { listTopicCitationsForBook } from '@/lib/faculty/queries'
import type { TopicCitationBacklink } from '@/lib/faculty/queries'
import { BookGrid } from '@/components/library/book-grid'
import { BookUploadDialog } from '@/components/library/book-upload-dialog'
import { BookEditDialog } from '@/components/library/book-edit-dialog'
import { PdfViewer } from '@/components/library/pdf-viewer'
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
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
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center size-9 rounded-lg bg-secondary/60">
          <Library className="size-4 text-muted-foreground" />
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Personal</p>
          <h1 className="text-xl font-medium tracking-tight">Biblioteca</h1>
        </div>
        <div className="ml-auto text-[11px] text-muted-foreground/60 tabular-nums">
          {books.length} {books.length === 1 ? 'libro' : 'libros'}
        </div>
      </div>

      <BookGrid
        books={books}
        citationCounts={citationCounts}
        onNew={() => setUploadOpen(true)}
        onEdit={setEditing}
        onDeleted={handleDeleted}
        onOpen={handleOpen}
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
          <SheetHeader className="px-4 pt-4 pb-0 shrink-0">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <SheetTitle className="text-base font-medium truncate">
                  {viewing?.title}
                </SheetTitle>
                {viewing?.author && (
                  <p className="text-xs text-muted-foreground mt-0.5">{viewing.author}</p>
                )}
              </div>
              <Button
                variant="ghost" size="icon" className="size-7 shrink-0"
                onClick={() => setViewing(null)}
              >
                <X className="size-4" />
              </Button>
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
                className="h-full"
              />
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
