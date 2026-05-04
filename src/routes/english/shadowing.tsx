import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { CategoryGrid } from '@/components/english/shadowing/category-grid'
import { SessionList } from '@/components/english/shadowing/session-list'
import { SessionDetail } from '@/components/english/shadowing/session-detail'
import { SessionUpload } from '@/components/english/shadowing/session-upload'
import { listShadowingSessions, listShadowingCategories } from '@/lib/english/queries'
import type { ShadowingSession, ShadowingCategory } from '@/lib/english/types'

export const Route = createFileRoute('/english/shadowing')({
  component: ShadowingPage,
})

type View =
  | { kind: 'categories' }
  | { kind: 'sessions'; categoryId: string | null; categoryName: string }
  | { kind: 'upload'; categoryId: string | null }
  | { kind: 'session'; sessionId: string; fromCategoryId: string | null; fromCategoryName: string }

function ShadowingPage() {
  const [view, setView] = useState<View>({ kind: 'categories' })
  const [sessions, setSessions] = useState<ShadowingSession[]>([])
  const [categories, setCategories] = useState<ShadowingCategory[]>([])

  useEffect(() => {
    Promise.all([listShadowingSessions(), listShadowingCategories()])
      .then(([s, c]) => { setSessions(s); setCategories(c) })
      .catch(() => toast.error('Failed to load'))
  }, [])

  const categoriesWithCount = categories.map((cat) => ({
    ...cat,
    session_count: sessions.filter((s) => s.category_id === cat.id).length,
  }))

  const currentSession =
    view.kind === 'session' ? sessions.find((s) => s.id === view.sessionId) : undefined

  const visibleSessions =
    view.kind === 'sessions'
      ? view.categoryId
        ? sessions.filter((s) => s.category_id === view.categoryId)
        : sessions
      : sessions

  if (view.kind === 'categories') {
    return (
      <CategoryGrid
        categories={categoriesWithCount}
        totalSessions={sessions.length}
        onSelectAll={() => setView({ kind: 'sessions', categoryId: null, categoryName: 'All sessions' })}
        onSelectCategory={(id, name) => setView({ kind: 'sessions', categoryId: id, categoryName: name })}
        onCreated={(cat) => setCategories((prev) => [cat, ...prev])}
        onUpdated={(id, patch) =>
          setCategories((prev) =>
            prev.map((c) => (c.id === id ? { ...c, ...patch } : c)),
          )
        }
        onDeleted={(id) => setCategories((prev) => prev.filter((c) => c.id !== id))}
      />
    )
  }

  if (view.kind === 'upload') {
    return (
      <SessionUpload
        categories={categories}
        initialCategoryId={view.categoryId}
        onCreated={(session) => {
          setSessions((prev) => [session, ...prev])
          setView({
            kind: 'session',
            sessionId: session.id,
            fromCategoryId: view.categoryId,
            fromCategoryName: view.categoryId
              ? (categories.find((c) => c.id === view.categoryId)?.name ?? 'All sessions')
              : 'All sessions',
          })
        }}
        onCancel={() =>
          setView({
            kind: 'sessions',
            categoryId: view.categoryId,
            categoryName: view.categoryId
              ? (categories.find((c) => c.id === view.categoryId)?.name ?? 'All sessions')
              : 'All sessions',
          })
        }
      />
    )
  }

  if (view.kind === 'session' && currentSession) {
    return (
      <SessionDetail
        session={currentSession}
        categories={categories}
        onBack={() =>
          setView({
            kind: 'sessions',
            categoryId: view.fromCategoryId,
            categoryName: view.fromCategoryName,
          })
        }
        onQualityChange={(id, quality) =>
          setSessions((prev) => prev.map((s) => (s.id === id ? { ...s, quality } : s)))
        }
        onCategoryChange={(id, categoryId) =>
          setSessions((prev) => prev.map((s) => (s.id === id ? { ...s, category_id: categoryId } : s)))
        }
      />
    )
  }

  return (
    <SessionList
      sessions={visibleSessions}
      categories={categories}
      categoryName={view.kind === 'sessions' && view.categoryId ? view.categoryName : undefined}
      onSelect={(id) =>
        setView({
          kind: 'session',
          sessionId: id,
          fromCategoryId: view.kind === 'sessions' ? view.categoryId : null,
          fromCategoryName: view.kind === 'sessions' ? view.categoryName : 'All sessions',
        })
      }
      onUpload={() =>
        setView({
          kind: 'upload',
          categoryId: view.kind === 'sessions' ? view.categoryId : null,
        })
      }
      onBack={
        view.kind === 'sessions'
          ? () => setView({ kind: 'categories' })
          : undefined
      }
      onDeleted={(id) => setSessions((prev) => prev.filter((s) => s.id !== id))}
    />
  )
}
