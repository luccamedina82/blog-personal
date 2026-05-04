import { useState, useEffect } from 'react'
import { ArrowLeft, Plus, Trash2, Star } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { SaveToAnkiButton } from '@/components/english/anki/save-to-anki-button'
import { AnnotationForm } from './annotation-form'
import { listBookAnnotations, createBookAnnotation, deleteBookAnnotation } from '@/lib/english/queries'
import type { Book, BookAnnotation } from '@/lib/english/types'
import type { AnnotationPayload } from './annotation-form'

const KIND_STYLE: Record<BookAnnotation['kind'], string> = {
  quote: 'border-primary/30 text-primary bg-primary/5',
  note: 'border-blue-400/30 text-blue-400 bg-blue-400/5',
  highlight: 'border-amber-400/30 text-amber-400 bg-amber-400/5',
}

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

interface BookDetailProps {
  book: Book
  onBack: () => void
}

export function BookDetail({ book, onBack }: BookDetailProps) {
  const [annotations, setAnnotations] = useState<BookAnnotation[]>([])
  const [formOpen, setFormOpen] = useState(false)

  useEffect(() => {
    listBookAnnotations(book.id)
      .then(setAnnotations)
      .catch(() => toast.error('Failed to load annotations'))
  }, [book.id])

  async function handleAdd(values: AnnotationPayload) {
    const ann = await createBookAnnotation({ book_id: book.id, ...values })
    setAnnotations((prev) => [...prev, ann])
    toast.success('Annotation added')
  }

  async function handleDelete(id: string) {
    try {
      await deleteBookAnnotation(id)
      setAnnotations((prev) => prev.filter((a) => a.id !== id))
      toast.success('Annotation deleted')
    } catch {
      toast.error('Failed to delete')
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="size-3.5" />
        Back
      </button>

      <div className="flex items-start gap-4 justify-between">
        <div className="space-y-1 min-w-0">
          <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Book</p>
          <h2 className="text-xl font-medium tracking-tight">{book.title}</h2>
          {book.author && <p className="text-sm text-muted-foreground">{book.author}</p>}
          {book.rating != null && book.rating > 0 && <Stars n={book.rating} />}
        </div>
        <Button size="sm" className="gap-1.5 shrink-0" onClick={() => setFormOpen(true)}>
          <Plus className="size-3.5" />
          Add annotation
        </Button>
      </div>

      {book.summary && (
        <p className="text-[13px] text-muted-foreground leading-relaxed border-l-2 border-border/60 pl-4">
          {book.summary}
        </p>
      )}

      {book.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {book.tags.map((t) => (
            <Badge
              key={t}
              variant="secondary"
              className="text-[10px] font-normal bg-secondary/50 border border-border/60"
            >
              {t}
            </Badge>
          ))}
        </div>
      )}

      <div className="space-y-2">
        <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          Annotations · {annotations.length}
        </p>

        {annotations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center gap-2">
            <p className="text-sm text-muted-foreground">No annotations yet.</p>
            <Button size="sm" variant="outline" onClick={() => setFormOpen(true)}>
              Add first annotation
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {annotations.map((ann) => (
              <div
                key={ann.id}
                className={cn(
                  'group relative rounded-lg border p-4 transition-colors',
                  KIND_STYLE[ann.kind],
                )}
              >
                <div className="flex items-start gap-2 justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[10px] uppercase tracking-wider font-medium opacity-60 capitalize">
                        {ann.kind}
                      </span>
                      {ann.page && (
                        <span className="text-[10px] text-muted-foreground">p.{ann.page}</span>
                      )}
                    </div>
                    <p
                      className={cn(
                        'text-sm leading-relaxed text-foreground',
                        ann.kind === 'quote' && 'italic',
                      )}
                    >
                      {ann.kind === 'quote' ? `"${ann.content}"` : ann.content}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    {ann.kind === 'quote' && (
                      <SaveToAnkiButton
                        front={ann.content}
                        back={`— ${book.title}${ann.page ? ` (p.${ann.page})` : ''}`}
                        sourceKind="book"
                        sourceRef={book.id}
                      />
                    )}
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
                          <AlertDialogTitle>Delete annotation?</AlertDialogTitle>
                          <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDelete(ann.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <AnnotationForm open={formOpen} onOpenChange={setFormOpen} onSubmit={handleAdd} />
    </div>
  )
}
