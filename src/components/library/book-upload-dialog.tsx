import { useRef, useState } from 'react'
import { Upload, FileText, Loader2, X } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { supabase } from '@/lib/supabase'
import { createBook } from '@/lib/library/queries'
import { getPdfPageCount, generatePdfCover } from '@/lib/library/pdf-utils'
import type { LibraryBook, LibraryModuleTag } from '@/lib/library/types'

const MODULE_OPTIONS: { value: LibraryModuleTag; label: string }[] = [
  { value: 'faculty', label: 'Faculty' },
  { value: 'devlab', label: 'Dev Lab' },
  { value: 'english', label: 'English' },
]

interface Props {
  open: boolean
  onOpenChange: (v: boolean) => void
  onCreated: (book: LibraryBook) => void
}

export function BookUploadDialog({ open, onOpenChange, onCreated }: Props) {
  'use no memo'
  const inputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [processing, setProcessing] = useState(false)
  const [pageCount, setPageCount] = useState<number | null>(null)
  const [coverBlob, setCoverBlob] = useState<Blob | null>(null)
  const [coverPreview, setCoverPreview] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [author, setAuthor] = useState('')
  const [tags, setTags] = useState('')
  const [moduleTags, setModuleTags] = useState<LibraryModuleTag[]>([])
  const [uploading, setUploading] = useState(false)

  function reset() {
    setFile(null)
    setProcessing(false)
    setPageCount(null)
    setCoverBlob(null)
    if (coverPreview) URL.revokeObjectURL(coverPreview)
    setCoverPreview(null)
    setTitle('')
    setAuthor('')
    setTags('')
    setModuleTags([])
    setUploading(false)
  }

  function handleClose(v: boolean) {
    if (!v) reset()
    onOpenChange(v)
  }

  async function handleFile(f: File) {
    if (!f.type.includes('pdf')) { toast.error('Solo archivos PDF'); return }
    setFile(f)
    setTitle(f.name.replace(/\.pdf$/i, '').replace(/[-_]/g, ' '))
    setProcessing(true)
    try {
      const [count, blob] = await Promise.all([
        getPdfPageCount(f),
        generatePdfCover(f),
      ])
      setPageCount(count)
      setCoverBlob(blob)
      setCoverPreview(URL.createObjectURL(blob))
    } catch {
      toast.error('No se pudo procesar el PDF')
    } finally {
      setProcessing(false)
    }
  }

  function toggleModuleTag(tag: LibraryModuleTag) {
    setModuleTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!file || !title.trim()) return
    setUploading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const uid = session?.user?.id
      if (!uid) throw new Error('Not authenticated')

      const id = crypto.randomUUID()
      const pdfPath = `${uid}/library/${id}.pdf`
      const coverPath = `${uid}/library/${id}_cover.jpg`

      const { error: pdfErr } = await supabase.storage
        .from('media')
        .upload(pdfPath, file, { contentType: 'application/pdf' })
      if (pdfErr) throw pdfErr

      if (coverBlob) {
        await supabase.storage
          .from('media')
          .upload(coverPath, coverBlob, { contentType: 'image/jpeg' })
      }

      const book = await createBook({
        title: title.trim(),
        author: author.trim() || null,
        storage_path: pdfPath,
        page_count: pageCount,
        cover_path: coverBlob ? coverPath : null,
        tags: tags ? tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
        module_tags: moduleTags,
      })

      toast.success(`"${book.title}" agregado a la biblioteca`)
      onCreated(book)
      handleClose(false)
    } catch (err) {
      toast.error('Error al subir el libro')
      console.error(err)
    } finally {
      setUploading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Agregar libro</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Drop zone */}
          {!file ? (
            <div
              onClick={() => inputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
              className="flex flex-col items-center gap-3 rounded-lg border-2 border-dashed border-border/70 bg-card/20 p-10 cursor-pointer hover:border-primary/40 hover:bg-card/40 transition-colors"
            >
              <Upload className="size-8 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">Arrastrá o hacé click para elegir PDF</p>
              <input ref={inputRef} type="file" accept=".pdf,application/pdf" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
            </div>
          ) : (
            <div className="flex items-start gap-3 rounded-lg border border-border/70 bg-card/40 p-3">
              {processing ? (
                <div className="size-16 shrink-0 rounded bg-secondary flex items-center justify-center">
                  <Loader2 className="size-5 text-muted-foreground animate-spin" />
                </div>
              ) : coverPreview ? (
                <img src={coverPreview} alt="cover" className="size-16 shrink-0 rounded object-cover" />
              ) : (
                <div className="size-16 shrink-0 rounded bg-secondary flex items-center justify-center">
                  <FileText className="size-5 text-muted-foreground" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{file.name}</p>
                <p className="text-xs text-muted-foreground">
                  {(file.size / 1024 / 1024).toFixed(1)} MB
                  {pageCount != null && ` · ${pageCount} páginas`}
                  {processing && ' · procesando…'}
                </p>
              </div>
              <button type="button" onClick={reset} className="shrink-0 text-muted-foreground hover:text-foreground">
                <X className="size-4" />
              </button>
            </div>
          )}

          {file && (
            <>
              <div className="space-y-1.5">
                <Label>Título</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Nombre del libro" required />
              </div>

              <div className="space-y-1.5">
                <Label>Autor <span className="text-muted-foreground font-normal">(opcional)</span></Label>
                <Input value={author} onChange={(e) => setAuthor(e.target.value)} placeholder="e.g. Donald Knuth" />
              </div>

              <div className="space-y-1.5">
                <Label>Tags <span className="text-muted-foreground font-normal">(separados por coma)</span></Label>
                <Input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="e.g. algorithms, reference" />
              </div>

              <div className="space-y-1.5">
                <Label>Módulos</Label>
                <div className="flex gap-2">
                  {MODULE_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => toggleModuleTag(opt.value)}
                      className={cn(
                        'h-7 px-3 rounded-full text-xs border transition-colors',
                        moduleTags.includes(opt.value)
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'border-border text-muted-foreground hover:text-foreground hover:border-border/80',
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => handleClose(false)} disabled={uploading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={!file || !title.trim() || uploading || processing}>
              {uploading ? (
                <><Loader2 className="size-3.5 mr-1.5 animate-spin" />Subiendo…</>
              ) : 'Agregar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
