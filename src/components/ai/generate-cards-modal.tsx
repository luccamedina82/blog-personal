import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Loader2, Sparkles, Check } from 'lucide-react'
import { listDecks, bulkInsertCards } from '@/lib/english/queries'
import type { Deck, Card } from '@/lib/english/types'

type GeneratedCard = {
  front: string
  back: string
  tags: string[]
}

interface GenerateCardsModalProps {
  open: boolean
  onClose: () => void
  content: string
  sourceKind: Card['source_kind']
  sourceRef: string | null
}

export function GenerateCardsModal({
  open,
  onClose,
  content,
  sourceKind,
  sourceRef,
}: GenerateCardsModalProps) {
  const [decks, setDecks] = useState<Deck[]>([])
  const [deckId, setDeckId] = useState('')
  const [count, setCount] = useState(5)
  const [cards, setCards] = useState<GeneratedCard[]>([])
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (open) {
      listDecks()
        .then((ds) => {
          setDecks(ds)
          if (ds.length > 0 && !deckId) setDeckId(ds[0].id)
        })
        .catch(() => {})
    }
  }, [open])

  useEffect(() => {
    if (!open) {
      setCards([])
      setSelected(new Set())
      setLoading(false)
      setSaving(false)
      setSaved(false)
    }
  }, [open])

  const selectedDeck = decks.find((d) => d.id === deckId)

  async function handleGenerate() {
    if (!deckId || !content.trim()) return
    setLoading(true)
    setCards([])
    setSelected(new Set())
    try {
      const res = await fetch('/api/ai/generate-cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content,
          deck_category: selectedDeck?.category ?? 'tech-notes',
          count,
        }),
      })
      if (!res.ok) throw new Error()
      const data = (await res.json()) as { cards: GeneratedCard[] }
      setCards(data.cards)
      setSelected(new Set(data.cards.map((_, i) => i)))
    } catch {
      // silently fail — user retries
    } finally {
      setLoading(false)
    }
  }

  async function handleSave() {
    if (!deckId || selected.size === 0) return
    setSaving(true)
    try {
      const toSave = cards.filter((_, i) => selected.has(i))
      await bulkInsertCards(deckId, toSave, sourceKind, sourceRef)
      setSaved(true)
      setTimeout(() => onClose(), 1200)
    } catch {
      setSaving(false)
    }
  }

  function toggleCard(i: number) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(i)) next.delete(i)
      else next.add(i)
      return next
    })
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-sm font-medium">
            <Sparkles className="size-3.5 text-primary" />
            Generate Anki Cards
          </DialogTitle>
        </DialogHeader>

        <div className="flex items-end gap-3">
          <div className="flex-1">
            <label className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-1.5 block">
              Deck
            </label>
            {decks.length === 0 ? (
              <p className="text-xs text-muted-foreground py-1.5">
                No decks — create one in English → Anki
              </p>
            ) : (
              <select
                value={deckId}
                onChange={(e) => setDeckId(e.target.value)}
                className="w-full rounded-md border border-border/70 bg-background/60 px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40 transition-colors"
              >
                {decks.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            )}
          </div>
          <div className="w-20 shrink-0">
            <label className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-1.5 block">
              Count
            </label>
            <input
              type="number"
              min={3}
              max={20}
              value={count}
              onChange={(e) =>
                setCount(Math.max(3, Math.min(20, Number(e.target.value))))
              }
              className="w-full rounded-md border border-border/70 bg-background/60 px-3 py-1.5 text-sm text-foreground text-center focus:outline-none focus:ring-1 focus:ring-primary/40 transition-colors"
            />
          </div>
          <Button
            size="sm"
            onClick={handleGenerate}
            disabled={loading || !deckId || decks.length === 0}
            className="h-9 text-xs shrink-0"
          >
            {loading ? (
              <Loader2 className="size-3 animate-spin" />
            ) : (
              <Sparkles className="size-3" />
            )}
            {loading ? 'Generating…' : 'Generate'}
          </Button>
        </div>

        {cards.length > 0 && (
          <div className="space-y-2 mt-1">
            <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              {cards.length} cards · {selected.size} selected
            </p>
            {cards.map((c, i) => (
              <button
                key={i}
                type="button"
                onClick={() => toggleCard(i)}
                className={`w-full text-left rounded-md border px-3 py-2.5 transition-colors ${
                  selected.has(i)
                    ? 'border-primary/40 bg-primary/5'
                    : 'border-border/50 bg-background/40 opacity-50'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground leading-snug">
                      {c.front}
                    </p>
                    <p className="text-[11px] text-muted-foreground leading-relaxed mt-0.5">
                      {c.back}
                    </p>
                  </div>
                  {selected.has(i) && (
                    <Check className="size-3.5 text-primary shrink-0 mt-0.5" />
                  )}
                </div>
                {c.tags.length > 0 && (
                  <div className="flex gap-1 mt-1.5 flex-wrap">
                    {c.tags.map((t) => (
                      <span
                        key={t}
                        className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                )}
              </button>
            ))}
          </div>
        )}

        <DialogFooter className="pt-2">
          <Button variant="ghost" size="sm" onClick={onClose} className="text-xs">
            Cancel
          </Button>
          {cards.length > 0 && (
            <Button
              size="sm"
              onClick={handleSave}
              disabled={saving || saved || selected.size === 0}
              className="text-xs"
            >
              {saved ? (
                <>
                  <Check className="size-3 text-green-400" />
                  Saved!
                </>
              ) : saving ? (
                <>
                  <Loader2 className="size-3 animate-spin" />
                  Saving…
                </>
              ) : (
                `Save ${selected.size} card${selected.size !== 1 ? 's' : ''}`
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
