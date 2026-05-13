import { useEffect, useRef, useState } from 'react'
import { Zap, Hand, FileImage, Sparkles, ImagePlus, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { getSignedUrl, updateBook } from '@/lib/library/queries'
import { generatePdfCoverFromUrl } from '@/lib/library/pdf-utils'
import { supabase } from '@/lib/supabase'
import type { LibraryBook, LibraryModuleTag, LibraryProgressMode } from '@/lib/library/types'

const MODULE_OPTIONS: { value: LibraryModuleTag; label: string }[] = [
  { value: 'faculty', label: 'Faculty' },
  { value: 'devlab', label: 'Dev Lab' },
  { value: 'english', label: 'English' },
]

type CoverAction = 'keep' | 'auto' | 'manual'

interface Props {
  open: boolean
  onOpenChange: (v: boolean) => void
  book: LibraryBook
  onUpdated: (book: LibraryBook) => void
}

function CoverPreview({ coverPath }: { coverPath: string }) {
  'use no memo'
  const [src, setSrc] = useState<string | null>(null)
  useEffect(() => {
    getSignedUrl(coverPath).then(setSrc).catch(() => {})
  }, [coverPath])
  if (!src) return <Loader2 className="size-5 text-muted-foreground animate-spin" />
  return <img src={src} alt="cover" className="w-full h-full object-cover" />
}

export function BookEditDialog({ open, onOpenChange, book, onUpdated }: Props) {
  'use no memo'
  const coverInputRef = useRef<HTMLInputElement>(null)
  const [title, setTitle] = useState('')
  const [author, setAuthor] = useState('')
  const [tags, setTags] = useState('')
  const [moduleTags, setModuleTags] = useState<LibraryModuleTag[]>([])
  const [pageCount, setPageCount] = useState('')
  const [lastPageRead, setLastPageRead] = useState('')
  const [progressMode, setProgressMode] = useState<LibraryProgressMode>('manual')
  const [coverAction, setCoverAction] = useState<CoverAction>('keep')
  const [autoBlob, setAutoBlob] = useState<Blob | null>(null)
  const [autoPreview, setAutoPreview] = useState<string | null>(null)
  const [generatingAuto, setGeneratingAuto] = useState(false)
  const [manualBlob, setManualBlob] = useState<Blob | null>(null)
  const [manualPreview, setManualPreview] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setTitle(book.title)
    setAuthor(book.author ?? '')
    setTags(book.tags.join(', '))
    setModuleTags(book.module_tags)
    setPageCount(book.page_count != null ? String(book.page_count) : '')
    setLastPageRead(book.last_page_read != null ? String(book.last_page_read) : '')
    setProgressMode(book.progress_mode ?? 'manual')
    setCoverAction('keep')
    setAutoBlob(null)
    if (autoPreview) URL.revokeObjectURL(autoPreview)
    setAutoPreview(null)
    setManualBlob(null)
    if (manualPreview) URL.revokeObjectURL(manualPreview)
    setManualPreview(null)
  }, [open, book.id])

  function toggleModuleTag(tag: LibraryModuleTag) {
    setModuleTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    )
  }

  async function handleGenerateAuto() {
    if (generatingAuto) return
    setGeneratingAuto(true)
    try {
      const url = await getSignedUrl(book.storage_path)
      const blob = await generatePdfCoverFromUrl(url)
      if (autoPreview) URL.revokeObjectURL(autoPreview)
      setAutoBlob(blob)
      setAutoPreview(URL.createObjectURL(blob))
      setCoverAction('auto')
    } catch {
      toast.error('No se pudo generar portada del PDF')
    } finally {
      setGeneratingAuto(false)
    }
  }

  function handleCoverFile(f: File) {
    if (!f.type.startsWith('image/')) {
      toast.error('Solo imágenes (JPG, PNG, WEBP)')
      return
    }
    if (manualPreview) URL.revokeObjectURL(manualPreview)
    setManualBlob(f)
    setManualPreview(URL.createObjectURL(f))
    setCoverAction('manual')
  }

  async function uploadNewCover(blob: Blob): Promise<string | null> {
    const { data: { session } } = await supabase.auth.getSession()
    const uid = session?.user?.id
    if (!uid) throw new Error('Not authenticated')
    const ext = blob instanceof File
      ? (blob.name.split('.').pop()?.toLowerCase() ?? 'jpg')
      : 'jpg'
    const contentType = blob instanceof File && blob.type ? blob.type : 'image/jpeg'
    // Unique suffix avoids needing UPDATE/DELETE storage policies
    const path = `${uid}/library/${book.id}_cover_${Date.now()}.${ext}`
    const { error } = await supabase.storage
      .from('media')
      .upload(path, blob, { contentType })
    if (error) throw error
    // Best-effort cleanup old cover (silent if policy denies)
    if (book.cover_path && book.cover_path !== path) {
      supabase.storage.from('media').remove([book.cover_path]).catch(() => {})
    }
    return path
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const pc = pageCount.trim() === '' ? null : Math.max(1, parseInt(pageCount, 10))
      const rawLast = lastPageRead.trim() === '' ? null : Math.max(0, parseInt(lastPageRead, 10))
      const lp = rawLast != null && pc != null ? Math.min(rawLast, pc) : rawLast

      let coverPath: string | null | undefined = undefined // undefined = no change
      if (coverAction === 'auto' && autoBlob) {
        coverPath = await uploadNewCover(autoBlob)
      } else if (coverAction === 'manual' && manualBlob) {
        coverPath = await uploadNewCover(manualBlob)
      }

      const payload: Parameters<typeof updateBook>[1] = {
        title: title.trim(),
        author: author.trim() || null,
        tags: tags ? tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
        module_tags: moduleTags,
        page_count: pc,
        last_page_read: lp,
        progress_mode: progressMode,
      }
      if (coverPath !== undefined) payload.cover_path = coverPath

      const updated = await updateBook(book.id, payload)
      onUpdated(updated)
      onOpenChange(false)
    } catch (err) {
      console.error('[BookEditDialog] save failed:', err)
      const msg = err instanceof Error ? err.message : 'Error al guardar'
      toast.error(msg)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-hidden grid-rows-[auto_minmax(0,1fr)]">
        <DialogHeader className="min-w-0">
          <DialogTitle className="truncate">Editar libro</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 min-w-0 overflow-y-auto pr-1">
          {/* Cover editor */}
          <div className="space-y-1.5">
            <Label>Portada</Label>
            <div className="grid grid-cols-[100px_1fr] gap-3 min-w-0">
              {/* Preview */}
              <div className="aspect-[2/3] rounded-md overflow-hidden bg-secondary/40 ring-1 ring-border/60 flex items-center justify-center">
                {coverAction === 'auto' && autoPreview ? (
                  <img src={autoPreview} alt="cover" className="w-full h-full object-cover" />
                ) : coverAction === 'manual' && manualPreview ? (
                  <img src={manualPreview} alt="cover" className="w-full h-full object-cover" />
                ) : book.cover_path ? (
                  <CoverPreview coverPath={book.cover_path} />
                ) : (
                  <FileImage className="size-6 text-muted-foreground/40" />
                )}
              </div>

              <div className="flex flex-col gap-1.5 min-w-0">
                {book.cover_path && (
                  <button
                    type="button"
                    onClick={() => setCoverAction('keep')}
                    className={cn(
                      'flex items-start gap-2 px-3 py-2 rounded-md border text-xs text-left transition-colors',
                      coverAction === 'keep'
                        ? 'bg-primary/10 border-primary/40 text-foreground'
                        : 'border-border/60 text-muted-foreground hover:text-foreground hover:bg-secondary/40',
                    )}
                  >
                    <FileImage className="size-3.5 mt-0.5 shrink-0" />
                    <div className="min-w-0">
                      <p className="font-medium">Mantener actual</p>
                      <p className="text-[10px] text-muted-foreground/80 truncate">Sin cambios</p>
                    </div>
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleGenerateAuto}
                  disabled={generatingAuto}
                  className={cn(
                    'flex items-start gap-2 px-3 py-2 rounded-md border text-xs text-left transition-colors',
                    coverAction === 'auto' && autoBlob
                      ? 'bg-primary/10 border-primary/40 text-foreground'
                      : 'border-border/60 text-muted-foreground hover:text-foreground hover:bg-secondary/40',
                    generatingAuto && 'opacity-60 cursor-wait',
                  )}
                >
                  {generatingAuto ? (
                    <Loader2 className="size-3.5 mt-0.5 shrink-0 animate-spin" />
                  ) : (
                    <Sparkles className="size-3.5 mt-0.5 shrink-0" />
                  )}
                  <div className="min-w-0">
                    <p className="font-medium truncate">Primera página del PDF</p>
                    <p className="text-[10px] text-muted-foreground/80 truncate">
                      {generatingAuto ? 'Generando…' : autoBlob ? 'Lista' : 'Click para generar'}
                    </p>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => coverInputRef.current?.click()}
                  className={cn(
                    'flex items-start gap-2 px-3 py-2 rounded-md border text-xs text-left transition-colors',
                    coverAction === 'manual' && manualBlob
                      ? 'bg-primary/10 border-primary/40 text-foreground'
                      : 'border-border/60 text-muted-foreground hover:text-foreground hover:bg-secondary/40',
                  )}
                >
                  <ImagePlus className="size-3.5 mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <p className="font-medium truncate">
                      {manualBlob ? 'Cambiar imagen…' : 'Subir imagen…'}
                    </p>
                    <p className="text-[10px] text-muted-foreground/80 truncate">JPG / PNG / WEBP</p>
                  </div>
                </button>
                <input
                  ref={coverInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleCoverFile(f) }}
                />
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Título</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} required />
          </div>

          <div className="space-y-1.5">
            <Label>Autor <span className="text-muted-foreground font-normal">(opcional)</span></Label>
            <Input value={author} onChange={(e) => setAuthor(e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label>Tags <span className="text-muted-foreground font-normal">(separados por coma)</span></Label>
            <Input value={tags} onChange={(e) => setTags(e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5 min-w-0">
              <Label>Total páginas</Label>
              <Input
                type="number"
                min={1}
                value={pageCount}
                onChange={(e) => setPageCount(e.target.value)}
                placeholder="—"
              />
            </div>
            <div className="space-y-1.5 min-w-0">
              <Label>Página actual</Label>
              <Input
                type="number"
                min={0}
                max={pageCount ? parseInt(pageCount, 10) : undefined}
                value={lastPageRead}
                onChange={(e) => setLastPageRead(e.target.value)}
                placeholder="0"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Modo de progreso</Label>
            <div className="grid grid-cols-2 gap-2 min-w-0">
              <button
                type="button"
                onClick={() => setProgressMode('manual')}
                className={cn(
                  'flex items-center gap-2 h-10 px-3 rounded-md border text-xs transition-colors text-left min-w-0',
                  progressMode === 'manual'
                    ? 'bg-primary/10 border-primary/40 text-foreground'
                    : 'border-border/60 text-muted-foreground hover:text-foreground hover:bg-secondary/40',
                )}
              >
                <Hand className="size-3.5 shrink-0" />
                <div className="min-w-0">
                  <p className="font-medium truncate">Manual</p>
                  <p className="text-[10px] text-muted-foreground/80 truncate">Vos editás cuándo</p>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setProgressMode('auto')}
                className={cn(
                  'flex items-center gap-2 h-10 px-3 rounded-md border text-xs transition-colors text-left min-w-0',
                  progressMode === 'auto'
                    ? 'bg-primary/10 border-primary/40 text-foreground'
                    : 'border-border/60 text-muted-foreground hover:text-foreground hover:bg-secondary/40',
                )}
              >
                <Zap className="size-3.5 shrink-0" />
                <div className="min-w-0">
                  <p className="font-medium truncate">Automático</p>
                  <p className="text-[10px] text-muted-foreground/80 truncate">Viewer guarda</p>
                </div>
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Módulos</Label>
            <div className="flex gap-2 flex-wrap">
              {MODULE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => toggleModuleTag(opt.value)}
                  className={cn(
                    'h-7 px-3 rounded-full text-xs border transition-colors',
                    moduleTags.includes(opt.value)
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'border-border text-muted-foreground hover:text-foreground',
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button type="submit" disabled={!title.trim() || saving}>
              {saving ? 'Guardando…' : 'Guardar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
