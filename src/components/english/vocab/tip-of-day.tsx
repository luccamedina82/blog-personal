import type { DailyTip } from '@/lib/english/types'

const KIND_COLOR: Record<DailyTip['kind'], string> = {
  word: 'text-blue-400',
  phrase: 'text-emerald-400',
  idiom: 'text-amber-400',
  connector: 'text-violet-400',
}

interface TipOfDayProps {
  tip: DailyTip
}

export function TipOfDay({ tip }: TipOfDayProps) {
  return (
    <div className="rounded-lg border border-primary/20 bg-primary/5 p-5">
      <p className="text-[10px] uppercase tracking-[0.22em] text-primary/70 mb-2">Tip of the day</p>
      <div className="flex items-baseline gap-2">
        <span className="font-mono text-base font-medium text-foreground">{tip.term}</span>
        <span className={`text-[10px] uppercase tracking-wider ${KIND_COLOR[tip.kind]}`}>
          {tip.kind}
        </span>
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground/60">
          {tip.register}
        </span>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">{tip.meaning}</p>
      <p className="mt-1.5 text-[13px] text-muted-foreground/80 italic">"{tip.example}"</p>
    </div>
  )
}
