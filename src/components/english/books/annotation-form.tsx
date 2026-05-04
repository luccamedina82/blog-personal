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
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import type { BookAnnotation } from '@/lib/english/types'

const schema = z.object({
  kind: z.enum(['quote', 'note', 'highlight']),
  content: z.string().min(1, 'Required'),
  page: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

export type AnnotationPayload = {
  kind: BookAnnotation['kind']
  content: string
  page: number | null
}

interface AnnotationFormProps {
  open: boolean
  onOpenChange: (v: boolean) => void
  onSubmit: (values: AnnotationPayload) => Promise<void>
}

export function AnnotationForm({ open, onOpenChange, onSubmit }: AnnotationFormProps) {
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { kind: 'quote', content: '', page: '' },
  })

  useEffect(() => {
    if (open) form.reset({ kind: 'quote', content: '', page: '' })
  }, [open])

  async function handleSubmit(values: FormValues) {
    const raw = values.page ? parseInt(values.page, 10) : null
    const page = raw !== null && !isNaN(raw) ? raw : null
    await onSubmit({ kind: values.kind, content: values.content.trim(), page })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Add annotation</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="kind"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Kind</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="quote">Quote</SelectItem>
                      <SelectItem value="note">Note</SelectItem>
                      <SelectItem value="highlight">Highlight</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Content</FormLabel>
                  <FormControl>
                    <Textarea
                      rows={4}
                      className="resize-none"
                      placeholder="Paste or write the text…"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="page"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Page{' '}
                    <span className="text-muted-foreground font-normal">(optional)</span>
                  </FormLabel>
                  <FormControl>
                    <Input type="number" min={1} placeholder="e.g. 42" {...field} />
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
                {form.formState.isSubmitting ? 'Adding…' : 'Add'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
