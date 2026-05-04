import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { DEVLAB_ICON_NAMES, DEVLAB_ICON_MAP, getDevLabIcon } from './icon-map'
import { cn } from '@/lib/utils'
import type { DevLabCategory } from '@/lib/devlab/types'

export type CategoryPayload = {
  slug: string
  label: string
  description: string
  icon: string
}

interface CategoryFormProps {
  open: boolean
  onOpenChange: (v: boolean) => void
  initial?: DevLabCategory | null
  onSubmit: (payload: CategoryPayload) => Promise<void>
}

export function CategoryForm({ open, onOpenChange, initial, onSubmit }: CategoryFormProps) {
  const [label, setLabel] = useState('')
  const [description, setDescription] = useState('')
  const [icon, setIcon] = useState('Cpu')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open) return
    setLabel(initial?.label ?? '')
    setDescription(initial?.description ?? '')
    setIcon(initial?.icon ?? 'Cpu')
  }, [open, initial?.id])

  function slugify(text: string) {
    return text.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!label.trim()) return
    setLoading(true)
    try {
      await onSubmit({
        slug: slugify(label),
        label: label.trim(),
        description: description.trim(),
        icon,
      })
      onOpenChange(false)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{initial ? 'Edit category' : 'New category'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              Label
            </label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. Compilers"
              autoFocus
              className="w-full h-9 rounded-md border border-border/60 bg-background/40 px-3 text-sm text-foreground placeholder:text-muted-foreground/40 outline-none focus:border-primary/40 transition-colors"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              Description
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Short description"
              className="w-full h-9 rounded-md border border-border/60 bg-background/40 px-3 text-sm text-foreground placeholder:text-muted-foreground/40 outline-none focus:border-primary/40 transition-colors"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              Icon
            </label>
            <div className="grid grid-cols-10 gap-1">
              {DEVLAB_ICON_NAMES.map((name) => {
                const Icon = DEVLAB_ICON_MAP[name]
                return (
                  <button
                    key={name}
                    type="button"
                    title={name}
                    onClick={() => setIcon(name)}
                    className={cn(
                      'flex items-center justify-center size-8 rounded-md border transition-colors',
                      icon === name
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border/50 bg-secondary/30 text-muted-foreground hover:text-foreground hover:border-border',
                    )}
                  >
                    <Icon className="size-3.5" />
                  </button>
                )
              })}
            </div>
            <p className="text-[11px] text-muted-foreground/60">{icon}</p>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={loading || !label.trim()}>
              {initial ? 'Save changes' : 'Create'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export { getDevLabIcon }
