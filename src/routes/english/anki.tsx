import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { DeckGrid } from '@/components/english/anki/deck-grid'
import { DeckView } from '@/components/english/anki/deck-view'
import { StudyMode } from '@/components/english/anki/study-mode'
import { listDecksWithCardCount } from '@/lib/english/queries'
import type { Deck } from '@/lib/english/types'
import type { DeckWithCount } from '@/lib/english/queries'

export const Route = createFileRoute('/english/anki')({
  component: AnkiPage,
})

type View =
  | { kind: 'grid' }
  | { kind: 'deck'; deckId: string }
  | { kind: 'study'; deckId: string }

function AnkiPage() {
  const [view, setView] = useState<View>({ kind: 'grid' })
  const [decks, setDecks] = useState<DeckWithCount[]>([])

  useEffect(() => {
    listDecksWithCardCount()
      .then(setDecks)
      .catch(() => toast.error('Failed to load decks'))
  }, [])

  function handleDeckCreated(deck: Deck) {
    setDecks((prev) => [{ ...deck, card_count: 0 }, ...prev])
  }

  function handleDeckDeleted(id: string) {
    setDecks((prev) => prev.filter((d) => d.id !== id))
    if (view.kind !== 'grid' && (view as any).deckId === id) {
      setView({ kind: 'grid' })
    }
  }

  if (view.kind === 'deck') {
    const deck = decks.find((d) => d.id === view.deckId)
    if (!deck) return null
    return (
      <DeckView
        deck={deck}
        onBack={() => setView({ kind: 'grid' })}
        onStudy={() => setView({ kind: 'study', deckId: view.deckId })}
        onCardCountChange={(delta) =>
          setDecks((prev) =>
            prev.map((d) =>
              d.id === view.deckId ? { ...d, card_count: d.card_count + delta } : d,
            ),
          )
        }
      />
    )
  }

  if (view.kind === 'study') {
    return (
      <StudyMode
        deckId={view.deckId}
        onBack={() => setView({ kind: 'deck', deckId: view.deckId })}
      />
    )
  }

  return (
    <DeckGrid
      decks={decks}
      onSelect={(deckId) => setView({ kind: 'deck', deckId })}
      onCreated={handleDeckCreated}
      onDeleted={handleDeckDeleted}
    />
  )
}
