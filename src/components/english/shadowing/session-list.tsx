import { Upload, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { deleteShadowingSessionFull } from '@/lib/english/queries'
import type { ShadowingSession } from '@/lib/english/types'

const QUALITY_BADGE: Record<NonNullable<ShadowingSession['quality']>, string> = {
  mastered: 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20',
  review: 'bg-orange-400/10 text-orange-400 border-orange-400/20',
  'needs-work': 'bg-destructive/10 text-destructive border-destructive/20',
}

function calcStreak(sessions: ShadowingSession[]): number {
  const dates = new Set(sessions.map((s) => s.created_at.slice(0, 10)))
  let streak = 0
  const today = new Date()
  for (let i = 0; i < 365; i++) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const key = d.toISOString().slice(0, 10)
    if (dates.has(key)) streak++
    else if (i > 0) break
  }
  return streak
}

function fmtDuration(s: number) {
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  if (m === 0) return `${sec}s`
  return `${m}m ${sec > 0 ? `${sec}s` : ''}`
}

interface SessionListProps {
  sessions: ShadowingSession[]
  onSelect: (id: string) => void
  onUpload: () => void
  onDeleted: (id: string) => void
}

export function SessionList({ sessions, onSelect, onUpload, onDeleted }: SessionListProps) {
  const totalSeconds = sessions.reduce((sum, s) => sum + (s.duration_seconds ?? 0), 0)
  const hours = Math.round((totalSeconds / 3600) * 10) / 10
  const streak = calcStreak(sessions)

  async function handleDelete(session: ShadowingSession) {
    try {
      await deleteShadowingSessionFull(session.id, session.storage_path)
      onDeleted(session.id)
      toast.success('Session deleted')
    } catch {
      toast.error('Failed to delete session')
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-1">Audio</p>
          <h2 className="text-xl font-medium tracking-tight">Shadowing Studio</h2>
        </div>
        <Button size="sm" className="gap-1.5 shrink-0" onClick={onUpload}>
          <Upload className="size-3.5" />
          Upload
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 text-center">
        {[
          { label: 'Sessions', value: sessions.length },
          { label: 'Streak', value: `${streak}d` },
          { label: 'Hours', value: hours },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-md border border-border/70 bg-card/40 px-3 py-3">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
            <p className="mt-1 font-mono text-sm tabular-nums">{value}</p>
          </div>
        ))}
      </div>

      {/* Session list */}
      {sessions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
          <p className="text-sm text-muted-foreground">No sessions yet.</p>
          <Button size="sm" variant="outline" onClick={onUpload}>
            Upload your first recording
          </Button>
        </div>
      ) : (
        <div className="rounded-lg border border-border/70 overflow-hidden bg-card/40">
          <ul className="divide-y divide-border/70">
            {sessions.map((session) => (
              <li
                key={session.id}
                className="flex items-center gap-3 px-4 py-3 hover:bg-card/60 transition-colors group"
              >
                <button
                  type="button"
                  className="flex-1 text-left min-w-0"
                  onClick={() => onSelect(session.id)}
                >
                  <p className="text-sm font-medium text-foreground truncate">{session.title}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {new Date(session.created_at).toLocaleDateString('en-US', {
                      month: 'short', day: 'numeric', year: '2-digit',
                    })}
                    {session.duration_seconds
                      ? ` · ${fmtDuration(session.duration_seconds)}`
                      : ''}
                    {' · '}
                    {session.kind}
                  </p>
                </button>

                {session.quality && (
                  <Badge
                    variant="outline"
                    className={cn('text-[10px] px-1.5 py-0 capitalize shrink-0', QUALITY_BADGE[session.quality])}
                  >
                    {session.quality.replace('-', ' ')}
                  </Badge>
                )}

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7 text-muted-foreground/40 hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete "{session.title}"?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Deletes the recording from storage and all session data. Cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => handleDelete(session)}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
