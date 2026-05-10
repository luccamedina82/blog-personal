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
import { CardEditor } from './card-editor'
import { listCards, createCard, updateCard, deleteCard } from '@/lib/english/queries'
import type { Card, Deck } from '@/lib/english/types'

const SOURCE_LABEL: Record<NonNullable<Card['source_kind']>, string> = {
  devlab: 'DevLab',
  faculty: 'Faculty',
  bitacora: 'Bitácora',
  book: 'Book',
  evaluator: 'Evaluator',
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
    <div className="space-y-6">
      {/* Breadcrumb */}
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="size-3.5" />
        All decks
      </button>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-1">
            {deck.category.replace('-', ' ')}
          </p>
          <h2 className="text-xl font-medium tracking-tight">{deck.name}</h2>
          {deck.description && (
            <p className="mt-1 text-sm text-muted-foreground">{deck.description}</p>
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

      {/* Cards table */}
      {loading ? (
        <p className="text-sm text-muted-foreground py-6">Loading…</p>
      ) : cards.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-sm text-muted-foreground">No cards yet. Add one to get started.</p>
        </div>
      ) : (
        <div className="rounded-lg border border-border/70 overflow-hidden bg-card/40">
          <div className="grid grid-cols-[1fr_1fr_auto_auto] text-[10px] uppercase tracking-[0.18em] text-muted-foreground bg-background/40 border-b border-border/70">
            <div className="px-4 py-2.5">Front</div>
            <div className="px-4 py-2.5">Back</div>
            <div className="px-4 py-2.5">Due</div>
            <div className="px-4 py-2.5" />
          </div>
          <ul className="divide-y divide-border/70">
            {cards.map((card) => {
              const isDue = new Date(card.due) <= new Date()
              return (
                <li
                  key={card.id}
                  className="grid grid-cols-[1fr_1fr_auto_auto] text-[13px] hover:bg-card/60 transition-colors"
                >
                  <div className="px-4 py-3 self-center">
                    <span className="font-mono text-foreground text-[13px] line-clamp-2">{card.front}</span>
                    {card.source_kind && (
                      <span className="mt-1 flex items-center gap-1 text-[10px] text-primary/70">
                        <Link2 className="size-2.5 shrink-0" />
                        {SOURCE_LABEL[card.source_kind]}
                      </span>
                    )}
                  </div>
                  <div className="px-4 py-3 text-muted-foreground self-center line-clamp-2">
                    {card.back}
                    {card.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {card.tags.map((t) => (
                          <Badge key={t} variant="secondary" className="text-[10px] px-1.5 py-0">
                            {t}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="px-4 py-3 self-center whitespace-nowrap">
                    {isDue ? (
                      <span className="text-[11px] text-primary font-medium">Due now</span>
                    ) : (
                      <span className="text-[11px] text-muted-foreground">
                        {new Date(card.due).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                    )}
                  </div>
                  <div className="px-3 py-3 flex items-center gap-1 self-center">
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
                </li>
              )
            })}
          </ul>
        </div>
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
