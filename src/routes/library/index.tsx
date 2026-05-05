import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { Library } from 'lucide-react'
import { toast } from 'sonner'
import { listBooks, citationCountPerBook } from '@/lib/library/queries'
import { BookGrid } from '@/components/library/book-grid'
import { BookUploadDialog } from '@/components/library/book-upload-dialog'
import { BookEditDialog } from '@/components/library/book-edit-dialog'
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

  useEffect(() => {
    load()
  }, [])

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

  function handleOpen(_book: LibraryBook) {
    // Phase 10c: PDF viewer — placeholder for now
    toast.info('Visor PDF — próximamente (Fase 10c)')
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
    </div>
  )
}
