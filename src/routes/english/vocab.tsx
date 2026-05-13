import { createFileRoute, Link } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { Plus, Brain, X, Layers, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { VocabTable } from '@/components/english/vocab/vocab-table'
import { VocabForm } from '@/components/english/vocab/vocab-form'
import { TipOfDay } from '@/components/english/vocab/tip-of-day'
import {
  listVocab, createVocab, updateVocab, deleteVocab,
  listDecks, bulkInsertCards,
} from '@/lib/english/queries'
import type { VocabEntry, Deck } from '@/lib/english/types'

export const Route = createFileRoute('/english/vocab')({
  component: VocabPage,
})

type KindFilter = 'all' | VocabEntry['kind']

const KINDS: Array<{ value: VocabEntry['kind']; label: string }> = [
  { value: 'word', label: 'Words' },
  { value: 'phrase', label: 'Phrases' },
  { value: 'connector', label: 'Connectors' },
]

function VocabPage() {
  'use no memo'
  const [entries, setEntries] = useState<VocabEntry[]>([])
  const [kindFilter, setKindFilter] = useState<KindFilter>('all')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<VocabEntry | undefined>()

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [decks, setDecks] = useState<Deck[]>([])
  const [decksLoaded, setDecksLoaded] = useState(false)
  const [targetDeckId, setTargetDeckId] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    listVocab()
      .then(setEntries)
      .catch(() => toast.error('Failed to load vocab entries'))
  }, [])

  useEffect(() => {
    setSelectedIds(new Set())
  }, [kindFilter])

  function openCreate() {
    setEditing(undefined)
    setFormOpen(true)
  }

  function openEdit(entry: VocabEntry) {
    setEditing(entry)
    setFormOpen(true)
  }

  async function handleSubmit(
    values: Pick<VocabEntry, 'kind' | 'term' | 'meaning' | 'example' | 'tags'>,
  ) {
    if (editing) {
      await updateVocab(editing.id, values)
      setEntries((prev) =>
        prev.map((e) => (e.id === editing.id ? { ...e, ...values } : e)),
      )
      toast.success('Entry updated')
    } else {
      const created = await createVocab(values)
      setEntries((prev) => [created, ...prev])
      toast.success('Entry added')
    }
  }

  async function handleDelete(id: string) {
    await deleteVocab(id)
    setEntries((prev) => prev.filter((e) => e.id !== id))
    setSelectedIds((prev) => {
      if (!prev.has(id)) return prev
      const next = new Set(prev)
      next.delete(id)
      return next
    })
    toast.success('Entry deleted')
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function handleSelectAll(visibleIds: string[], allSelected: boolean) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (allSelected) {
        for (const id of visibleIds) next.delete(id)
      } else {
        for (const id of visibleIds) next.add(id)
      }
      return next
    })
  }

  async function ensureDecksLoaded() {
    if (decksLoaded) return
    try {
      const d = await listDecks()
      setDecks(d)
      setDecksLoaded(true)
    } catch {
      toast.error('Failed to load decks')
    }
  }

  async function handleBulkSave() {
    if (!targetDeckId || selectedIds.size === 0) return
    setSaving(true)
    try {
      const cards = entries
        .filter((e) => selectedIds.has(e.id))
        .map((e) => ({
          front: e.term,
          back: e.meaning + (e.example ? `\n\n"${e.example}"` : ''),
          tags: [...e.tags, e.kind],
        }))
      await bulkInsertCards(targetDeckId, cards, 'vocab', null)
      toast.success(`${cards.length} card${cards.length === 1 ? '' : 's'} added`)
      setSelectedIds(new Set())
      setTargetDeckId('')
    } catch {
      toast.error('Failed to add cards')
    } finally {
      setSaving(false)
    }
  }

  const filtered =
    kindFilter === 'all' ? entries : entries.filter((e) => e.kind === kindFilter)

  const defaultKindForCreate: VocabEntry['kind'] =
    kindFilter === 'all' ? 'word' : kindFilter

  const selectionCount = selectedIds.size

  return (
    <div className="space-y-6 pb-24">
      <TipOfDay knownTerms={entries.map((e) => e.term)} />

      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-1">Vocab</p>
          <h2 className="text-xl font-medium tracking-tight">Vocab vault</h2>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button asChild variant="outline" size="sm" className="gap-1.5">
            <Link to="/study/decks">
              <Brain className="size-3.5" />
              Study decks
            </Link>
          </Button>
          <Button size="sm" className="gap-1.5" onClick={openCreate}>
            <Plus className="size-3.5" />
            Add entry
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        <FilterChip
          active={kindFilter === 'all'}
          onClick={() => setKindFilter('all')}
          label="All"
          count={entries.length}
        />
        {KINDS.map((k) => (
          <FilterChip
            key={k.value}
            active={kindFilter === k.value}
            onClick={() => setKindFilter(k.value)}
            label={k.label}
            count={entries.filter((e) => e.kind === k.value).length}
          />
        ))}
      </div>

      <VocabTable
        entries={filtered}
        onEdit={openEdit}
        onDelete={handleDelete}
        selectedIds={selectedIds}
        onToggleSelect={toggleSelect}
        onSelectAll={handleSelectAll}
      />

      <VocabForm
        open={formOpen}
        onOpenChange={setFormOpen}
        initial={editing}
        defaultKind={defaultKindForCreate}
        onSubmit={handleSubmit}
      />

      {selectionCount > 0 && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-30 w-[min(92vw,640px)]">
          <div className="flex items-center gap-3 rounded-2xl border border-border bg-card/95 backdrop-blur shadow-lg px-4 py-3">
            <div className="flex items-center gap-2 shrink-0">
              <Layers className="size-4 text-primary" />
              <span className="text-sm tabular-nums">
                <strong>{selectionCount}</strong>
                <span className="text-muted-foreground"> selected</span>
              </span>
            </div>

            <div className="flex-1 min-w-0">
              <Select
                value={targetDeckId}
                onValueChange={(v) => { setTargetDeckId(v) }}
                onOpenChange={(o) => { if (o) ensureDecksLoaded() }}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Select deck…" />
                </SelectTrigger>
                <SelectContent>
                  {decks.length === 0 ? (
                    <div className="px-3 py-2 text-xs text-muted-foreground">
                      {decksLoaded ? 'No decks yet' : 'Loading…'}
                    </div>
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

            <Button
              size="sm"
              onClick={handleBulkSave}
              disabled={!targetDeckId || saving}
              className="gap-1.5"
            >
              {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Layers className="size-3.5" />}
              {saving ? 'Saving…' : 'Add to deck'}
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="size-8 shrink-0 text-muted-foreground hover:text-foreground"
              onClick={() => setSelectedIds(new Set())}
              aria-label="Clear selection"
            >
              <X className="size-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

function FilterChip({
  active,
  onClick,
  label,
  count,
}: {
  active: boolean
  onClick: () => void
  label: string
  count: number
}) {
  'use no memo'
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition-colors',
        active
          ? 'bg-primary/15 text-primary border-primary/30'
          : 'bg-card/40 text-muted-foreground border-border/60 hover:text-foreground hover:border-border',
      )}
    >
      <span>{label}</span>
      <span className="text-[10px] tabular-nums opacity-70">{count}</span>
    </button>
  )
}
