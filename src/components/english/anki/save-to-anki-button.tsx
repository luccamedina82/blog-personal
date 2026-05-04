import { useState, useEffect } from 'react'
import { Layers } from 'lucide-react'
import { toast } from 'sonner'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { listDecks, createCard } from '@/lib/english/queries'
import type { Card, Deck } from '@/lib/english/types'

interface SaveToAnkiButtonProps {
  front: string
  back: string
  sourceKind?: Card['source_kind']
  sourceRef?: string
}

export function SaveToAnkiButton({ front, back, sourceKind, sourceRef }: SaveToAnkiButtonProps) {
  const [open, setOpen] = useState(false)
  const [decks, setDecks] = useState<Deck[]>([])
  const [deckId, setDeckId] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open && decks.length === 0) {
      listDecks()
        .then(setDecks)
        .catch(() => toast.error('Failed to load decks'))
    }
  }, [open, decks.length])

  async function handleSave() {
    if (!deckId) return
    setSaving(true)
    try {
      await createCard({
        deck_id: deckId,
        front,
        back,
        tags: [],
        source_kind: sourceKind ?? null,
        source_ref: sourceRef ?? null,
      })
      toast.success('Card added to deck')
      setOpen(false)
      setDeckId('')
    } catch {
      toast.error('Failed to save card')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="size-7 text-muted-foreground hover:text-primary"
        onClick={() => setOpen(true)}
        title="Save to Anki"
      >
        <Layers className="size-3.5" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Save to Anki</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <div className="rounded-md border border-border/70 bg-card/40 p-3 text-sm">
              <p className="font-mono text-foreground">{front}</p>
              <p className="text-muted-foreground mt-1">{back}</p>
            </div>

            <Select value={deckId} onValueChange={setDeckId}>
              <SelectTrigger>
                <SelectValue placeholder="Select deck…" />
              </SelectTrigger>
              <SelectContent>
                {decks.length === 0 ? (
                  <div className="px-3 py-2 text-sm text-muted-foreground">No decks yet</div>
                ) : (
                  decks.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!deckId || saving}>
              {saving ? 'Saving…' : 'Add card'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
