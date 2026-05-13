import { useEffect, useState } from 'react'
import { Activity, BookOpen, CheckCircle2, ChevronDown, Hand, Zap, Pencil, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { getSignedUrl, setLastPageRead } from '@/lib/library/queries'
import type { LibraryBook } from '@/lib/library/types'

type Filter = 'reading' | 'unread' | 'finished' | 'all'

interface Props {
  books: LibraryBook[]
  onUpdated?: (book: LibraryBook) => void
  onOpen?: (book: LibraryBook) => void
}

function pctOf(book: LibraryBook): number | null {
  if (book.page_count == null || book.page_count <= 0) return null
  if (book.last_page_read == null || book.last_page_read <= 0) return 0
  return Math.min(100, Math.round((book.last_page_read / book.page_count) * 100))
}

function ThumbCover({ coverPath, title }: { coverPath: string | null; title: string }) {
  'use no memo'
  const [src, setSrc] = useState<string | null>(null)
  useEffect(() => {
    if (!coverPath) return
    getSignedUrl(coverPath).then(setSrc).catch(() => {})
  }, [coverPath])

  if (!coverPath || !src) {
    return (
      <div className="size-12 shrink-0 rounded bg-secondary/60 ring-1 ring-border/40 flex items-center justify-center">
        <BookOpen className="size-4 text-muted-foreground/40" />
      </div>
    )
  }
  return (
    <img
      src={src}
      alt={title}
      loading="lazy"
      className="size-12 shrink-0 rounded object-cover ring-1 ring-border/40 shadow-sm"
    />
  )
}

export function ProgressSection({ books, onUpdated, onOpen }: Props) {
  'use no memo'
  const [filter, setFilter] = useState<Filter>('reading')
  const [collapsed, setCollapsed] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [savingId, setSavingId] = useState<string | null>(null)

  const withProgress = books.filter((b) => b.page_count != null && b.page_count > 0)
  const reading = withProgress.filter((b) => {
    const p = b.last_page_read ?? 0
    return p > 0 && p < (b.page_count ?? 0)
  })
  const finished = withProgress.filter((b) => (b.last_page_read ?? 0) >= (b.page_count ?? 0))
  const unread = withProgress.filter((b) => (b.last_page_read ?? 0) === 0)

  const counts: Record<Filter, number> = {
    reading: reading.length,
    unread: unread.length,
    finished: finished.length,
    all: withProgress.length,
  }

  const filtered =
    filter === 'reading' ? reading
    : filter === 'unread' ? unread
    : filter === 'finished' ? finished
    : withProgress

  // Sort: leyendo por % desc, terminados por title, no leídos por title
  const sorted = [...filtered].sort((a, b) => {
    if (filter === 'reading' || filter === 'all') {
      return (pctOf(b) ?? 0) - (pctOf(a) ?? 0)
    }
    return a.title.localeCompare(b.title)
  })

  // Aggregate stats
  const totalPages = withProgress.reduce((s, b) => s + (b.page_count ?? 0), 0)
  const readPages = withProgress.reduce((s, b) => s + Math.min(b.last_page_read ?? 0, b.page_count ?? 0), 0)
  const aggPct = totalPages > 0 ? Math.round((readPages / totalPages) * 100) : 0

  async function saveProgress(book: LibraryBook) {
    const n = parseInt(editValue, 10)
    if (isNaN(n) || book.page_count == null) {
      setEditingId(null)
      return
    }
    const clamped = Math.max(0, Math.min(n, book.page_count))
    if (clamped === book.last_page_read) {
      setEditingId(null)
      return
    }
    setSavingId(book.id)
    try {
      await setLastPageRead(book.id, clamped)
      onUpdated?.({ ...book, last_page_read: clamped })
      toast.success(`"${book.title}" → pág. ${clamped} / ${book.page_count}`)
    } catch {
      toast.error('Error al guardar')
    } finally {
      setSavingId(null)
      setEditingId(null)
    }
  }

  function startEdit(book: LibraryBook) {
    setEditingId(book.id)
    setEditValue(String(book.last_page_read ?? 0))
  }

  if (withProgress.length === 0) return null

  return (
    <section className="rounded-xl border border-border/60 bg-card/30 overflow-hidden">
      {/* Header */}
      <button
        type="button"
        onClick={() => setCollapsed((v) => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-card/50 transition-colors text-left"
      >
        <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
          <Activity className="size-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground">Progreso de lectura</p>
          <p className="text-[11px] text-muted-foreground tabular-nums mt-0.5">
            {reading.length} leyendo · {finished.length} terminado{finished.length !== 1 ? 's' : ''} · {aggPct}% global ({readPages.toLocaleString('es-AR')} / {totalPages.toLocaleString('es-AR')} pág.)
          </p>
        </div>
        <ChevronDown className={cn('size-4 text-muted-foreground transition-transform shrink-0', collapsed && '-rotate-90')} />
      </button>

      {!collapsed && (
        <>
          {/* Global progress bar */}
          <div className="px-4 pb-3">
            <div className="h-1.5 rounded-full bg-secondary/60 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-primary/60 to-primary transition-all duration-500"
                style={{ width: `${aggPct}%` }}
              />
            </div>
          </div>

          {/* Filter pills */}
          <div className="flex items-center gap-1 px-4 pb-3 flex-wrap">
            {([
              { value: 'reading', label: 'Leyendo', icon: BookOpen },
              { value: 'unread', label: 'Sin leer', icon: BookOpen },
              { value: 'finished', label: 'Terminados', icon: CheckCircle2 },
              { value: 'all', label: 'Todos', icon: BookOpen },
            ] as const).map((f) => {
              const Icon = f.icon
              const active = filter === f.value
              return (
                <button
                  key={f.value}
                  type="button"
                  onClick={() => setFilter(f.value)}
                  className={cn(
                    'flex items-center gap-1.5 h-7 px-3 rounded-full text-xs transition-colors',
                    active
                      ? 'bg-primary/15 text-primary ring-1 ring-primary/20'
                      : 'text-muted-foreground hover:text-foreground bg-secondary/40 hover:bg-secondary/60',
                  )}
                >
                  <Icon className="size-3" />
                  {f.label}
                  <span className="opacity-60 tabular-nums">{counts[f.value]}</span>
                </button>
              )
            })}
          </div>

          {/* List */}
          {sorted.length === 0 ? (
            <p className="px-4 pb-4 text-xs text-muted-foreground">Sin libros en esta categoría.</p>
          ) : (
            <ul className="divide-y divide-border/40 border-t border-border/40">
              {sorted.map((book) => {
                const pct = pctOf(book) ?? 0
                const isEditing = editingId === book.id
                const isSaving = savingId === book.id
                const isFinished = pct === 100
                return (
                  <li key={book.id} className="group flex items-center gap-3 px-4 py-3 hover:bg-card/40 transition-colors">
                    <button
                      type="button"
                      onClick={() => onOpen?.(book)}
                      className="shrink-0"
                      title="Abrir libro"
                    >
                      <ThumbCover coverPath={book.cover_path} title={book.title} />
                    </button>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => onOpen?.(book)}
                          className="text-sm font-medium text-foreground hover:text-primary transition-colors truncate text-left"
                        >
                          {book.title}
                        </button>
                        <span
                          title={book.progress_mode === 'auto' ? 'Auto' : 'Manual'}
                          className={cn(
                            'inline-flex items-center justify-center size-4 rounded-full shrink-0',
                            book.progress_mode === 'auto'
                              ? 'bg-primary/15 text-primary'
                              : 'bg-secondary text-muted-foreground',
                          )}
                        >
                          {book.progress_mode === 'auto' ? <Zap className="size-2.5" /> : <Hand className="size-2.5" />}
                        </span>
                      </div>
                      {book.author && (
                        <p className="text-[11px] text-muted-foreground truncate">{book.author}</p>
                      )}

                      <div className="mt-1.5 flex items-center gap-2">
                        <div className="flex-1 h-1.5 rounded-full bg-secondary/60 overflow-hidden">
                          <div
                            className={cn(
                              'h-full rounded-full transition-all duration-500',
                              isFinished ? 'bg-green-500' : 'bg-primary',
                            )}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className={cn(
                          'text-[11px] font-semibold tabular-nums shrink-0 w-9 text-right',
                          isFinished ? 'text-green-500' : 'text-foreground/80',
                        )}>
                          {pct}%
                        </span>
                      </div>
                    </div>

                    {/* Page edit */}
                    <div className="flex items-center gap-1 shrink-0">
                      {isEditing ? (
                        <>
                          <input
                            autoFocus
                            type="number"
                            min={0}
                            max={book.page_count ?? undefined}
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') saveProgress(book)
                              if (e.key === 'Escape') setEditingId(null)
                            }}
                            onBlur={() => saveProgress(book)}
                            disabled={isSaving}
                            className="h-7 w-14 text-xs rounded border border-primary/40 bg-card/60 px-2 text-center tabular-nums outline-none focus:border-primary"
                          />
                          <span className="text-[11px] text-muted-foreground tabular-nums">/ {book.page_count}</span>
                          {isSaving && <Loader2 className="size-3 animate-spin text-muted-foreground" />}
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => startEdit(book)}
                          title="Editar progreso"
                          className="flex items-center gap-1 h-7 px-2.5 rounded text-[11px] text-muted-foreground hover:text-foreground bg-secondary/40 hover:bg-secondary border border-border/40 transition-colors tabular-nums"
                        >
                          {book.last_page_read ?? 0}
                          <span className="text-muted-foreground/50">/ {book.page_count}</span>
                          <Pencil className="size-2.5 opacity-0 group-hover:opacity-70 transition-opacity ml-0.5" />
                        </button>
                      )}
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </>
      )}
    </section>
  )
}
