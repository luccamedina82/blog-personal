import { useEffect, useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { WaveformPlayer } from '@/components/waveform-player'
import { NotesPane } from './notes-pane'
import { TranscriptPane } from './transcript-pane'
import { getSignedUrl, updateShadowingSession } from '@/lib/english/queries'
import type { ShadowingCategory, ShadowingSession } from '@/lib/english/types'

const QUALITY_OPTIONS: Array<{
  value: ShadowingSession['quality']
  label: string
  className: string
}> = [
  { value: 'needs-work', label: 'Needs work', className: 'border-destructive/40 text-destructive data-[active=true]:bg-destructive/10' },
  { value: 'review', label: 'Review', className: 'border-orange-400/40 text-orange-400 data-[active=true]:bg-orange-400/10' },
  { value: 'mastered', label: 'Mastered', className: 'border-emerald-400/40 text-emerald-400 data-[active=true]:bg-emerald-400/10' },
]

interface SessionDetailProps {
  session: ShadowingSession
  categories: ShadowingCategory[]
  onBack: () => void
  onQualityChange: (id: string, quality: ShadowingSession['quality']) => void
  onCategoryChange: (id: string, categoryId: string | null) => void
}

export function SessionDetail({
  session,
  categories,
  onBack,
  onQualityChange,
  onCategoryChange,
}: SessionDetailProps) {
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [quality, setQuality] = useState(session.quality)
  const [categoryId, setCategoryId] = useState<string>(session.category_id ?? '')
  const [currentTime, setCurrentTime] = useState(0)

  useEffect(() => {
    getSignedUrl(session.storage_path)
      .then(setAudioUrl)
      .catch(() => toast.error('Failed to load audio'))
  }, [session.storage_path])

  async function handleQuality(q: ShadowingSession['quality']) {
    setQuality(q)
    await updateShadowingSession(session.id, { quality: q })
    onQualityChange(session.id, q)
    toast.success('Quality updated')
  }

  async function handleCategoryChange(val: string) {
    const newCatId = val || null
    setCategoryId(val)
    await updateShadowingSession(session.id, { category_id: newCatId })
    onCategoryChange(session.id, newCatId)
    toast.success(newCatId ? 'Category assigned' : 'Category removed')
  }

  const fmt = (s: number) => {
    if (!s) return ''
    const m = Math.floor(s / 60)
    const sec = Math.floor(s % 60)
    return `${m}m ${sec}s`
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="size-3.5" />
        Back
      </button>

      <div>
        <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-1">
          {session.kind} · {new Date(session.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })}
          {session.duration_seconds ? ` · ${fmt(session.duration_seconds)}` : ''}
        </p>
        <h2 className="text-xl font-medium tracking-tight">{session.title}</h2>
      </div>

      {audioUrl ? (
        <WaveformPlayer
          title={session.title}
          audioUrl={audioUrl}
          onTimeUpdate={(t) => setCurrentTime(t)}
        />
      ) : (
        <div className="rounded-lg border border-border/70 bg-card/40 p-8 text-center">
          <p className="text-sm text-muted-foreground">Loading audio…</p>
        </div>
      )}

      {/* Quality + Category row */}
      <div className="grid grid-cols-[1fr_auto] gap-4 items-start">
        <div className="space-y-2">
          <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Quality</p>
          <div className="flex gap-2">
            {QUALITY_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                data-active={quality === opt.value}
                onClick={() => handleQuality(opt.value)}
                className={cn(
                  'flex-1 rounded-lg border py-2 text-sm font-medium transition-colors',
                  opt.className,
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2 min-w-[160px]">
          <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Category</p>
          <Select value={categoryId} onValueChange={handleCategoryChange}>
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder="Uncategorized" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Uncategorized</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Tabs defaultValue="notes">
        <TabsList>
          <TabsTrigger value="notes">Notes</TabsTrigger>
          <TabsTrigger value="transcript">Transcript</TabsTrigger>
        </TabsList>
        <TabsContent value="notes" className="mt-4">
          <NotesPane sessionId={session.id} initialNotes={session.notes} />
        </TabsContent>
        <TabsContent value="transcript" className="mt-4">
          <TranscriptPane
            sessionId={session.id}
            initialTranscript={session.transcript}
            currentTime={currentTime}
            onSeek={setCurrentTime}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
