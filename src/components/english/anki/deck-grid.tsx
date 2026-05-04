import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ChevronRight, Plus, Trash2, BookOpen, ArrowLeftRight, Lightbulb, BookMarked, Code2 } from 'lucide-react'
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
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { createDeck, deleteDeck } from '@/lib/english/queries'
import type { Deck } from '@/lib/english/types'
import type { DeckWithCount } from '@/lib/english/queries'
import type { LucideIcon } from 'lucide-react'

const DECK_CATEGORIES: Array<{ value: Deck['category']; label: string; icon: LucideIcon }> = [
  { value: 'vocab', label: 'Vocabulary', icon: BookOpen },
  { value: 'phrasal', label: 'Phrasal Verbs', icon: ArrowLeftRight },
  { value: 'idioms', label: 'Idioms', icon: Lightbulb },
  { value: 'book-quotes', label: 'Book Quotes', icon: BookMarked },
  { value: 'tech-notes', label: 'Tech Notes', icon: Code2 },
]

const deckSchema = z.object({
  name: z.string().min(1, 'Required'),
  category: z.enum(['vocab', 'phrasal', 'idioms', 'book-quotes', 'tech-notes']),
  description: z.string().optional(),
})

type DeckFormValues = z.infer<typeof deckSchema>

interface DeckGridProps {
  decks: DeckWithCount[]
  onSelect: (deckId: string) => void
  onCreated: (deck: Deck) => void
  onDeleted: (deckId: string) => void
}

export function DeckGrid({ decks, onSelect, onCreated, onDeleted }: DeckGridProps) {
  const [createOpen, setCreateOpen] = useState(false)

  const form = useForm<DeckFormValues>({
    resolver: zodResolver(deckSchema),
    defaultValues: { name: '', category: 'vocab', description: '' },
  })

  async function handleCreate(values: DeckFormValues) {
    try {
      const deck = await createDeck({
        name: values.name.trim(),
        category: values.category,
        description: values.description?.trim() || null,
      })
      onCreated(deck)
      form.reset()
      setCreateOpen(false)
      toast.success('Deck created')
    } catch {
      toast.error('Failed to create deck')
    }
  }

  async function handleDelete(id: string, name: string) {
    try {
      await deleteDeck(id)
      onDeleted(id)
      toast.success(`"${name}" deleted`)
    } catch {
      toast.error('Failed to delete deck')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-1">Anki</p>
          <h2 className="text-xl font-medium tracking-tight">Decks</h2>
          <p className="mt-1 text-sm text-muted-foreground max-w-lg">
            Spaced-repetition flashcard decks. Cards come due based on how well you know them.
          </p>
        </div>
        <Button size="sm" className="gap-1.5 shrink-0" onClick={() => setCreateOpen(true)}>
          <Plus className="size-3.5" />
          New deck
        </Button>
      </div>

      {decks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-sm text-muted-foreground">No decks yet. Create one to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {decks.map((deck) => {
            const cat = DECK_CATEGORIES.find((c) => c.value === deck.category)
            const Icon = cat?.icon ?? BookOpen
            return (
              <div
                key={deck.id}
                className={cn(
                  'group relative flex flex-col items-start gap-3 rounded-lg border border-border/70',
                  'bg-card/40 hover:bg-card/80 p-5 text-left transition-all duration-200',
                  'hover:border-primary/30 hover:shadow-[0_0_0_1px_hsl(var(--primary)/0.15)]',
                )}
              >
                <div className="flex w-full items-start justify-between">
                  <span className="flex size-9 items-center justify-center rounded-md bg-secondary/60 border border-border/60">
                    <Icon className="size-4 text-primary" />
                  </span>
                  <div className="flex items-center gap-1">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7 text-muted-foreground/40 hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete "{deck.name}"?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This deletes the deck and all {deck.card_count} cards permanently.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDelete(deck.id, deck.name)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                    <button
                      type="button"
                      onClick={() => onSelect(deck.id)}
                      className="flex size-7 items-center justify-center rounded text-muted-foreground/40 group-hover:text-primary transition-colors"
                    >
                      <ChevronRight className="size-4" />
                    </button>
                  </div>
                </div>

                <button
                  type="button"
                  className="w-full text-left"
                  onClick={() => onSelect(deck.id)}
                >
                  <p className="text-sm font-medium text-foreground">{deck.name}</p>
                  {deck.description && (
                    <p className="mt-1 text-xs text-muted-foreground leading-relaxed line-clamp-2">
                      {deck.description}
                    </p>
                  )}
                </button>

                <p className="text-[10px] text-muted-foreground/60 tabular-nums">
                  {deck.card_count} {deck.card_count === 1 ? 'card' : 'cards'}
                  {' · '}
                  {cat?.label ?? deck.category}
                </p>
              </div>
            )
          })}
        </div>
      )}

      {/* Create deck dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New deck</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleCreate)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Advanced Vocab" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {DECK_CATEGORIES.map((c) => (
                          <SelectItem key={c.value} value={c.value}>
                            {c.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
                      <Textarea
                        placeholder="What this deck is for"
                        className="resize-none"
                        rows={2}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setCreateOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting ? 'Creating…' : 'Create'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
