import { Coffee, FileText, Code2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { DailyQuestionTone } from '@/lib/english/daily-questions'

const TONES: Array<{ value: DailyQuestionTone; label: string; description: string; icon: typeof Coffee; tint: string }> = [
  {
    value: 'casual',
    label: 'Casual',
    description: 'Small talk, opinion',
    icon: Coffee,
    tint: 'border-amber-500/40 bg-amber-500/10 text-amber-500',
  },
  {
    value: 'formal',
    label: 'Formal',
    description: 'Essay, argument',
    icon: FileText,
    tint: 'border-blue-500/40 bg-blue-500/10 text-blue-500',
  },
  {
    value: 'technical',
    label: 'Technical',
    description: 'Dev, science',
    icon: Code2,
    tint: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-500',
  },
]

interface Props {
  value: DailyQuestionTone
  onChange: (tone: DailyQuestionTone) => void
  disabled?: boolean
}

export function ToneSelector({ value, onChange, disabled }: Props) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {TONES.map((t) => {
        const Icon = t.icon
        const isActive = value === t.value
        return (
          <button
            key={t.value}
            type="button"
            onClick={() => !disabled && onChange(t.value)}
            disabled={disabled}
            className={cn(
              'flex flex-col items-start gap-1 rounded-xl border-2 px-3 py-2.5 text-left transition-all',
              isActive ? t.tint : 'border-border/40 bg-card/30 text-muted-foreground hover:border-border hover:text-foreground',
              disabled && 'opacity-60 cursor-not-allowed',
            )}
          >
            <div className="flex items-center gap-1.5">
              <Icon className="size-3.5" />
              <span className="text-sm font-medium">{t.label}</span>
            </div>
            <span className="text-[10px] text-muted-foreground/70">{t.description}</span>
          </button>
        )
      })}
    </div>
  )
}
