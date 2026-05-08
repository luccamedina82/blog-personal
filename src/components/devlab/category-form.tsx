import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { DEVLAB_ICON_NAMES, DEVLAB_ICON_MAP, getDevLabIcon } from './icon-map'
import { cn } from '@/lib/utils'
import type { DevLabCategory } from '@/lib/devlab/types'

const schema = z.object({
  label: z.string().min(1, 'Required'),
  description: z.string(),
  icon: z.string().min(1),
})

type FormValues = z.infer<typeof schema>

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

function slugify(text: string) {
  return text.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
}

export function CategoryForm({ open, onOpenChange, initial, onSubmit }: CategoryFormProps) {
  const { register, handleSubmit, watch, setValue, reset, formState: { isSubmitting, isValid } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { label: '', description: '', icon: 'Cpu' },
  })

  const icon = watch('icon')

  useEffect(() => {
    if (!open) return
    reset({
      label: initial?.label ?? '',
      description: initial?.description ?? '',
      icon: initial?.icon ?? 'Cpu',
    })
  }, [open, initial?.id])

  async function onValid(values: FormValues) {
    await onSubmit({
      slug: slugify(values.label),
      label: values.label.trim(),
      description: values.description.trim(),
      icon: values.icon,
    })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{initial ? 'Edit category' : 'New category'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onValid)} className="space-y-4 pt-1">
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              Label
            </label>
            <input
              {...register('label')}
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
              {...register('description')}
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
                    onClick={() => setValue('icon', name)}
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
            <Button type="submit" size="sm" disabled={isSubmitting || !isValid}>
              {initial ? 'Save changes' : 'Create'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export { getDevLabIcon }
