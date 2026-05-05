import { type ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'

type Props = {
  children: ReactNode
  title?: string
  subtitle?: string
  back?: { to: string; label?: string }
  actions?: ReactNode
}

export function FacultyShell({ children, title, subtitle, back, actions }: Props) {
  return (
    <div className="flex flex-col min-h-full">
      <div className="px-6 lg:px-12 pt-10">
        {back && (
          <Link
            to={back.to}
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mb-4"
          >
            <ArrowLeft className="size-3.5" />
            {back.label ?? 'Back'}
          </Link>
        )}
        <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-2">
          Module · Faculty
        </p>
        <div className="flex items-start justify-between gap-6 flex-wrap">
          <div>
            <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-balance">
              {title ?? 'Materias'}
            </h1>
            {subtitle && (
              <p className="text-sm text-muted-foreground mt-2 max-w-2xl">{subtitle}</p>
            )}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      </div>

      <div className="flex-1 px-6 lg:px-12 py-8">{children}</div>
    </div>
  )
}
