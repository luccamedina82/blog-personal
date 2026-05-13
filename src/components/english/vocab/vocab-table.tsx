import { useState } from 'react'
import { Pencil, Trash2, Search } from 'lucide-react'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { SaveToAnkiButton } from '@/components/english/anki/save-to-anki-button'
import type { VocabEntry } from '@/lib/english/types'

interface VocabTableProps {
  entries: VocabEntry[]
  onEdit: (entry: VocabEntry) => void
  onDelete: (id: string) => void
  selectedIds?: Set<string>
  onToggleSelect?: (id: string) => void
  onSelectAll?: (visibleIds: string[], allSelected: boolean) => void
}

export function VocabTable({
  entries,
  onEdit,
  onDelete,
  selectedIds,
  onToggleSelect,
  onSelectAll,
}: VocabTableProps) {
  'use no memo'
  const [query, setQuery] = useState('')

  const filtered = query.trim()
    ? entries.filter((e) => {
        const q = query.toLowerCase()
        return (
          e.term.toLowerCase().includes(q) ||
          e.meaning.toLowerCase().includes(q) ||
          (e.example?.toLowerCase().includes(q) ?? false) ||
          e.tags.some((t) => t.toLowerCase().includes(q))
        )
      })
    : entries

  const selectionEnabled = !!(selectedIds && onToggleSelect)
  const gridCols = selectionEnabled
    ? 'grid-cols-[auto_1fr_1fr_1.4fr_auto]'
    : 'grid-cols-[1fr_1fr_1.4fr_auto]'

  const visibleIds = filtered.map((e) => e.id)
  const allSelected =
    selectionEnabled &&
    visibleIds.length > 0 &&
    visibleIds.every((id) => selectedIds!.has(id))
  const someSelected =
    selectionEnabled &&
    !allSelected &&
    visibleIds.some((id) => selectedIds!.has(id))

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search term, meaning, tag…"
          className="pl-8 h-8 text-sm"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground py-6 text-center">
          {query ? 'No matches.' : 'No entries yet.'}
        </p>
      ) : (
        <div className="rounded-lg border border-border/70 overflow-hidden bg-card/40">
          <div className={`grid ${gridCols} text-[10px] uppercase tracking-[0.18em] text-muted-foreground bg-background/40 border-b border-border/70`}>
            {selectionEnabled && (
              <div className="px-3 py-2.5 flex items-center">
                <Checkbox
                  checked={allSelected ? true : someSelected ? 'indeterminate' : false}
                  onCheckedChange={() => onSelectAll?.(visibleIds, allSelected)}
                  aria-label="Select all visible"
                />
              </div>
            )}
            <div className="px-4 py-2.5">Term</div>
            <div className="px-4 py-2.5">Meaning</div>
            <div className="px-4 py-2.5">Example / Tags</div>
            <div className="px-4 py-2.5" />
          </div>
          <ul className="divide-y divide-border/70">
            {filtered.map((entry) => (
              <li
                key={entry.id}
                className={`grid ${gridCols} text-[13px] hover:bg-card/60 transition-colors`}
              >
                {selectionEnabled && (
                  <div className="px-3 py-3 flex items-center self-center">
                    <Checkbox
                      checked={selectedIds!.has(entry.id)}
                      onCheckedChange={() => onToggleSelect!(entry.id)}
                      aria-label={`Select ${entry.term}`}
                    />
                  </div>
                )}
                <div className="px-4 py-3 font-mono text-foreground self-center">
                  {entry.term}
                </div>
                <div className="px-4 py-3 text-muted-foreground self-center">
                  {entry.meaning}
                </div>
                <div className="px-4 py-3 self-center space-y-1">
                  {entry.example && (
                    <p className="text-muted-foreground/80 italic">"{entry.example}"</p>
                  )}
                  {entry.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {entry.tags.map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-[10px] px-1.5 py-0">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
                <div className="px-3 py-3 flex items-center gap-1 self-center">
                  <SaveToAnkiButton
                    front={entry.term}
                    back={`${entry.meaning}${entry.example ? `\n\n"${entry.example}"` : ''}`}
                    sourceKind={null}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7 text-muted-foreground hover:text-foreground"
                    onClick={() => onEdit(entry)}
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
                        <AlertDialogTitle>Delete "{entry.term}"?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => onDelete(entry.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
