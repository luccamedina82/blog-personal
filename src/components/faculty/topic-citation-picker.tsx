import { useState, useEffect } from 'react'
import { BookOpen, FileText, FlaskConical, Search } from 'lucide-react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { listAllNotesSummary } from '@/lib/faculty/queries'
import { listAllDevLabPostsSummary } from '@/lib/devlab/queries'
import { listBooks } from '@/lib/library/queries'
import type { FacultyTopicCitationKind } from '@/lib/faculty/types'

type Tab = 'faculty' | 'devlab' | 'library'

type PickerItem = {
  id: string
  title: string
  hint: string
  storage_path?: string
}

export type CitationResult = {
  source_kind: FacultyTopicCitationKind
  source_id: string
  source_title: string
  source_storage_path: string | null
  page: number | null
}

type Props = {
  open: boolean
  onOpenChange: (v: boolean) => void
  onConfirm: (result: CitationResult) => void
}

export function TopicCitationPicker({ open, onOpenChange, onConfirm }: Props) {
  const [tab, setTab] = useState<Tab>('faculty')
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [page, setPage] = useState('')
  const [facultyItems, setFacultyItems] = useState<PickerItem[]>([])
  const [devlabItems, setDevlabItems] = useState<PickerItem[]>([])
  const [libraryItems, setLibraryItems] = useState<PickerItem[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open) return
    setLoading(true)
    Promise.all([listAllNotesSummary(), listAllDevLabPostsSummary(), listBooks()])
      .then(([notes, posts, books]) => {
        setFacultyItems(
          notes.map((n) => ({ id: n.id, title: n.title, hint: n.subject_name || n.kind })),
        )
        setDevlabItems(
          posts.map((p) => ({
            id: p.id,
            title: p.title,
            hint: p.category_label ? `DevLab · ${p.category_label}` : 'DevLab',
          })),
        )
        setLibraryItems(
          books.map((b) => ({
            id: b.id,
            title: b.title,
            hint: b.author ?? 'Biblioteca',
            storage_path: b.storage_path,
          })),
        )
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [open])

  useEffect(() => {
    if (!open) {
      setSearch('')
      setSelectedId(null)
      setPage('')
    }
  }, [open])

  const currentItems =
    tab === 'faculty' ? facultyItems : tab === 'devlab' ? devlabItems : libraryItems

  const filtered = search.trim()
    ? currentItems.filter(
        (i) =>
          i.title.toLowerCase().includes(search.toLowerCase()) ||
          i.hint.toLowerCase().includes(search.toLowerCase()),
      )
    : currentItems

  const selectedItem = currentItems.find((i) => i.id === selectedId) ?? null

  function handleSelect(item: PickerItem) {
    setSelectedId(item.id)
    setPage('')
  }

  function handleTabChange(t: Tab) {
    setTab(t)
    setSelectedId(null)
    setPage('')
  }

  function handleConfirm() {
    if (!selectedItem) return
    const source_kind: FacultyTopicCitationKind =
      tab === 'faculty' ? 'faculty_note' : tab === 'devlab' ? 'devlab_post' : 'library_book'
    onConfirm({
      source_kind,
      source_id: selectedItem.id,
      source_title: selectedItem.title,
      source_storage_path: selectedItem.storage_path ?? null,
      page: tab === 'library' && page ? parseInt(page, 10) : null,
    })
    onOpenChange(false)
  }

  const TABS: Array<{ id: Tab; label: string; Icon: React.ElementType }> = [
    { id: 'faculty', label: 'Notas', Icon: FileText },
    { id: 'devlab', label: 'DevLab', Icon: FlaskConical },
    { id: 'library', label: 'Libros', Icon: BookOpen },
  ]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Citar recurso en tema</DialogTitle>
        </DialogHeader>

        {/* Tabs */}
        <div className="flex gap-0 border-b border-border -mx-6 px-6">
          {TABS.map(({ id, label, Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => handleTabChange(id)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-2 text-xs whitespace-nowrap transition-colors border-b-2 -mb-px',
                tab === id
                  ? 'border-primary text-foreground font-medium'
                  : 'border-transparent text-muted-foreground hover:text-foreground',
              )}
            >
              <Icon className="size-3" />
              {label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar..."
            className="pl-8 h-8 text-sm"
            autoFocus
          />
        </div>

        {/* List */}
        <div className="max-h-52 overflow-y-auto space-y-0.5 rounded-md border border-border bg-muted/20 p-1">
          {loading ? (
            <p className="text-xs text-muted-foreground p-3 text-center">Cargando...</p>
          ) : filtered.length === 0 ? (
            <p className="text-xs text-muted-foreground p-3 text-center">Sin resultados</p>
          ) : (
            filtered.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelect(item)}
                className={cn(
                  'w-full flex items-start gap-2 px-2.5 py-1.5 rounded text-left transition-colors',
                  selectedId === item.id
                    ? 'bg-primary/10 text-primary'
                    : 'hover:bg-accent',
                )}
              >
                <span className="flex-1 min-w-0">
                  <span className="block text-sm truncate">{item.title}</span>
                  <span className="block text-[10px] text-muted-foreground truncate">
                    {item.hint}
                  </span>
                </span>
              </button>
            ))
          )}
        </div>

        {/* Page input — solo para libros */}
        {selectedItem && tab === 'library' && (
          <div className="flex items-center gap-2">
            <label className="text-xs text-muted-foreground shrink-0">Página:</label>
            <Input
              type="number"
              min={1}
              value={page}
              onChange={(e) => setPage(e.target.value)}
              placeholder="Ej: 42"
              className="h-7 w-24 text-xs"
            />
          </div>
        )}

        <DialogFooter>
          <Button type="button" variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={!selectedItem || (tab === 'library' && !page)}
            onClick={handleConfirm}
          >
            Citar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
