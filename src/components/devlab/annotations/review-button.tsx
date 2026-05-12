import { useState } from 'react'
import { Sparkles, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { stripHtml } from '@/lib/ai/extract'
import { bulkCreateAnnotations } from '@/lib/devlab/annotations-queries'
import type { DevLabBlock, DevLabAnnotation, DevLabAnnotationKind } from '@/lib/devlab/types'

interface Props {
  postId: string | null
  blocks: DevLabBlock[]
  pendingCount: number
  onCreated: (annotations: DevLabAnnotation[]) => void
}

type ProposedAnnotation = {
  blockId: string
  originalText: string
  suggestion: string
  rationale?: string
  kind: DevLabAnnotationKind
}

export function ReviewButton({ postId, blocks, pendingCount, onCreated }: Props) {
  const [loading, setLoading] = useState(false)

  async function handleReview() {
    if (!postId) {
      toast.error('Guardá el post primero')
      return
    }
    const textBlocks = blocks
      .filter((b): b is Extract<DevLabBlock, { kind: 'text' }> => b.kind === 'text')
      .map((b) => ({ id: b.id, plainText: stripHtml(b.html) }))
      .filter((b) => b.plainText.length > 20)

    if (textBlocks.length === 0) {
      toast.error('Sin bloques de texto para revisar')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/ai/review-devlab', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blocks: textBlocks }),
      })
      if (!res.ok) throw new Error(`review http ${res.status}`)
      const data = (await res.json()) as { annotations: ProposedAnnotation[] }
      if (data.annotations.length === 0) {
        toast.success('Sin sugerencias — el texto está bien')
        return
      }
      const saved = await bulkCreateAnnotations(
        postId,
        data.annotations.map((a) => ({
          block_id: a.blockId,
          original_text: a.originalText,
          suggestion: a.suggestion,
          rationale: a.rationale ?? null,
          kind: a.kind,
        })),
      )
      onCreated(saved)
      toast.success(`${saved.length} sugerencias añadidas`)
    } catch (err) {
      console.error('[devlab review]', err)
      toast.error('No se pudo revisar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      size="sm"
      variant="outline"
      onClick={handleReview}
      disabled={loading}
      className="gap-1.5"
    >
      {loading ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}
      {loading ? 'Revisando…' : 'Revisar con IA'}
      {pendingCount > 0 && (
        <span className="ml-1 inline-flex items-center justify-center min-w-[1.25rem] h-4 px-1 rounded-full bg-primary/15 text-primary text-[10px] font-medium">
          {pendingCount}
        </span>
      )}
    </Button>
  )
}
