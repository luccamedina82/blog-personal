import { useState, useEffect } from 'react'
import { ChevronDown, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { getTodayTip, saveTip, listTipHistory, type StoredTip } from '@/lib/english/tips'

const KIND_COLOR: Record<StoredTip['kind'], string> = {
  word: 'text-blue-400',
  phrase: 'text-emerald-400',
  idiom: 'text-amber-400',
  connector: 'text-violet-400',
}

const KIND_BG: Record<StoredTip['kind'], string> = {
  word: 'bg-blue-500/10 text-blue-400',
  phrase: 'bg-emerald-500/10 text-emerald-400',
  idiom: 'bg-amber-500/10 text-amber-400',
  connector: 'bg-violet-500/10 text-violet-400',
}

interface Props {
  knownTerms: string[]
}

export function TipOfDay({ knownTerms }: Props) {
  const [tip, setTip] = useState<StoredTip | null>(null)
  const [history, setHistory] = useState<StoredTip[]>([])
  const [loading, setLoading] = useState(true)
  const [showHistory, setShowHistory] = useState(false)

  useEffect(() => {
    loadTip()
  }, [])

  async function loadTip() {
    setLoading(true)
    try {
      const existing = await getTodayTip()
      if (existing) {
        setTip(existing)
        loadHistory()
      } else {
        await generateTip()
      }
    } catch {
      toast.error('Error al cargar tip')
    } finally {
      setLoading(false)
    }
  }

  async function generateTip() {
    try {
      const res = await fetch('/api/ai/tip-of-day', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ knownTerms }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      const stored = await saveTip({
        kind: data.kind,
        term: data.term,
        meaning: data.meaning,
        example: data.example,
        register: data.register,
        source: data.source ?? null,
      })
      setTip(stored)
      loadHistory()
    } catch {
      toast.error('Error al generar tip')
    }
  }

  async function loadHistory() {
    try {
      const h = await listTipHistory(14)
      setHistory(h)
    } catch {
      // non-critical
    }
  }

  if (loading) {
    return (
      <div className="rounded-lg border border-primary/20 bg-primary/5 p-5 flex items-center gap-3">
        <Loader2 className="size-4 animate-spin text-primary/60" />
        <span className="text-sm text-muted-foreground">Generando tip del día…</span>
      </div>
    )
  }

  if (!tip) return null

  const pastTips = history.filter((h) => h.id !== tip.id)

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-primary/20 bg-primary/5 p-5">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[10px] uppercase tracking-[0.22em] text-primary/70">
            Tip of the day
          </p>
          <span className="text-[10px] text-muted-foreground/50">
            {new Date(tip.tip_date + 'T00:00:00').toLocaleDateString('es-AR', {
              day: 'numeric',
              month: 'short',
            })}
          </span>
        </div>

        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="font-mono text-base font-medium text-foreground">{tip.term}</span>
          <span
            className={cn(
              'text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded-sm font-medium',
              KIND_BG[tip.kind],
            )}
          >
            {tip.kind}
          </span>
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground/60">
            {tip.register}
          </span>
        </div>

        <p className="mt-2 text-sm text-muted-foreground">{tip.meaning}</p>
        <p className="mt-1.5 text-[13px] text-muted-foreground/80 italic">"{tip.example}"</p>

        {tip.source && (
          <p className="mt-2 text-[11px] text-muted-foreground/50">
            From: {tip.source}
          </p>
        )}
      </div>

      {pastTips.length > 0 && (
        <div>
          <button
            type="button"
            onClick={() => setShowHistory((v) => !v)}
            className="flex items-center gap-1.5 text-[11px] text-muted-foreground/60 hover:text-muted-foreground transition-colors"
          >
            <ChevronDown
              className={cn('size-3.5 transition-transform', showHistory && 'rotate-180')}
            />
            Historial ({pastTips.length})
          </button>

          {showHistory && (
            <div className="mt-2 space-y-0.5 rounded-lg border border-border/60 overflow-hidden">
              {pastTips.map((h) => (
                <div
                  key={h.id}
                  className="flex items-center gap-3 px-3 py-2 hover:bg-muted/30 transition-colors"
                >
                  <span className="text-[10px] text-muted-foreground/50 shrink-0 tabular-nums w-16">
                    {new Date(h.tip_date + 'T00:00:00').toLocaleDateString('es-AR', {
                      day: 'numeric',
                      month: 'short',
                    })}
                  </span>
                  <span className={cn('text-[10px] shrink-0', KIND_COLOR[h.kind])}>
                    {h.kind}
                  </span>
                  <span className="font-mono text-sm text-foreground truncate">{h.term}</span>
                  <span className="text-xs text-muted-foreground truncate flex-1 hidden sm:block">
                    {h.meaning}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
