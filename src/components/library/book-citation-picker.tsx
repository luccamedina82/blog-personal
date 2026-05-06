import { useState, useEffect } from 'react'
import { Search, BookOpen, FileText, Loader2 } from 'lucide-react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { listBooks, getSignedUrl } from '@/lib/library/queries'
import type { LibraryBook } from '@/lib/library/types'

function BookCover({ coverPath, title }: { coverPath: string; title: string }) {
  'use no memo'
  const [src, setSrc] = useState<string | null>(null)
  useEffect(() => {
    getSignedUrl(coverPath).then(setSrc).catch(() => {})
  }, [coverPath])
  if (!src) return <div className="w-8 h-12 rounded bg-secondary/60 shrink-0 animate-pulse" />
  return <img src={src} alt={title} className="w-8 h-12 rounded object-cover shrink-0" />
}

interface Props {
  open: boolean
  onOpenChange: (v: boolean) => void
  onPick: (bookId: string, bookTitle: string, storagePath: string, page: number) => void
}

export function BookCitationPicker({ open, onOpenChange, onPick }: Props) {
  'use no memo'
  const [books, setBooks] = useState<LibraryBook[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<LibraryBook | null>(null)
  const [page, setPage] = useState('')

  useEffect(() => {
    if (!open) return
    setLoading(true)
    setSearch('')
    setSelected(null)
    setPage('')
    listBooks().then(setBooks).catch(() => {}).finally(() => setLoading(false))
  }, [open])

  const filtered = books.filter((b) => {
    if (!search) return true
    const q = search.toLowerCase()
    return b.title.toLowerCase().includes(q) || (b.author ?? '').toLowerCase().includes(q)
  })

  function handlePick() {
    if (!selected) return
    const p = parseInt(page) || 1
    onPick(selected.id, selected.title, selected.storage_path, p)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Citar libro</DialogTitle>
        </DialogHeader>

        {!selected ? (
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar libro…"
                className="pl-8 h-8 text-xs"
                autoFocus
              />
            </div>

            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="size-5 animate-spin text-muted-foreground" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center py-8 gap-2 text-center">
                <BookOpen className="size-6 text-muted-foreground/30" />
                <p className="text-xs text-muted-foreground">
                  {books.length === 0 ? 'No hay libros en la biblioteca.' : 'Sin resultados.'}
                </p>
              </div>
            ) : (
              <ul className="space-y-0.5 max-h-72 overflow-y-auto">
                {filtered.map((b) => (
                  <li key={b.id}>
                    <button
                      type="button"
                      onClick={() => { setSelected(b); setPage('') }}
                      className="w-full flex items-center gap-2.5 rounded-md px-2 py-2 hover:bg-secondary/60 transition-colors text-left"
                    >
                      {b.cover_path ? (
                        <BookCover coverPath={b.cover_path} title={b.title} />
                      ) : (
                        <div className="w-8 h-12 rounded bg-secondary/60 shrink-0 flex items-center justify-center">
                          <FileText className="size-3.5 text-muted-foreground/40" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{b.title}</p>
                        {b.author && (
                          <p className="text-[11px] text-muted-foreground truncate">{b.author}</p>
                        )}
                        {b.page_count && (
                          <p className="text-[10px] text-muted-foreground/60">{b.page_count} págs.</p>
                        )}
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2.5 rounded-md border border-border/60 p-3">
              {selected.cover_path ? (
                <BookCover coverPath={selected.cover_path} title={selected.title} />
              ) : (
                <div className="w-8 h-12 rounded bg-secondary/60 shrink-0 flex items-center justify-center">
                  <FileText className="size-3.5 text-muted-foreground/40" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">{selected.title}</p>
                {selected.author && (
                  <p className="text-[11px] text-muted-foreground">{selected.author}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors shrink-0"
              >
                Cambiar
              </button>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Página</label>
              <Input
                type="number"
                min={1}
                max={selected.page_count ?? undefined}
                value={page}
                onChange={(e) => setPage(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handlePick() }}
                placeholder="ej. 42"
                className="h-8 w-28 text-xs"
                autoFocus
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="button" size="sm" onClick={handlePick} disabled={!page}>
                Insertar cita
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
