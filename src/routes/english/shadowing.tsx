import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { SessionList } from '@/components/english/shadowing/session-list'
import { SessionDetail } from '@/components/english/shadowing/session-detail'
import { SessionUpload } from '@/components/english/shadowing/session-upload'
import { listShadowingSessions } from '@/lib/english/queries'
import type { ShadowingSession } from '@/lib/english/types'

export const Route = createFileRoute('/english/shadowing')({
  component: ShadowingPage,
})

type View =
  | { kind: 'list' }
  | { kind: 'upload' }
  | { kind: 'session'; sessionId: string }

function ShadowingPage() {
  const [view, setView] = useState<View>({ kind: 'list' })
  const [sessions, setSessions] = useState<ShadowingSession[]>([])

  useEffect(() => {
    listShadowingSessions()
      .then(setSessions)
      .catch(() => toast.error('Failed to load sessions'))
  }, [])

  const currentSession =
    view.kind === 'session'
      ? sessions.find((s) => s.id === view.sessionId)
      : undefined

  if (view.kind === 'upload') {
    return (
      <SessionUpload
        onCreated={(session) => {
          setSessions((prev) => [session, ...prev])
          setView({ kind: 'session', sessionId: session.id })
        }}
        onCancel={() => setView({ kind: 'list' })}
      />
    )
  }

  if (view.kind === 'session' && currentSession) {
    return (
      <SessionDetail
        session={currentSession}
        onBack={() => setView({ kind: 'list' })}
        onQualityChange={(id, quality) =>
          setSessions((prev) =>
            prev.map((s) => (s.id === id ? { ...s, quality } : s)),
          )
        }
      />
    )
  }

  return (
    <SessionList
      sessions={sessions}
      onSelect={(id) => setView({ kind: 'session', sessionId: id })}
      onUpload={() => setView({ kind: 'upload' })}
      onDeleted={(id) => setSessions((prev) => prev.filter((s) => s.id !== id))}
    />
  )
}
