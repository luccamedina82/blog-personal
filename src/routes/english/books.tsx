import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { Plus, Star, Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { BookForm } from '@/components/english/books/book-form'
import { BookDetail } from '@/components/english/books/book-detail'
import { listBooks, createBook, updateBook, deleteBook } from '@/lib/english/queries'
import type { Book } from '@/lib/english/types'
import type { BookPayload } from '@/components/english/books/book-form'

export const Route = createFileRoute('/english/books')({
  component: BooksPage,
})

type View = { kind: 'grid' } | { kind: 'detail'; bookId: string }

function Stars({ n }: { n: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={cn('size-3', i < n ? 'fill-primary text-primary' : 'text-muted-foreground/30')}
        />
      ))}
    </div>
  )
}

function BooksPage() {
  const [view, setView] = useState<View>({ kind: 'grid' })
  const [books, setBooks] = useState<Book[]>([])
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Book | null>(null)

  useEffect(() => {
    listBooks()
      .then(setBooks)
      .catch(() => toast.error('Failed to load books'))
  }, [])

  const currentBook =
    view.kind === 'detail' ? books.find((b) => b.id === view.bookId) : undefined

  async function handleCreate(values: BookPayload) {
    const book = await createBook(values)
    setBooks((prev) => [book, ...prev])
    toast.success('Book added')
  }

  async function handleUpdate(values: BookPayload) {
    if (!editing) return
    await updateBook(editing.id, values)
    setBooks((prev) => prev.map((b) => (b.id === editing.id ? { ...b, ...values } : b)))
    setEditing(null)
    toast.success('Book updated')
  }

  async function handleDelete(book: Book) {
    try {
      await deleteBook(book.id)
      setBooks((prev) => prev.filter((b) => b.id !== book.id))
      toast.success('Book deleted')
    } catch {
      toast.error('Failed to delete book')
    }
  }

  if (view.kind === 'detail' && currentBook) {
    return <BookDetail book={currentBook} onBack={() => setView({ kind: 'grid' })} />
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-1">Reading log</p>
          <h2 className="text-xl font-medium tracking-tight">Books</h2>
        </div>
        <Button
          size="sm"
          className="gap-1.5 shrink-0"
          onClick={() => { setEditing(null); setFormOpen(true) }}
        >
          <Plus className="size-3.5" />
          Add book
        </Button>
      </div>

      {books.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
          <p className="text-sm text-muted-foreground">No books yet.</p>
          <Button
            size="sm"
            variant="outline"
            onClick={() => { setEditing(null); setFormOpen(true) }}
          >
            Add your first book
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {books.map((book) => (
            <Card
              key={book.id}
              className="group relative bg-card/60 border-border/70 p-5 transition-all duration-200 hover:bg-card hover:border-border cursor-pointer"
              onClick={() => setView({ kind: 'detail', bookId: book.id })}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="text-sm font-medium truncate">{book.title}</h3>
                  {book.author && (
                    <p className="text-[11px] text-muted-foreground mt-0.5">{book.author}</p>
                  )}
                </div>
                {book.rating != null && book.rating > 0 && <Stars n={book.rating} />}
              </div>

              {book.summary && (
                <p className="mt-3 text-[13px] text-muted-foreground leading-relaxed line-clamp-3">
                  {book.summary}
                </p>
              )}

              {book.tags.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {book.tags.map((t) => (
                    <Badge
                      key={t}
                      variant="secondary"
                      className="rounded-md text-[10px] font-normal bg-secondary/50 border border-border/60"
                    >
                      {t}
                    </Badge>
                  ))}
                </div>
              )}

              {/* Edit / Delete — visible on hover, stop propagation so they don't open detail */}
              <div
                className="absolute top-3 right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => e.stopPropagation()}
              >
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7 text-muted-foreground/60 hover:text-foreground"
                  onClick={() => { setEditing(book); setFormOpen(true) }}
                >
                  <Pencil className="size-3.5" />
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7 text-muted-foreground/60 hover:text-destructive"
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete "{book.title}"?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Deletes the book and all its annotations. Cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => handleDelete(book)}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </Card>
          ))}
        </div>
      )}

      <BookForm
        open={formOpen}
        onOpenChange={(v) => { setFormOpen(v); if (!v) setEditing(null) }}
        initial={editing}
        onSubmit={editing ? handleUpdate : handleCreate}
      />
    </div>
  )
}
