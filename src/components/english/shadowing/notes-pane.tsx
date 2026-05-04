import { useEffect, useRef, useState } from 'react'
import { Check } from 'lucide-react'
import { Textarea } from '@/components/ui/textarea'
import { updateShadowingSession } from '@/lib/english/queries'

interface NotesPaneProps {
  sessionId: string
  initialNotes: string
}

export function NotesPane({ sessionId, initialNotes }: NotesPaneProps) {
  const [notes, setNotes] = useState(initialNotes)
  const [saved, setSaved] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    setNotes(initialNotes)
  }, [initialNotes])

  function handleChange(value: string) {
    setNotes(value)
    setSaved(false)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(async () => {
      await updateShadowingSession(sessionId, { notes: value })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    }, 600)
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Notes</p>
        {saved && (
          <span className="flex items-center gap-1 text-[10px] text-emerald-400">
            <Check className="size-3" /> Saved
          </span>
        )}
      </div>
      <Textarea
        value={notes}
        onChange={(e) => handleChange(e.target.value)}
        placeholder="Pronunciation struggles, patterns noticed, things to revisit…"
        className="min-h-[180px] resize-none text-sm"
      />
    </div>
  )
}
