import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { updateBook } from '@/lib/library/queries'
import type { LibraryBook, LibraryModuleTag } from '@/lib/library/types'

const MODULE_OPTIONS: { value: LibraryModuleTag; label: string }[] = [
  { value: 'faculty', label: 'Faculty' },
  { value: 'devlab', label: 'Dev Lab' },
  { value: 'english', label: 'English' },
]

interface Props {
  open: boolean
  onOpenChange: (v: boolean) => void
  book: LibraryBook
  onUpdated: (book: LibraryBook) => void
}

export function BookEditDialog({ open, onOpenChange, book, onUpdated }: Props) {
  'use no memo'
  const [title, setTitle] = useState('')
  const [author, setAuthor] = useState('')
  const [tags, setTags] = useState('')
  const [moduleTags, setModuleTags] = useState<LibraryModuleTag[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setTitle(book.title)
    setAuthor(book.author ?? '')
    setTags(book.tags.join(', '))
    setModuleTags(book.module_tags)
  }, [open, book.id])

  function toggleModuleTag(tag: LibraryModuleTag) {
    setModuleTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const updated = await updateBook(book.id, {
        title: title.trim(),
        author: author.trim() || null,
        tags: tags ? tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
        module_tags: moduleTags,
      })
      onUpdated(updated)
      onOpenChange(false)
    } catch {
      // toast handled by caller
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Editar libro</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
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
