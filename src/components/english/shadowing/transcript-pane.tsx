import { useRef, useState } from 'react'
import { Plus, Trash2, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { updateShadowingSession } from '@/lib/english/queries'

type TranscriptLine = { start: number; end: number; text: string }

interface TranscriptPaneProps {
  sessionId: string
  initialTranscript: TranscriptLine[]
  currentTime?: number
  onSeek?: (seconds: number) => void
}

function fmt(s: number) {
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${sec.toString().padStart(2, '0')}`
}

export function TranscriptPane({
  sessionId,
  initialTranscript,
  currentTime = 0,
  onSeek,
}: TranscriptPaneProps) {
  const [lines, setLines] = useState<TranscriptLine[]>(initialTranscript)
  const [saved, setSaved] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function save(updated: TranscriptLine[]) {
    setSaved(false)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(async () => {
      await updateShadowingSession(sessionId, { transcript: updated })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    }, 800)
  }

  function addLine() {
    const updated = [...lines, { start: Math.floor(currentTime), end: Math.floor(currentTime) + 5, text: '' }]
    setLines(updated)
    save(updated)
  }

  function updateLine(index: number, patch: Partial<TranscriptLine>) {
    const updated = lines.map((l, i) => (i === index ? { ...l, ...patch } : l))
    setLines(updated)
    save(updated)
  }

  function deleteLine(index: number) {
    const updated = lines.filter((_, i) => i !== index)
    setLines(updated)
    save(updated)
  }

  const activeLine = lines.findIndex((l) => currentTime >= l.start && currentTime <= l.end)

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Transcript</p>
        <div className="flex items-center gap-3">
          {saved && (
            <span className="flex items-center gap-1 text-[10px] text-emerald-400">
              <Check className="size-3" /> Saved
            </span>
          )}
          <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={addLine}>
            <Plus className="size-3" />
            Add line
          </Button>
        </div>
      </div>

      {lines.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">
          No transcript yet. Click "Add line" to start.
        </p>
      ) : (
        <div className="space-y-2">
          {lines.map((line, i) => (
            <div
              key={i}
              className={`flex gap-2 rounded-md p-2 transition-colors ${
                i === activeLine ? 'bg-primary/8 border border-primary/20' : 'bg-card/40 border border-border/50'
              }`}
            >
              <button
                type="button"
                onClick={() => onSeek?.(line.start)}
                className="font-mono text-[11px] text-primary hover:underline shrink-0 pt-2"
                title="Seek to this timestamp"
              >
                {fmt(line.start)}
              </button>
              <Textarea
                value={line.text}
                onChange={(e) => updateLine(i, { text: e.target.value })}
                placeholder="Transcript text…"
                className="flex-1 resize-none text-sm min-h-0 h-auto py-1.5 border-0 bg-transparent p-0 focus-visible:ring-0 shadow-none"
                rows={2}
              />
              <div className="flex flex-col gap-1 shrink-0">
                <Input
                  type="number"
                  value={line.start}
                  onChange={(e) => updateLine(i, { start: Number(e.target.value) })}
                  className="w-14 h-6 text-[10px] text-center px-1"
                  title="Start (seconds)"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-6 text-muted-foreground hover:text-destructive"
                  onClick={() => deleteLine(i)}
                >
                  <Trash2 className="size-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
