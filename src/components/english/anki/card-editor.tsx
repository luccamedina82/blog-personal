import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  Form, FormField, FormItem, FormLabel, FormControl, FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import type { Card } from '@/lib/english/types'

const schema = z.object({
  front: z.string().min(1, 'Required'),
  back: z.string().min(1, 'Required'),
  tags: z.string(),
})

type FormValues = z.infer<typeof schema>

interface CardEditorProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initial?: Card
  onSubmit: (values: Pick<Card, 'front' | 'back' | 'tags'>) => Promise<void>
}

export function CardEditor({ open, onOpenChange, initial, onSubmit }: CardEditorProps) {
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { front: '', back: '', tags: '' },
  })

  useEffect(() => {
    if (open) {
      form.reset({
        front: initial?.front ?? '',
        back: initial?.back ?? '',
        tags: initial?.tags.join(', ') ?? '',
      })
    }
  }, [open, initial?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSubmit(values: FormValues) {
    await onSubmit({
      front: values.front.trim(),
      back: values.back.trim(),
      tags: values.tags.split(',').map((t) => t.trim()).filter(Boolean),
    })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{initial ? 'Edit card' : 'Add card'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="front"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Front</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Question or term" className="resize-none" rows={3} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="back"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Back</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Answer or meaning" className="resize-none" rows={3} {...field} />
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
                    <span className="text-muted-foreground font-normal">(comma-separated, optional)</span>
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. C1, grammar, formal" {...field} />
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
