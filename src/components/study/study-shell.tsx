import { type ReactNode } from 'react'
import { Link, useRouterState } from '@tanstack/react-router'
import { cn } from '@/lib/utils'

const TABS = [
  { id: 'decks', label: 'Anki Decks', to: '/study/decks' },
  { id: 'quizzes', label: 'Quizzes', to: '/study/quizzes' },
] as const

export function StudyShell({ children }: { children: ReactNode }) {
  'use no memo'
  const pathname = useRouterState({ select: (s) => s.location.pathname })

  return (
    <div className="flex flex-col min-h-full">
      <div className="px-6 lg:px-12 pt-10">
        <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-2">
          Study · Decks & Quizzes
        </p>
        <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-balance">
          Tu sala de estudio.
        </h1>

        <div className="mt-8 flex gap-0 border-b border-border overflow-x-auto">
          {TABS.map((tab) => {
            const isActive = pathname.startsWith(tab.to)
            return (
              <Link
                key={tab.id}
                to={tab.to}
                className={cn(
                  'relative px-4 py-2.5 text-sm whitespace-nowrap transition-colors shrink-0',
                  isActive
                    ? 'text-foreground after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-primary after:rounded-t'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {tab.label}
              </Link>
            )
          })}
        </div>
      </div>

      <div className="flex-1 px-6 lg:px-12 py-8">{children}</div>
    </div>
  )
}
