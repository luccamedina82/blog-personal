import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, BookOpen, FileText, ImagePlus, Loader2, Search } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { deleteBook, getSignedUrl, updateBook } from '@/lib/library/queries'
import { generatePdfCoverFromUrl } from '@/lib/library/pdf-utils'
import type { LibraryBook, LibraryModuleTag } from '@/lib/library/types'
import { supabase } from '@/lib/supabase'

const MODULE_FILTERS: Array<{ value: LibraryModuleTag | 'all'; label: string }> = [
  { value: 'all', label: 'Todos' },
  { value: 'faculty', label: 'Faculty' },
  { value: 'devlab', label: 'Dev Lab' },
  { value: 'english', label: 'English' },
]

const MODULE_BADGE: Record<LibraryModuleTag, string> = {
  faculty: 'bg-blue-500 text-white border-blue-400/60 shadow-sm shadow-blue-900/30',
  devlab: 'bg-violet-500 text-white border-violet-400/60 shadow-sm shadow-violet-900/30',
  english: 'bg-green-500 text-white border-green-400/60 shadow-sm shadow-green-900/30',
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
  return <img src={src} alt={title} className="w-full h-full object-cover" loading="lazy" />
}

const SPINE_PALETTE = [
  '#3d5a47', '#3a4d6b', '#5c3d2e', '#5a5132',
  '#2e5c5a', '#5a2e3d', '#2d4a2a', '#2c3a52',
  '#4a3a5c', '#5a4530',
] as const

function spineColor(id: string): string {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0
  return SPINE_PALETTE[h % SPINE_PALETTE.length]
}

function spineLabel(book: LibraryBook): string {
  const src = book.author?.trim() || book.title.trim()
  const last = src.split(/\s+/).pop() ?? ''
  return last.toUpperCase().slice(0, 14)
}

type Props = {
  books: LibraryBook[]
  citationCounts: Record<string, number>
  onNew: () => void
  onEdit: (book: LibraryBook) => void
  onDeleted: (id: string) => void
  onOpen: (book: LibraryBook) => void
  onUpdated?: (book: LibraryBook) => void
}

