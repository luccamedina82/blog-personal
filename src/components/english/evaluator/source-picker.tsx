import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { listDevLabPostsForEvaluator, listJournalPostsForEvaluator } from '@/lib/english/queries'
import { blocksToPlainText } from '@/lib/ai/extract'
import { Loader2 } from 'lucide-react'

export type SourceMode = 'paste' | 'devlab' | 'bitacora'

interface SourcePickerProps {
  mode: SourceMode
  onModeChange: (mode: SourceMode) => void
  onTextLoad: (text: string, ref: string) => void
}

const MODES: { id: SourceMode; label: string }[] = [
  { id: 'paste', label: 'Paste' },
  { id: 'bitacora', label: 'Bitácora' },
  { id: 'devlab', label: 'DevLab' },
]

export function SourcePicker({ mode, onModeChange, onTextLoad }: SourcePickerProps) {
  'use no memo'
  const [devlabPosts, setDevlabPosts] = useState<Awaited<ReturnType<typeof listDevLabPostsForEvaluator>>>([])
  const [journalPosts, setJournalPosts] = useState<Array<{ id: string; title: string | null; content: string; created_at: string }>>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (mode === 'devlab' && devlabPosts.length === 0) {
      setLoading(true)
      listDevLabPostsForEvaluator()
        .then(setDevlabPosts)
        .catch(() => {})
        .finally(() => setLoading(false))
    }
    if (mode === 'bitacora' && journalPosts.length === 0) {
      setLoading(true)
      listJournalPostsForEvaluator()
        .then(setJournalPosts)
        .catch(() => {})
        .finally(() => setLoading(false))
    }
  }, [mode])

  function handleSelect(e: React.ChangeEvent<HTMLSelectElement>) {
    const selectedId = e.target.value
    if (!selectedId) return

    if (mode === 'devlab') {
      const post = devlabPosts.find((p) => p.id === selectedId)
      if (post) onTextLoad(blocksToPlainText(post.title, post.blocks ?? []), post.id)
    } else if (mode === 'bitacora') {
      const post = journalPosts.find((p) => p.id === selectedId)
      if (post?.content) onTextLoad(post.content, post.id)
    }
  }

  return (
    <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
      <div className="flex items-center gap-1 rounded-md border border-border/70 bg-background/60 p-1">
        {MODES.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => onModeChange(m.id)}
            className={cn(
              'px-3 py-1.5 text-xs rounded transition-colors',
              mode === m.id
                ? 'bg-secondary text-foreground'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {m.label}
          </button>
        ))}
      </div>

      {mode !== 'paste' && (
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {loading ? (
            <Loader2 className="size-4 animate-spin text-muted-foreground" />
          ) : (
            <select
              onChange={handleSelect}
              defaultValue=""
              className="flex-1 min-w-0 rounded-md border border-border/70 bg-background/60 px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary/40 transition-colors"
            >
              <option value="" disabled>
                {mode === 'devlab'
                  ? devlabPosts.length === 0 ? 'No DevLab posts yet' : 'Select a post…'
                  : journalPosts.length === 0 ? 'No Bitácora entries yet' : 'Select an entry…'}
              </option>
              {mode === 'devlab' &&
                devlabPosts.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                  </option>
                ))}
              {mode === 'bitacora' &&
                journalPosts.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title ?? new Date(p.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </option>
                ))}
            </select>
          )}
        </div>
      )}
    </div>
  )
}
