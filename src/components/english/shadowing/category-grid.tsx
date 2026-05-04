import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ChevronRight, Plus, Pencil, Trash2, Layers } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import {
  Form, FormField, FormItem, FormLabel, FormControl, FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import {
  createShadowingCategory,
  updateShadowingCategory,
  deleteShadowingCategory,
} from '@/lib/english/queries'
import type { ShadowingCategory } from '@/lib/english/types'

const schema = z.object({
  name: z.string().min(1, 'Required'),
  description: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

type CategoryWithCount = ShadowingCategory & { session_count: number }

interface CategoryGridProps {
  categories: CategoryWithCount[]
  totalSessions: number
  onSelectAll: () => void
  onSelectCategory: (id: string, name: string) => void
  onCreated: (cat: ShadowingCategory) => void
  onUpdated: (id: string, patch: { name: string; description: string | null }) => void
  onDeleted: (id: string) => void
}

export function CategoryGrid({
  categories,
  totalSessions,
  onSelectAll,
  onSelectCategory,
  onCreated,
  onUpdated,
  onDeleted,
}: CategoryGridProps) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<CategoryWithCount | null>(null)

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', description: '' },
  })

  function openCreate() {
    setEditing(null)
    form.reset({ name: '', description: '' })
    setDialogOpen(true)
  }

  function openEdit(cat: CategoryWithCount) {
    setEditing(cat)
    form.reset({ name: cat.name, description: cat.description ?? '' })
    setDialogOpen(true)
  }

  async function handleSubmit(values: FormValues) {
    const description = values.description?.trim() || null
    try {
      if (editing) {
        await updateShadowingCategory(editing.id, { name: values.name.trim(), description })
        onUpdated(editing.id, { name: values.name.trim(), description })
        toast.success('Category updated')
      } else {
        const cat = await createShadowingCategory({ name: values.name.trim(), description })
        onCreated(cat)
        toast.success('Category created')
      }
      setDialogOpen(false)
    } catch {
      toast.error(editing ? 'Failed to update' : 'Failed to create')
    }
  }

  async function handleDelete(id: string, name: string) {
    try {
      await deleteShadowingCategory(id)
      onDeleted(id)
      toast.success(`"${name}" deleted`)
    } catch {
      toast.error('Failed to delete')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-1">Shadowing</p>
          <h2 className="text-xl font-medium tracking-tight">Studio</h2>
        </div>
        <Button size="sm" className="gap-1.5 shrink-0" onClick={openCreate}>
          <Plus className="size-3.5" />
          New category
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
        {/* "All sessions" card */}
        <button
          type="button"
          onClick={onSelectAll}
          className={cn(
            'group flex flex-col items-start gap-3 rounded-lg border border-border/70',
            'bg-card/40 hover:bg-card/80 p-5 text-left transition-all duration-200',
            'hover:border-primary/30 hover:shadow-[0_0_0_1px_hsl(var(--primary)/0.15)]',
          )}
        >
          <div className="flex w-full items-start justify-between">
            <span className="flex size-9 items-center justify-center rounded-md bg-secondary/60 border border-border/60">
              <Layers className="size-4 text-primary" />
            </span>
            <ChevronRight className="size-4 text-muted-foreground/40 group-hover:text-primary transition-colors mt-1" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">All sessions</p>
            <p className="mt-1 text-xs text-muted-foreground">Every recording across all categories</p>
          </div>
          <p className="text-[10px] text-muted-foreground/60 tabular-nums">
            {totalSessions} {totalSessions === 1 ? 'session' : 'sessions'}
          </p>
        </button>

        {/* Category cards */}
        {categories.map((cat) => (
          <div
            key={cat.id}
            className={cn(
              'group relative flex flex-col items-start gap-3 rounded-lg border border-border/70',
              'bg-card/40 hover:bg-card/80 p-5 transition-all duration-200',
              'hover:border-primary/30 hover:shadow-[0_0_0_1px_hsl(var(--primary)/0.15)]',
            )}
          >
            <div className="flex w-full items-start justify-between">
              <span className="flex size-9 items-center justify-center rounded-md bg-secondary/60 border border-border/60">
                <Layers className="size-4 text-primary" />
              </span>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7 text-muted-foreground/60 hover:text-foreground"
                  onClick={(e) => { e.stopPropagation(); openEdit(cat) }}
                >
                  <Pencil className="size-3.5" />
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7 text-muted-foreground/60 hover:text-destructive"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete "{cat.name}"?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Sessions in this category become uncategorized. Recordings are not deleted.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => handleDelete(cat.id, cat.name)}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>

            <button
              type="button"
              className="w-full text-left"
              onClick={() => onSelectCategory(cat.id, cat.name)}
            >
              <p className="text-sm font-medium text-foreground">{cat.name}</p>
              {cat.description && (
                <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{cat.description}</p>
              )}
            </button>

            <p className="text-[10px] text-muted-foreground/60 tabular-nums">
              {cat.session_count} {cat.session_count === 1 ? 'session' : 'sessions'}
            </p>
          </div>
        ))}
      </div>

      {/* Create / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit category' : 'New category'}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. BBC 6 Minute English" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Description{' '}
                      <span className="text-muted-foreground font-normal">(optional)</span>
                    </FormLabel>
                    <FormControl>
                      <Textarea rows={2} className="resize-none" placeholder="What's in this category" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting ? 'Saving…' : 'Save'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
