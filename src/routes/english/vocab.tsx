import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { VocabTable } from '@/components/english/vocab/vocab-table'
import { VocabForm } from '@/components/english/vocab/vocab-form'
import { TipOfDay } from '@/components/english/vocab/tip-of-day'
import { listVocab, createVocab, updateVocab, deleteVocab } from '@/lib/english/queries'
import type { VocabEntry } from '@/lib/english/types'

export const Route = createFileRoute('/english/vocab')({
  component: VocabPage,
})

const TABS = [
  { value: 'word', label: 'Words' },
  { value: 'phrase', label: 'Phrases' },
  { value: 'connector', label: 'Connectors' },
  { value: 'tip', label: 'Tip of the day' },
] as const

type TabValue = (typeof TABS)[number]['value']

function VocabPage() {
  const [entries, setEntries] = useState<VocabEntry[]>([])
  const [tab, setTab] = useState<TabValue>('word')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<VocabEntry | undefined>()

  useEffect(() => {
    listVocab()
      .then(setEntries)
      .catch(() => toast.error('Failed to load vocab entries'))
  }, [])

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
    toast.success('Entry deleted')
  }

  const filtered = (kind: string) => entries.filter((e) => e.kind === kind)

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-1">Vocab</p>
          <h2 className="text-xl font-medium tracking-tight">Vocab vault</h2>
        </div>
        {tab !== 'tip' && (
          <Button size="sm" className="gap-1.5 shrink-0" onClick={openCreate}>
            <Plus className="size-3.5" />
            Add entry
          </Button>
        )}
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as TabValue)}>
        <TabsList>
          {TABS.map((t) => (
            <TabsTrigger key={t.value} value={t.value}>
              {t.label}
              {t.value !== 'tip' && (
                <span className="ml-1.5 text-[10px] text-muted-foreground tabular-nums">
                  {filtered(t.value).length}
                </span>
              )}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="word" className="mt-4">
          <VocabTable
            entries={filtered('word')}
            onEdit={openEdit}
            onDelete={handleDelete}
          />
        </TabsContent>

        <TabsContent value="phrase" className="mt-4">
          <VocabTable
            entries={filtered('phrase')}
            onEdit={openEdit}
            onDelete={handleDelete}
          />
        </TabsContent>

        <TabsContent value="connector" className="mt-4">
          <VocabTable
            entries={filtered('connector')}
            onEdit={openEdit}
            onDelete={handleDelete}
          />
        </TabsContent>

        <TabsContent value="tip" className="mt-4">
          <TipOfDay knownTerms={entries.map((e) => e.term)} />
        </TabsContent>
      </Tabs>

      <VocabForm
        open={formOpen}
        onOpenChange={setFormOpen}
        initial={editing}
        onSubmit={handleSubmit}
      />
    </div>
  )
}
