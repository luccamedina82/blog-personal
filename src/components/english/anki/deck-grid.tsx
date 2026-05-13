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

const DECK_CATEGORIES: Array<{
  value: Deck['category']
  label: string
  icon: LucideIcon
  tint: string
  iconColor: string
}> = [
  { value: 'vocab', label: 'Vocabulary', icon: BookOpen, tint: 'from-blue-500/10 to-blue-500/0 border-blue-500/30', iconColor: 'text-blue-400' },
  { value: 'phrasal', label: 'Phrasal Verbs', icon: ArrowLeftRight, tint: 'from-violet-500/10 to-violet-500/0 border-violet-500/30', iconColor: 'text-violet-400' },
  { value: 'idioms', label: 'Idioms', icon: Lightbulb, tint: 'from-amber-500/10 to-amber-500/0 border-amber-500/30', iconColor: 'text-amber-400' },
  { value: 'book-quotes', label: 'Book Quotes', icon: BookMarked, tint: 'from-rose-500/10 to-rose-500/0 border-rose-500/30', iconColor: 'text-rose-400' },
  { value: 'tech-notes', label: 'Tech Notes', icon: Code2, tint: 'from-emerald-500/10 to-emerald-500/0 border-emerald-500/30', iconColor: 'text-emerald-400' },
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
        <div className="flex flex-col items-center justify-center py-20 text-center gap-4 rounded-2xl border border-dashed border-border/60">
          <span className="flex size-14 items-center justify-center rounded-full bg-secondary/60 border border-border/60">
            <BookOpen className="size-6 text-muted-foreground/60" />
          </span>
          <div>
            <h3 className="text-base font-medium">No decks</h3>
            <p className="mt-1 text-sm text-muted-foreground">Create one to get started.</p>
          </div>
          <Button size="sm" className="gap-1.5 mt-2" onClick={() => setCreateOpen(true)}>
            <Plus className="size-3.5" />
            New deck
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3.5">
          {decks.map((deck) => {
            const cat = DECK_CATEGORIES.find((c) => c.value === deck.category)
            const Icon = cat?.icon ?? BookOpen
            return (
              <div
                key={deck.id}
                onClick={() => onSelect(deck.id)}
                className={cn(
                  'group relative flex flex-col gap-4 rounded-2xl border bg-gradient-to-br',
                  'p-5 text-left transition-all duration-200 cursor-pointer',
                  'hover:shadow-lg hover:shadow-black/5 hover:-translate-y-0.5',
                  cat?.tint ?? 'from-card to-card/40 border-border/60',
                )}
              >
                <div className="flex w-full items-start justify-between">
                  <span
                    className={cn(
                      'flex size-11 items-center justify-center rounded-xl border bg-background/40',
                      cat?.tint ? cat.tint.split(' ')[2] : 'border-border/60',
                    )}
                  >
                    <Icon className={cn('size-5', cat?.iconColor ?? 'text-primary')} />
                  </span>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7 text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent onClick={(e) => e.stopPropagation()}>
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
                </div>

                <div className="flex-1">
                  <p className="text-base font-medium text-foreground line-clamp-1">{deck.name}</p>
                  {deck.description ? (
                    <p className="mt-1 text-xs text-muted-foreground leading-relaxed line-clamp-2">
                      {deck.description}
                    </p>
                  ) : (
                    <p className="mt-1 text-xs text-muted-foreground/50 italic">No description</p>
                  )}
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-border/40">
                  <div className="flex items-center gap-2 text-[11px]">
                    <span className="text-foreground font-medium tabular-nums">{deck.card_count}</span>
                    <span className="text-muted-foreground">
                      {deck.card_count === 1 ? 'card' : 'cards'}
                    </span>
                    <span className="text-muted-foreground/40">·</span>
                    <span className="text-muted-foreground">{cat?.label ?? deck.category}</span>
                  </div>
                  <ChevronRight className="size-3.5 text-muted-foreground/40 group-hover:text-foreground group-hover:translate-x-0.5 transition-all" />
                </div>
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
