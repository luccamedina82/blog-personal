import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, BookOpen, FileText } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { deleteBook, getSignedUrl } from '@/lib/library/queries'
import type { LibraryBook, LibraryModuleTag } from '@/lib/library/types'
import { supabase } from '@/lib/supabase'

const MODULE_FILTERS: Array<{ value: LibraryModuleTag | 'all'; label: string }> = [
  { value: 'all', label: 'Todos' },
  { value: 'faculty', label: 'Faculty' },
  { value: 'devlab', label: 'Dev Lab' },
  { value: 'english', label: 'English' },
]

const MODULE_BADGE: Record<LibraryModuleTag, string> = {
  faculty: 'bg-blue-500/10 text-blue-600 border-blue-200 dark:border-blue-800',
  devlab: 'bg-violet-500/10 text-violet-600 border-violet-200 dark:border-violet-800',
  english: 'bg-green-500/10 text-green-600 border-green-200 dark:border-green-800',
}

function CoverImage({ coverPath, title }: { coverPath: string; title: string }) {
  'use no memo'
  const [src, setSrc] = useState<string | null>(null)

  useEffect(() => {
    getSignedUrl(coverPath).then(setSrc).catch(() => {})
  }, [coverPath])

  if (!src) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-secondary/60 animate-pulse">
        <FileText className="size-6 text-muted-foreground/30" />
      </div>
    )
  }
  return <img src={src} alt={title} className="w-full h-full object-cover" />
}

type Props = {
  books: LibraryBook[]
  citationCounts: Record<string, number>
  onNew: () => void
  onEdit: (book: LibraryBook) => void
  onDeleted: (id: string) => void
  onOpen: (book: LibraryBook) => void
}

export function BookGrid({ books, citationCounts, onNew, onEdit, onDeleted, onOpen }: Props) {
  'use no memo'
  const [filter, setFilter] = useState<LibraryModuleTag | 'all'>('all')
  const [search, setSearch] = useState('')

  const visible = books.filter((b) => {
    if (filter !== 'all' && !b.module_tags.includes(filter)) return false
    if (search) {
      const q = search.toLowerCase()
      return b.title.toLowerCase().includes(q) || (b.author ?? '').toLowerCase().includes(q)
    }
    return true
  })

  async function handleDelete(book: LibraryBook) {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const uid = session?.user?.id
      if (uid) {
        await Promise.allSettled([
          supabase.storage.from('media').remove([book.storage_path]),
          book.cover_path
            ? supabase.storage.from('media').remove([book.cover_path])
            : Promise.resolve(),
        ])
      }
      await deleteBook(book.id)
      onDeleted(book.id)
      toast.success(`"${book.title}" eliminado`)
    } catch {
      toast.error('Error al eliminar')
    }
  }

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1 flex-wrap">
          {MODULE_FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setFilter(f.value)}
              className={cn(
                'h-7 px-3 rounded-full text-xs transition-colors',
                filter === f.value
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground bg-secondary/50 hover:bg-secondary',
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar título o autor…"
          className="h-7 w-48 text-xs"
        />
        <Button size="sm" className="gap-1.5 ml-auto shrink-0" onClick={onNew}>
          <Plus className="size-3.5" />
          Agregar libro
        </Button>
      </div>

      {/* Grid */}
      {visible.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center rounded-lg border border-dashed border-border">
          <BookOpen className="size-8 text-muted-foreground/30 mb-3" />
          <p className="text-sm text-muted-foreground">
            {books.length === 0
              ? 'Biblioteca vacía. Subí tu primer libro.'
              : 'Sin resultados para esa búsqueda.'}
          </p>
          {books.length === 0 && (
            <Button size="sm" variant="outline" className="mt-3" onClick={onNew}>
              Agregar primer libro
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4">
          {visible.map((book) => (
            <div
              key={book.id}
              className="group relative flex flex-col rounded-lg border border-border/70 bg-card/40 hover:bg-card/80 overflow-hidden transition-all duration-200 hover:border-primary/30 hover:shadow-[0_0_0_1px_hsl(var(--primary)/0.15)] cursor-pointer"
              onClick={() => onOpen(book)}
            >
              {/* Cover */}
              <div className="aspect-[2/3] bg-secondary/40 overflow-hidden relative">
                {book.cover_path ? (
                  <CoverImage coverPath={book.cover_path} title={book.title} />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <FileText className="size-8 text-muted-foreground/20" />
                  </div>
                )}

                {/* Action buttons overlay */}
                <div
                  className="absolute top-1.5 right-1.5 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    onClick={() => onEdit(book)}
                    className="flex items-center justify-center size-6 rounded bg-background/80 backdrop-blur-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Pencil className="size-3" />
                  </button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <button
                        type="button"
                        className="flex items-center justify-center size-6 rounded bg-background/80 backdrop-blur-sm text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <Trash2 className="size-3" />
                      </button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>¿Eliminar "{book.title}"?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Se eliminará el PDF del storage y todas las citas asociadas. No se puede deshacer.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDelete(book)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Eliminar
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>

              {/* Meta */}
              <div className="p-2.5 flex flex-col gap-1 min-h-0">
                <p
                  className="text-xs font-medium text-foreground leading-snug overflow-hidden"
                  style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}
                >
                  {book.title}
                </p>
                {book.author && (
                  <p className="text-[11px] text-muted-foreground truncate">{book.author}</p>
                )}
                <div className="flex items-center justify-between pt-1 gap-1">
                  <div className="flex flex-wrap gap-1 min-w-0">
                    {book.module_tags.slice(0, 2).map((tag) => (
                      <Badge
                        key={tag}
                        variant="outline"
                        className={cn('text-[9px] px-1.5 py-0 h-4 shrink-0', MODULE_BADGE[tag])}
                      >
                        {tag}
                      </Badge>
                    ))}
                  </div>
                  {(citationCounts[book.id] ?? 0) > 0 && (
                    <span className="text-[10px] text-muted-foreground/60 tabular-nums shrink-0">
                      {citationCounts[book.id]}c
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
