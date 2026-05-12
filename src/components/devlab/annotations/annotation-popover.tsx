import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Check, X, Copy, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import type { DevLabAnnotation, DevLabAnnotationKind } from '@/lib/devlab/types'

const KIND_LABEL: Record<DevLabAnnotationKind, string> = {
  grammar: 'Grammar',
  style: 'Style',
  clarity: 'Clarity',
  suggestion: 'Suggestion',
}

const KIND_COLOR: Record<DevLabAnnotationKind, string> = {
  grammar: 'text-red-400 border-red-500/40',
  style: 'text-amber-400 border-amber-500/40',
  clarity: 'text-blue-400 border-blue-500/40',
  suggestion: 'text-emerald-400 border-emerald-500/40',
}

interface Props {
  annotation: DevLabAnnotation
  pos: { top: number; left: number }
  onAccept: () => void
  onDismiss: () => void
  onClose: () => void
}

export function AnnotationPopover({ annotation, pos, onAccept, onDismiss, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', onMouseDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onMouseDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  function copy() {
    navigator.clipboard.writeText(annotation.suggestion)
    toast.success('Copied')
  }

  return createPortal(
    <div
      ref={ref}
      style={{ top: pos.top + 4, left: pos.left }}
      className="fixed z-[1000] w-[360px] max-w-[calc(100vw-2rem)] rounded-xl border border-border/70 bg-popover shadow-2xl shadow-black/40 p-4 space-y-3"
    >
      <div className="flex items-center justify-between">
        <span
          className={cn(
            'inline-flex items-center gap-1 px-2 py-0.5 text-[10px] uppercase tracking-wider rounded-full border bg-background/40',
            KIND_COLOR[annotation.kind],
          )}
        >
          <AlertCircle className="size-2.5" />
          {KIND_LABEL[annotation.kind]}
        </span>
        <button
          type="button"
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="size-3.5" />
        </button>
      </div>

      {/* Original (strikethrough) */}
      <div className="space-y-1">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Original</p>
        <p className="text-xs text-muted-foreground line-through leading-snug">
          {annotation.original_text}
        </p>
      </div>

      {/* Suggestion */}
      <div className="space-y-1">
        <p className="text-[10px] uppercase tracking-wider text-emerald-500">Suggested</p>
        <p className="text-sm text-foreground leading-snug">{annotation.suggestion}</p>
      </div>

      {annotation.rationale && (
        <p className="text-[11px] text-muted-foreground italic leading-relaxed border-t border-border/40 pt-2">
          💡 {annotation.rationale}
        </p>
      )}

      <div className="flex items-center gap-2 pt-2 border-t border-border/40">
        <Button size="sm" className="flex-1 gap-1.5" onClick={onAccept}>
          <Check className="size-3.5" />
          Accept
        </Button>
        <Button size="sm" variant="outline" className="flex-1 gap-1.5" onClick={onDismiss}>
          <X className="size-3.5" />
          Dismiss
        </Button>
        <Button size="sm" variant="ghost" className="size-8 p-0" onClick={copy} title="Copy suggestion">
          <Copy className="size-3.5" />
        </Button>
      </div>
    </div>,
    document.body,
  )
}
