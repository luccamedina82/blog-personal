import { cn } from '@/lib/utils'

type Props = {
  dueAt: string
  done: boolean
  className?: string
}

export function getCountdownInfo(dueAt: string, done: boolean) {
  if (done) return { label: 'Hecho', color: 'text-green-600' }

  const due = new Date(dueAt)
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  due.setHours(0, 0, 0, 0)
  const diffDays = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

  if (diffDays < 0) return { label: 'Vencido', color: 'text-destructive' }
  if (diffDays === 0) return { label: 'Hoy', color: 'text-orange-500' }
  if (diffDays === 1) return { label: 'Mañana', color: 'text-orange-400' }
  if (diffDays <= 7) return { label: `En ${diffDays} días`, color: 'text-yellow-600' }
  return { label: `En ${diffDays} días`, color: 'text-muted-foreground' }
}

export function CountdownBadge({ dueAt, done, className }: Props) {
  const { label, color } = getCountdownInfo(dueAt, done)
  return (
    <span className={cn('text-[10px] uppercase tracking-wide font-medium shrink-0', color, className)}>
      {label}
    </span>
  )
}
