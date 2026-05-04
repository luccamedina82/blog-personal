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
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import type { VocabEntry } from '@/lib/english/types'

const schema = z.object({
  kind: z.enum(['word', 'phrase', 'connector']),
  term: z.string().min(1, 'Required'),
  meaning: z.string().min(1, 'Required'),
  example: z.string().optional(),
  tags: z.string(),
})

type FormValues = z.infer<typeof schema>
type VocabPayload = Pick<VocabEntry, 'kind' | 'term' | 'meaning' | 'example' | 'tags'>

interface VocabFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initial?: VocabEntry
  onSubmit: (values: VocabPayload) => Promise<void>
}

export function VocabForm({ open, onOpenChange, initial, onSubmit }: VocabFormProps) {
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      kind: 'word',
      term: '',
      meaning: '',
      example: '',
      tags: '',
    },
  })

  useEffect(() => {
    if (open) {
      form.reset({
        kind: initial?.kind ?? 'word',
        term: initial?.term ?? '',
        meaning: initial?.meaning ?? '',
        example: initial?.example ?? '',
        tags: initial?.tags.join(', ') ?? '',
      })
    }
  }, [open, initial?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSubmit(values: FormValues) {
    await onSubmit({
      kind: values.kind,
      term: values.term.trim(),
      meaning: values.meaning.trim(),
      example: values.example?.trim() || null,
      tags: values.tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
    })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{initial ? 'Edit entry' : 'Add entry'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="kind"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Kind</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select kind" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="word">Word</SelectItem>
                      <SelectItem value="phrase">Phrase</SelectItem>
                      <SelectItem value="connector">Connector</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="term"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Term</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. ephemeral" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="meaning"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Meaning</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Definition or translation"
                      className="resize-none"
                      rows={2}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="example"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Example <span className="text-muted-foreground font-normal">(optional)</span></FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Example sentence"
                      className="resize-none"
                      rows={2}
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
                  <FormLabel>Tags <span className="text-muted-foreground font-normal">(comma-separated, optional)</span></FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. formal, writing, C1" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => onOpenChange(false)}
              >
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
