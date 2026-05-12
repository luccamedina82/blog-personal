import { useState, useEffect } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Layers, BookOpen, Mic, MessageSquare } from 'lucide-react'
import {
  CommandDialog, CommandInput, CommandList, CommandEmpty,
  CommandGroup, CommandItem,
} from '@/components/ui/command'
import { listDecks, listVocab, listBooks, listShadowingSessions } from '@/lib/english/queries'
import type { Deck, VocabEntry, Book, ShadowingSession } from '@/lib/english/types'

type Hit = { id: string; label: string; sub: string }

export function GlobalSearch() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [decks, setDecks] = useState<Deck[]>([])
  const [vocab, setVocab] = useState<VocabEntry[]>([])
  const [books, setBooks] = useState<Book[]>([])
  const [sessions, setSessions] = useState<ShadowingSession[]>([])
  const [loaded, setLoaded] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen((v) => !v)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    if (!open || loaded) return
    Promise.all([listDecks(), listVocab(), listBooks(), listShadowingSessions()])
      .then(([d, v, b, s]) => {
        setDecks(d)
        setVocab(v)
        setBooks(b)
        setSessions(s)
        setLoaded(true)
      })
      .catch(() => {})
  }, [open, loaded])

  function matches(hit: Hit) {
    if (!query) return true
    const q = query.toLowerCase()
    return hit.label.toLowerCase().includes(q) || hit.sub.toLowerCase().includes(q)
  }

  const deckHits: Hit[] = decks
    .map((d) => ({ id: d.id, label: d.name, sub: d.category }))
    .filter(matches)
    .slice(0, 5)

  const vocabHits: Hit[] = vocab
    .map((v) => ({ id: v.id, label: v.term, sub: v.meaning }))
    .filter(matches)
    .slice(0, 5)

  const bookHits: Hit[] = books
    .map((b) => ({ id: b.id, label: b.title, sub: b.author ?? '' }))
    .filter(matches)
    .slice(0, 5)

  const sessionHits: Hit[] = sessions
    .map((s) => ({ id: s.id, label: s.title, sub: s.kind }))
    .filter(matches)
    .slice(0, 5)

  const totalHits = deckHits.length + vocabHits.length + bookHits.length + sessionHits.length

  function go(to: '/study/decks' | '/english/vocab' | '/english/books' | '/english/shadowing') {
    setOpen(false)
    setQuery('')
    navigate({ to })
  }

  return (
    <CommandDialog
      open={open}
      onOpenChange={setOpen}
      title="Search"
      description="Search across decks, vocab, books, and shadowing sessions"
    >
      <CommandInput
        placeholder="Search decks, vocab, books, sessions…"
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        {totalHits === 0 && <CommandEmpty>No results.</CommandEmpty>}

        {deckHits.length > 0 && (
          <CommandGroup heading="Anki decks">
            {deckHits.map((h) => (
              <CommandItem key={h.id} onSelect={() => go('/study/decks')}>
                <Layers />
                <span className="flex-1 truncate">{h.label}</span>
                <span className="text-muted-foreground text-xs shrink-0">{h.sub}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {vocabHits.length > 0 && (
          <CommandGroup heading="Vocabulary">
            {vocabHits.map((h) => (
              <CommandItem key={h.id} onSelect={() => go('/english/vocab')}>
                <MessageSquare />
                <span className="flex-1 truncate">{h.label}</span>
                <span className="text-muted-foreground text-xs max-w-48 truncate">{h.sub}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {bookHits.length > 0 && (
          <CommandGroup heading="Books">
            {bookHits.map((h) => (
              <CommandItem key={h.id} onSelect={() => go('/english/books')}>
                <BookOpen />
                <span className="flex-1 truncate">{h.label}</span>
                <span className="text-muted-foreground text-xs shrink-0">{h.sub}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {sessionHits.length > 0 && (
          <CommandGroup heading="Shadowing sessions">
            {sessionHits.map((h) => (
              <CommandItem key={h.id} onSelect={() => go('/english/shadowing')}>
                <Mic />
                <span className="flex-1 truncate">{h.label}</span>
                <span className="text-muted-foreground text-xs shrink-0">{h.sub}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  )
}
