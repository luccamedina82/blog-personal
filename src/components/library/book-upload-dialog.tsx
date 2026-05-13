import { useRef, useState } from 'react'
import { Upload, FileText, Loader2, X, FileImage, Sparkles, ImagePlus } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
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

type CoverMode = 'auto' | 'manual'

export function BookUploadDialog({ open, onOpenChange, onCreated }: Props) {
  'use no memo'
  const inputRef = useRef<HTMLInputElement>(null)
  const coverInputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [processing, setProcessing] = useState(false)
  const [pageCount, setPageCount] = useState<number | null>(null)
  const [coverMode, setCoverMode] = useState<CoverMode>('auto')
  const [autoCoverBlob, setAutoCoverBlob] = useState<Blob | null>(null)
  const [autoCoverPreview, setAutoCoverPreview] = useState<string | null>(null)
  const [manualCoverBlob, setManualCoverBlob] = useState<Blob | null>(null)
  const [manualCoverPreview, setManualCoverPreview] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [author, setAuthor] = useState('')
  const [tags, setTags] = useState('')
  const [moduleTags, setModuleTags] = useState<LibraryModuleTag[]>([])
  const [uploading, setUploading] = useState(false)

  function reset() {
    setFile(null)
    setProcessing(false)
    setPageCount(null)
    setCoverMode('auto')
    setAutoCoverBlob(null)
    if (autoCoverPreview) URL.revokeObjectURL(autoCoverPreview)
    setAutoCoverPreview(null)
    setManualCoverBlob(null)
    if (manualCoverPreview) URL.revokeObjectURL(manualCoverPreview)
    setManualCoverPreview(null)
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
      setAutoCoverBlob(blob)
      setAutoCoverPreview(URL.createObjectURL(blob))
    } catch {
      toast.error('No se pudo procesar el PDF')
    } finally {
      setProcessing(false)
    }
  }

  function handleCoverFile(f: File) {
    if (!f.type.startsWith('image/')) {
      toast.error('Solo imágenes (JPG, PNG, WEBP)')
      return
    }
    if (manualCoverPreview) URL.revokeObjectURL(manualCoverPreview)
    setManualCoverBlob(f)
    setManualCoverPreview(URL.createObjectURL(f))
    setCoverMode('manual')
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

      const chosenBlob =
        coverMode === 'manual' && manualCoverBlob ? manualCoverBlob
        : coverMode === 'auto' && autoCoverBlob ? autoCoverBlob
        : null
      const ext = chosenBlob instanceof File
        ? (chosenBlob.name.split('.').pop()?.toLowerCase() ?? 'jpg')
        : 'jpg'
      const coverContentType =
        chosenBlob instanceof File && chosenBlob.type
          ? chosenBlob.type
          : 'image/jpeg'
      const coverPath = `${uid}/library/${id}_cover.${ext}`

      const { error: pdfErr } = await supabase.storage
        .from('media')
        .upload(pdfPath, file, { contentType: 'application/pdf' })
      if (pdfErr) throw pdfErr

      if (chosenBlob) {
        const { error: coverErr } = await supabase.storage
          .from('media')
          .upload(coverPath, chosenBlob, { contentType: coverContentType })
        if (coverErr) throw coverErr
      }

      const book = await createBook({
        title: title.trim(),
        author: author.trim() || null,
        storage_path: pdfPath,
        page_count: pageCount,
        cover_path: chosenBlob ? coverPath : null,
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
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-hidden grid-rows-[auto_minmax(0,1fr)]">
        <DialogHeader className="min-w-0">
          <DialogTitle className="truncate">Agregar libro</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 min-w-0 overflow-y-auto pr-1">
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
              <div className="size-12 shrink-0 rounded bg-secondary flex items-center justify-center">
                <FileText className="size-5 text-muted-foreground" />
              </div>
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
              {/* Cover selector */}
              <div className="space-y-1.5">
                <Label>Portada</Label>
                <div className="grid grid-cols-[100px_1fr] gap-3">
                  {/* Preview */}
                  <div className="aspect-[2/3] rounded-md overflow-hidden bg-secondary/40 ring-1 ring-border/60 flex items-center justify-center">
                    {processing && coverMode === 'auto' ? (
                      <Loader2 className="size-5 text-muted-foreground animate-spin" />
                    ) : coverMode === 'manual' && manualCoverPreview ? (
                      <img src={manualCoverPreview} alt="cover" className="w-full h-full object-cover" />
                    ) : coverMode === 'auto' && autoCoverPreview ? (
                      <img src={autoCoverPreview} alt="cover" className="w-full h-full object-cover" />
                    ) : (
                      <FileImage className="size-6 text-muted-foreground/40" />
                    )}
                  </div>

                  {/* Mode buttons */}
                  <div className="flex flex-col gap-1.5">
                    <button
                      type="button"
                      onClick={() => setCoverMode('auto')}
                      disabled={!autoCoverBlob}
                      className={cn(
                        'flex items-start gap-2 px-3 py-2 rounded-md border text-xs text-left transition-colors',
                        coverMode === 'auto'
                          ? 'bg-primary/10 border-primary/40 text-foreground'
                          : 'border-border/60 text-muted-foreground hover:text-foreground hover:bg-secondary/40',
                        !autoCoverBlob && 'opacity-50 cursor-not-allowed',
                      )}
                    >
                      <Sparkles className="size-3.5 mt-0.5 shrink-0" />
                      <div className="min-w-0">
                        <p className="font-medium">Primera página del PDF</p>
                        <p className="text-[10px] text-muted-foreground/80">Generada automáticamente</p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => coverInputRef.current?.click()}
                      className={cn(
                        'flex items-start gap-2 px-3 py-2 rounded-md border text-xs text-left transition-colors',
                        coverMode === 'manual' && manualCoverBlob
                          ? 'bg-primary/10 border-primary/40 text-foreground'
                          : 'border-border/60 text-muted-foreground hover:text-foreground hover:bg-secondary/40',
                      )}
                    >
                      <ImagePlus className="size-3.5 mt-0.5 shrink-0" />
                      <div className="min-w-0">
                        <p className="font-medium">
                          {manualCoverBlob ? 'Cambiar imagen…' : 'Subir imagen…'}
                        </p>
                        <p className="text-[10px] text-muted-foreground/80">JPG / PNG / WEBP</p>
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
