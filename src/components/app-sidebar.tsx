import { cn } from '@/lib/utils'
import { Link, useRouterState } from '@tanstack/react-router'
import { Home, Code2, BookOpen, NotebookPen } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { GithubLogo, LinkedinLogo, TwitterLogo } from '@phosphor-icons/react'

type SectionId = 'home' | 'devlab' | 'english' | 'journal'

const NAV: { id: SectionId; label: string; sub: string; icon: LucideIcon; to: string }[] = [
  { id: 'home', label: 'Home', sub: 'Portfolio', icon: Home, to: '/' },
  { id: 'devlab', label: 'Dev Lab', sub: 'Tech Notes', icon: Code2, to: '/devlab' },
  { id: 'english', label: 'English', sub: '& Literature', icon: BookOpen, to: '/english' },
  { id: 'journal', label: 'Bitácora', sub: 'Daily Log', icon: NotebookPen, to: '/bitacora' },
]

export function AppSidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname })

  return (
    <aside className="hidden lg:flex w-64 shrink-0 flex-col border-r border-border bg-sidebar h-screen sticky top-0">
      {/* Brand */}
      <div className="px-6 pt-8 pb-10">
        <div className="flex items-center gap-2.5">
          <div className="size-7 rounded-md bg-foreground/95 flex items-center justify-center">
            <span className="text-background text-xs font-semibold tracking-tight">G</span>
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-medium text-foreground">Guillermo R.</span>
            <span className="text-[11px] text-muted-foreground tracking-wide">personal · v1.0</span>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3">
        <p className="px-3 pb-3 text-[10px] uppercase tracking-[0.18em] text-muted-foreground/70">
          Modules
        </p>
        <ul className="flex flex-col gap-1">
          {NAV.map((item) => {
            const isActive = pathname === item.to || (item.to !== '/' && pathname.startsWith(item.to))
            const Icon = item.icon
            return (
              <li key={item.id}>
                <Link
                  to={item.to}
                  className={cn(
                    'group w-full flex items-center gap-3 rounded-md px-3 py-2.5 text-left transition-all duration-200',
                    isActive
                      ? 'bg-secondary text-foreground'
                      : 'text-muted-foreground hover:text-foreground hover:bg-secondary/60',
                  )}
                >
                  <Icon
                    className={cn(
                      'size-4 transition-colors',
                      isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground',
                    )}
                  />
                  <div className="flex flex-col leading-tight">
                    <span className="text-sm font-medium">{item.label}</span>
                    <span className="text-[11px] text-muted-foreground/80">{item.sub}</span>
                  </div>
                  {isActive && <span className="ml-auto size-1.5 rounded-full bg-primary" />}
                </Link>
              </li>
            )
          })}
        </ul>

        <p className="mt-10 px-3 pb-3 text-[10px] uppercase tracking-[0.18em] text-muted-foreground/70">
          Status
        </p>
        <div className="mx-3 rounded-md border border-border/80 bg-card/40 p-3">
          <div className="flex items-center gap-2">
            <span className="relative flex size-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" />
              <span className="relative inline-flex size-2 rounded-full bg-primary" />
            </span>
            <span className="text-xs text-foreground">Available for work</span>
          </div>
          <p className="mt-1.5 text-[11px] text-muted-foreground leading-relaxed">
            Open to senior full-stack & systems roles.
          </p>
        </div>
      </nav>

      {/* Footer */}
      <div className="px-6 py-5 border-t border-border/70">
        <div className="flex items-center gap-3">
          <a href="#" aria-label="GitHub" className="text-muted-foreground hover:text-foreground transition-colors">
            <GithubLogo className="size-4" />
          </a>
          <a href="#" aria-label="LinkedIn" className="text-muted-foreground hover:text-foreground transition-colors">
            <LinkedinLogo className="size-4" />
          </a>
          <a href="#" aria-label="Twitter" className="text-muted-foreground hover:text-foreground transition-colors">
            <TwitterLogo className="size-4" />
          </a>
          <span className="ml-auto text-[10px] text-muted-foreground/70 tabular-nums">
            UTC−05
          </span>
        </div>
      </div>
    </aside>
  )
}

export function MobileNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname })

  return (
    <nav className="lg:hidden sticky top-0 z-40 backdrop-blur-md bg-background/80 border-b border-border">
      <div className="flex items-center gap-1 overflow-x-auto px-3 py-2">
        {NAV.map((item) => {
          const isActive = pathname === item.to || (item.to !== '/' && pathname.startsWith(item.to))
          const Icon = item.icon
          return (
            <Link
              key={item.id}
              to={item.to}
              className={cn(
                'flex items-center gap-2 rounded-md px-3 py-1.5 text-xs whitespace-nowrap transition-colors',
                isActive
                  ? 'bg-secondary text-foreground'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <Icon className={cn('size-3.5', isActive && 'text-primary')} />
              {item.label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