export function BookGrid({ books, citationCounts, onNew, onEdit, onDeleted, onOpen, onUpdated }: Props) {
  'use no memo'
  const [filter, setFilter] = useState<LibraryModuleTag | 'all'>('all')
  const [search, setSearch] = useState('')
  const [generating, setGenerating] = useState<Set<string>>(new Set())

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

  async function handleGenerateCover(book: LibraryBook) {
    setGenerating((prev) => new Set(prev).add(book.id))
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const uid = session?.user?.id
      if (!uid) throw new Error('No auth')

      const url = await getSignedUrl(book.storage_path)
      const blob = await generatePdfCoverFromUrl(url)
      const coverPath = `${uid}/library/${book.id}_cover_${Date.now()}.jpg`

      const { error: upErr } = await supabase.storage
        .from('media')
        .upload(coverPath, blob, { contentType: 'image/jpeg' })
      if (upErr) throw upErr

      const updated = await updateBook(book.id, { cover_path: coverPath })
      onUpdated?.(updated)
      if (book.cover_path && book.cover_path !== coverPath) {
        supabase.storage.from('media').remove([book.cover_path]).catch(() => {})
      }
      toast.success('Portada generada')
    } catch (err) {
      console.error('[handleGenerateCover]', err)
      const msg = err instanceof Error ? err.message : 'Error al generar portada'
      toast.error(msg)
    } finally {
      setGenerating((prev) => {
        const next = new Set(prev)
        next.delete(book.id)
        return next
      })
    }
  }

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1 flex-wrap">
          {MODULE_FILTERS.map((f) => {
            const count =
              f.value === 'all'
                ? books.length
                : books.filter((b) => b.module_tags.includes(f.value as LibraryModuleTag)).length
            return (
              <button
                key={f.value}
                type="button"
                onClick={() => setFilter(f.value)}
                className={cn(
                  'h-7 px-3 rounded-full text-xs transition-colors flex items-center gap-1.5',
                  filter === f.value
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground bg-secondary/50 hover:bg-secondary',
                )}
              >
                {f.label}
                <span className="opacity-60 tabular-nums">{count}</span>
              </button>
            )
          })}
        </div>
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 size-3 text-muted-foreground/60" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar título o autor…"
            className="h-7 w-56 text-xs pl-7"
          />
        </div>
        <Button size="sm" className="gap-1.5 ml-auto shrink-0" onClick={onNew}>
          <Plus className="size-3.5" />
          Agregar libro
        </Button>
      </div>

      {/* Grid */}
      {visible.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center rounded-xl border border-dashed border-border/70">
          <BookOpen className="size-10 text-muted-foreground/25 mb-3" />
          <p className="text-sm text-muted-foreground">
            {books.length === 0
              ? 'Biblioteca vacía. Subí tu primer libro.'
              : 'Sin resultados para esa búsqueda.'}
          </p>
          {books.length === 0 && (
            <Button size="sm" variant="outline" className="mt-4" onClick={onNew}>
              Agregar primer libro
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-x-6 gap-y-10 pt-4">
          {visible.map((book) => {
            const isGen = generating.has(book.id)
            const sColor = spineColor(book.id)
            return (
              <div
                key={book.id}
                className="group flex flex-col cursor-pointer"
                style={{ perspective: '800px' }}
                onClick={() => onOpen(book)}
              >
                {/* Book body — spine + cover */}
                <div
                  className="relative flex rounded-sm overflow-hidden transition-transform duration-500 ease-out group-hover:[transform:rotateY(-4deg)_translateX(4px)]"
                  style={{
                    boxShadow: '6px 6px 18px rgba(0,0,0,0.55), 2px 2px 6px rgba(0,0,0,0.4)',
                  }}
                >
                  {/* Spine */}
                  <div
                    className="w-7 shrink-0 flex items-center justify-center relative"
                    style={{ backgroundColor: sColor }}
                  >
                    <div className="absolute inset-y-0 left-0 w-px bg-white/10" />
                    <div className="absolute inset-y-0 right-0 w-px bg-black/30" />
                    <span
                      className="text-[9px] font-semibold tracking-[0.2em] uppercase text-white/80 whitespace-nowrap"
                      style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
                    >
                      {spineLabel(book)}
                    </span>
                  </div>

                  {/* Cover */}
                  <div className="relative flex-1 aspect-[2/3] overflow-hidden bg-card">
                    {book.cover_path ? (
                      <CoverImage coverPath={book.cover_path} title={book.title} />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center gap-2 p-4 bg-gradient-to-br from-secondary/60 to-secondary/20">
                        <FileText className="size-8 text-muted-foreground/30" />
                        <p className="text-[10px] text-muted-foreground/60 text-center line-clamp-3">
                          {book.title}
                        </p>
                      </div>
                    )}

                    {/* Page-edge illusion on the right */}
                    <div
                      className="absolute inset-y-0 right-0 w-1.5 pointer-events-none"
                      style={{
                        background:
                          'linear-gradient(to right, transparent, rgba(240,234,220,0.18) 40%, rgba(240,234,220,0.32))',
                      }}
                      aria-hidden
                    />
                    {/* Top sheen / bottom shade */}
                    <div
                      className="absolute inset-0 pointer-events-none bg-gradient-to-b from-white/[0.04] via-transparent to-black/30"
                      aria-hidden
                    />

                    {/* Module badges — top-left, solid */}
                    {book.module_tags.length > 0 && (
                      <div className="absolute top-2 left-2 flex flex-wrap gap-1 max-w-[80%] pointer-events-none">
                        {book.module_tags.slice(0, 2).map((tag) => (
                          <span
                            key={tag}
                            className={cn(
                              'inline-flex items-center h-5 rounded px-1.5 text-[9px] font-bold uppercase tracking-wider border',
                              MODULE_BADGE[tag],
                            )}
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Citation pill — top-right */}
                    {(citationCounts[book.id] ?? 0) > 0 && (
                      <div className="absolute top-2 right-2 flex items-center gap-1 h-5 rounded-full bg-black/60 backdrop-blur-sm border border-white/10 px-1.5 text-[10px] text-white/90 tabular-nums pointer-events-none">
                        {citationCounts[book.id]}
                        <span className="text-white/50">c</span>
                      </div>
                    )}

                    {/* Action buttons overlay — on hover */}
                    <div
                      className="absolute bottom-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {!book.cover_path && (
                        <button
                          type="button"
                          onClick={() => handleGenerateCover(book)}
                          disabled={isGen}
                          title="Generar portada"
                          className="flex items-center justify-center size-7 rounded-md bg-background/85 backdrop-blur-sm text-muted-foreground hover:text-primary border border-border/40 transition-colors disabled:opacity-60"
                        >
                          {isGen ? <Loader2 className="size-3.5 animate-spin" /> : <ImagePlus className="size-3.5" />}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => onEdit(book)}
                        title="Editar"
                        className="flex items-center justify-center size-7 rounded-md bg-background/85 backdrop-blur-sm text-muted-foreground hover:text-foreground border border-border/40 transition-colors"
                      >
                        <Pencil className="size-3.5" />
                      </button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <button
                            type="button"
                            title="Eliminar"
                            className="flex items-center justify-center size-7 rounded-md bg-background/85 backdrop-blur-sm text-muted-foreground hover:text-destructive border border-border/40 transition-colors"
                          >
                            <Trash2 className="size-3.5" />
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
                </div>

                {/* Bookplate — beige inside-cover label */}
                <div
                  className="mx-1 rounded-b-sm border border-t-0 border-[#c8bfa8] bg-[#f5f0e8] px-3 py-2.5 flex flex-col gap-1.5 transition-transform duration-500 ease-out group-hover:[transform:rotateY(-4deg)_translateX(4px)]"
                  style={{ boxShadow: '4px 4px 12px rgba(0,0,0,0.35)' }}
                >
                  <div className="min-w-0">
                    <p
                      className="text-[13px] font-semibold leading-snug text-[#1a1710] font-serif overflow-hidden"
                      style={{
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        minHeight: '2.4em',
                      }}
                      title={book.title}
                    >
                      {book.title}
                    </p>
                    <p
                      className="text-[11px] italic text-[#5c5646] mt-0.5 font-serif truncate"
                      style={{ minHeight: '1.2em' }}
                    >
                      {book.author ?? '—'}
                    </p>
                  </div>

                  <div className="h-px bg-[#c8bfa8]" />

                  <div className="flex items-center gap-1 overflow-hidden" style={{ height: '18px' }}>
                    {book.tags.length > 0 ? (
                      book.tags.slice(0, 3).map((t) => (
                        <span
                          key={t}
                          className="shrink-0 inline-block text-[9px] uppercase tracking-wider font-medium px-1.5 py-0.5 rounded-sm bg-[#e2d9c8] text-[#4a4235] border border-[#c8bfa8]"
                        >
                          {t}
                        </span>
                      ))
                    ) : (
                      <span className="text-[9px] text-[#9c9484] italic">—</span>
                    )}
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

