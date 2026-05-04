import { useRef, useState } from 'react'
import { Upload, FileAudio } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { uploadShadowingFile, createShadowingSession } from '@/lib/english/queries'
import type { ShadowingCategory, ShadowingSession } from '@/lib/english/types'

interface SessionUploadProps {
  categories: ShadowingCategory[]
  initialCategoryId?: string | null
  onCreated: (session: ShadowingSession) => void
  onCancel: () => void
}

function getDuration(file: File): Promise<number> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file)
    const el = file.type.startsWith('video/')
      ? document.createElement('video')
      : document.createElement('audio')
    el.src = url
    el.onloadedmetadata = () => { URL.revokeObjectURL(url); resolve(isFinite(el.duration) ? el.duration : 0) }
    el.onerror = () => { URL.revokeObjectURL(url); resolve(0) }
  })
}

export function SessionUpload({ categories, initialCategoryId, onCreated, onCancel }: SessionUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [title, setTitle] = useState('')
  const [categoryId, setCategoryId] = useState<string>(initialCategoryId ?? '')
  const [uploading, setUploading] = useState(false)

  function handleFile(f: File) {
    setFile(f)
    if (!title) setTitle(f.name.replace(/\.[^/.]+$/, ''))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!file || !title.trim()) return
    setUploading(true)
    try {
      const [storagePath, duration] = await Promise.all([
        uploadShadowingFile(file),
        getDuration(file),
      ])
      const kind = file.type.startsWith('video/') ? 'video' : 'audio'
      const session = await createShadowingSession({
        title: title.trim(),
        storage_path: storagePath,
        kind,
        duration_seconds: duration || null,
        category_id: categoryId || null,
      })
      toast.success('Session uploaded')
      onCreated(session)
    } catch {
      toast.error('Upload failed')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="max-w-md space-y-6">
      <div>
        <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-1">New session</p>
        <h2 className="text-xl font-medium tracking-tight">Upload recording</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
          className="flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-border/70 bg-card/20 p-10 cursor-pointer hover:border-primary/40 hover:bg-card/40 transition-colors"
        >
          {file ? (
            <>
              <FileAudio className="size-8 text-primary" />
              <p className="text-sm font-medium text-foreground">{file.name}</p>
              <p className="text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(1)} MB</p>
            </>
          ) : (
            <>
              <Upload className="size-8 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">Drop audio or video file here</p>
              <p className="text-xs text-muted-foreground/60">or click to browse</p>
            </>
          )}
          <input
            ref={inputRef}
            type="file"
            accept="audio/*,video/*"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="session-title">Title</Label>
          <Input
            id="session-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. BBC 6 Minute English — Apr 22"
          />
        </div>

        <div className="space-y-1.5">
          <Label>Category <span className="text-muted-foreground font-normal">(optional)</span></Label>
          <Select value={categoryId} onValueChange={setCategoryId}>
            <SelectTrigger>
              <SelectValue placeholder="Uncategorized" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Uncategorized</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-2 justify-end">
          <Button type="button" variant="ghost" onClick={onCancel} disabled={uploading}>
            Cancel
          </Button>
          <Button type="submit" disabled={!file || !title.trim() || uploading}>
            {uploading ? 'Uploading…' : 'Upload'}
          </Button>
        </div>
      </form>
    </div>
  )
}
