import { useState, useEffect } from 'react'
import { ArrowLeft, Plus, Pencil, Trash2, GraduationCap, Link2 } from 'lucide-react'
import { toast } from 'sonner'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { CardEditor } from './card-editor'
import { listCards, createCard, updateCard, deleteCard } from '@/lib/english/queries'
import type { Card, Deck } from '@/lib/english/types'

const SOURCE_LABEL: Record<NonNullable<Card['source_kind']>, string> = {
  devlab: 'DevLab',
  faculty: 'Faculty',
  bitacora: 'Journal',
  book: 'Book',
  evaluator: 'Evaluator',
  vocab: 'Vocab',
}

interface DeckViewProps {
  deck: Deck & { card_count: number }
  onBack: () => void
  onStudy: () => void
  onCardCountChange: (delta: number) => void
}

export function DeckView({ deck, onBack, onStudy, onCardCountChange }: DeckViewProps) {
  const [cards, setCards] = useState<Card[]>([])
  const [loading, setLoading] = useState(true)
  const [editorOpen, setEditorOpen] = useState(false)
  const [editing, setEditing] = useState<Card | undefined>()

  useEffect(() => {
    setLoading(true)
    listCards(deck.id)
      .then(setCards)
      .catch(() => toast.error('Failed to load cards'))
      .finally(() => setLoading(false))
  }, [deck.id])

  const dueCount = cards.filter((c) => new Date(c.due) <= new Date()).length

  function openCreate() {
    setEditing(undefined)
    setEditorOpen(true)
  }

  function openEdit(card: Card) {
    setEditing(card)
    setEditorOpen(true)
  }

  async function handleSubmit(values: Pick<Card, 'front' | 'back' | 'tags'>) {
    if (editing) {
      await updateCard(editing.id, values)
      setCards((prev) => prev.map((c) => (c.id === editing.id ? { ...c, ...values } : c)))
      toast.success('Card updated')
    } else {
      await createCard({
        deck_id: deck.id,
        front: values.front,
        back: values.back,
        tags: values.tags,
        source_kind: null,
        source_ref: null,
      })
      const fresh = await listCards(deck.id)
      setCards(fresh)
      onCardCountChange(+1)
      toast.success('Card added')
    }
  }

  async function handleDelete(id: string) {
    await deleteCard(id)
    setCards((prev) => prev.filter((c) => c.id !== id))
    onCardCountChange(-1)
    toast.success('Card deleted')
  }

  return (
    <div className="space-y-7">
      {/* Breadcrumb */}
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="size-3.5" />
        All decks
      </button>

      {/* Header card */}
      <div className="rounded-2xl border border-border/60 bg-gradient-to-br from-card to-card/40 p-6 shadow-sm">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-1.5">
              {deck.category.replace('-', ' ')}
            </p>
            <h2 className="text-2xl font-semibold tracking-tight">{deck.name}</h2>
            {deck.description && (
              <p className="mt-2 text-sm text-muted-foreground max-w-prose">{deck.description}</p>
            )}
          </div>
          <div className="flex gap-2 shrink-0">
            {dueCount > 0 && (
              <Button size="sm" className="gap-1.5" onClick={onStudy}>
                <GraduationCap className="size-3.5" />
                Study ({dueCount} due)
              </Button>
            )}
            <Button size="sm" variant="outline" className="gap-1.5" onClick={openCreate}>
              <Plus className="size-3.5" />
              Add card
            </Button>
          </div>
        </div>

        {/* Stats row */}
        {!loading && cards.length > 0 && (
          <div className="mt-5 flex gap-6 pt-5 border-t border-border/40">
            <div>
              <p className="text-2xl font-semibold tabular-nums">{cards.length}</p>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground mt-0.5">Total</p>
            </div>
            <div>
              <p className={cn('text-2xl font-semibold tabular-nums', dueCount > 0 ? 'text-primary' : 'text-foreground')}>
                {dueCount}
              </p>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground mt-0.5">Due</p>
            </div>
            <div>
              <p className="text-2xl font-semibold tabular-nums text-muted-foreground">
                {cards.length - dueCount}
              </p>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground mt-0.5">Aprendidas</p>
            </div>
          </div>
        )}
      </div>

      {/* Cards list */}
      {loading ? (
        <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
          <span className="size-1.5 rounded-full bg-muted-foreground/60 animate-pulse" />
          Loading cards…
        </div>
      ) : cards.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center gap-3 rounded-2xl border border-dashed border-border/60">
          <span className="flex size-12 items-center justify-center rounded-full bg-secondary/60 border border-border/60">
            <Plus className="size-5 text-muted-foreground/60" />
          </span>
          <div>
            <h3 className="text-sm font-medium">No cards</h3>
            <p className="mt-1 text-xs text-muted-foreground">Add one to get started.</p>
          </div>
        </div>
      ) : (
        <ul className="space-y-2">
          {cards.map((card) => {
            const isDue = new Date(card.due) <= new Date()
            return (
              <li
                key={card.id}
                className="group rounded-xl border border-border/60 bg-card/30 hover:bg-card/60 hover:border-primary/30 transition-all"
              >
                <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)_auto] gap-3 md:gap-5 items-start p-4">
                  {/* Front */}
                  <div className="min-w-0 space-y-1.5">
                    <p className="text-[9px] uppercase tracking-[0.22em] text-muted-foreground/60">Front</p>
                    <p className="font-mono text-sm text-foreground leading-snug line-clamp-3 break-words">
                      {card.front}
                    </p>
                    {card.source_kind && (
                      <span className="inline-flex items-center gap-1 text-[10px] text-primary/70">
                        <Link2 className="size-2.5 shrink-0" />
                        {SOURCE_LABEL[card.source_kind]}
                      </span>
                    )}
                  </div>

                  {/* Back */}
                  <div className="min-w-0 space-y-1.5">
                    <p className="text-[9px] uppercase tracking-[0.22em] text-muted-foreground/60">Back</p>
                    <p className="text-sm text-muted-foreground leading-snug line-clamp-3 break-words">
                      {card.back}
                    </p>
                    {card.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-0.5">
                        {card.tags.slice(0, 4).map((t) => (
                          <Badge
                            key={t}
                            variant="secondary"
                            className="text-[10px] px-1.5 py-0 font-normal bg-secondary/60 border border-border/40"
                          >
                            {t}
                          </Badge>
                        ))}
                        {card.tags.length > 4 && (
                          <span className="text-[10px] text-muted-foreground/60 px-1">
                            +{card.tags.length - 4}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Due + actions */}
                  <div className="flex items-center gap-1 shrink-0 md:flex-col md:items-end md:gap-2 md:pt-4">
                    <div className="whitespace-nowrap order-2 md:order-1">
                      {isDue ? (
                        <span className="inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded-full bg-primary/15 text-primary font-medium">
                          <span className="size-1 rounded-full bg-primary animate-pulse" />
                          Due now
                        </span>
                      ) : (
                        <span className="text-[11px] text-muted-foreground">
                          {new Date(card.due).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-0.5 order-1 md:order-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7 text-muted-foreground hover:text-foreground"
                        onClick={() => openEdit(card)}
                      >
                        <Pencil className="size-3.5" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-7 text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete this card?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(card.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      <CardEditor
        open={editorOpen}
        onOpenChange={setEditorOpen}
        initial={editing}
        onSubmit={handleSubmit}
      />
    </div>
  )
}
