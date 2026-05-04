import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Star } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  Form, FormField, FormItem, FormLabel, FormControl, FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import type { Book } from '@/lib/english/types'

const schema = z.object({
  title: z.string().min(1, 'Required'),
  author: z.string().optional(),
  rating: z.number().min(0).max(5),
  summary: z.string().optional(),
  tags: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

export type BookPayload = {
  title: string
  author: string | null
  rating: number | null
  summary: string | null
  tags: string[]
}

interface BookFormProps {
  open: boolean
  onOpenChange: (v: boolean) => void
  initial?: Book | null
  onSubmit: (values: BookPayload) => Promise<void>
}

export function BookForm({ open, onOpenChange, initial, onSubmit }: BookFormProps) {
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { title: '', author: '', rating: 0, summary: '', tags: '' },
  })

  useEffect(() => {
    if (!open) return
    form.reset({
      title: initial?.title ?? '',
      author: initial?.author ?? '',
      rating: initial?.rating ?? 0,
      summary: initial?.summary ?? '',
      tags: (initial?.tags ?? []).join(', '),
    })
  }, [open, initial?.id])

  async function handleSubmit(values: FormValues) {
    await onSubmit({
      title: values.title.trim(),
      author: values.author?.trim() || null,
      rating: values.rating || null,
      summary: values.summary?.trim() || null,
      tags: values.tags ? values.tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
    })
    onOpenChange(false)
  }

  const rating = form.watch('rating')

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{initial ? 'Edit book' : 'Add book'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. The Remains of the Day" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="author"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Author{' '}
                    <span className="text-muted-foreground font-normal">(optional)</span>
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Kazuo Ishiguro" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormItem>
              <FormLabel>Rating</FormLabel>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => form.setValue('rating', rating === n ? 0 : n)}
                    className="p-0.5"
                  >
                    <Star
                      className={cn(
                        'size-5 transition-colors',
                        n <= rating ? 'fill-primary text-primary' : 'text-muted-foreground/30',
                      )}
                    />
                  </button>
                ))}
              </div>
            </FormItem>
            <FormField
              control={form.control}
              name="summary"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Summary{' '}
                    <span className="text-muted-foreground font-normal">(optional)</span>
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      rows={3}
                      className="resize-none"
                      placeholder="Brief summary or thoughts…"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="tags"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Tags{' '}
                    <span className="text-muted-foreground font-normal">(optional, comma-separated)</span>
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Novel, Memoir" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
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
  )
}
