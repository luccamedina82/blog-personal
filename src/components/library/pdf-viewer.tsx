import { useState, useEffect, useCallback } from 'react'
import { Document, Page } from 'react-pdf'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { getSignedUrl } from '@/lib/library/queries'
import { ensurePdfWorker } from '@/lib/library/pdf-utils'

ensurePdfWorker()

interface Props {
  storagePath: string
  initialPage?: number
  onPageChange?: (page: number) => void
  className?: string
}

export function PdfViewer({ storagePath, initialPage = 1, onPageChange, className }: Props) {
  'use no memo'
  const [url, setUrl] = useState<string | null>(null)
  const [urlError, setUrlError] = useState(false)
  const [numPages, setNumPages] = useState(0)
  const [page, setPage] = useState(initialPage)
  const [pageInput, setPageInput] = useState(String(initialPage))
  const [fitWidth, setFitWidth] = useState(true)
  const [scale, setScale] = useState(1.0)
  const [containerWidth, setContainerWidth] = useState(0)

  useEffect(() => {
    setUrl(null)
    setUrlError(false)
    getSignedUrl(storagePath)
      .then(setUrl)
      .catch(() => setUrlError(true))
  }, [storagePath])

  useEffect(() => {
    setPage(initialPage)
    setPageInput(String(initialPage))
  }, [initialPage])

  const containerRef = useCallback((node: HTMLDivElement | null) => {
    if (!node) return
    const ro = new ResizeObserver((entries) => {
      setContainerWidth(entries[0].contentRect.width)
    })
    ro.observe(node)
  }, [])

  function goTo(n: number) {
    const clamped = Math.max(1, Math.min(n, numPages || 1))
    setPage(clamped)
    setPageInput(String(clamped))
    onPageChange?.(clamped)
  }

  function commitPageInput() {
    const n = parseInt(pageInput)
    if (!isNaN(n)) goTo(n)
    else setPageInput(String(page))
  }

  const pageWidth = fitWidth && containerWidth > 0 ? containerWidth - 48 : undefined
  const pageScale = fitWidth ? undefined : scale

  if (urlError) {
    return (
      <div className={cn('flex items-center justify-center h-full text-sm text-muted-foreground', className)}>
        Error al cargar el PDF.
      </div>
    )
  }

  if (!url) {
    return (
      <div className={cn('flex flex-col gap-3 p-6', className)}>
        <div className="h-6 w-32 rounded bg-secondary/60 animate-pulse" />
        {Array.from({ length: 10 }).map((_, i) => (
          <div
            key={i}
            className="h-3 rounded bg-secondary/40 animate-pulse"
            style={{ width: `${60 + (i % 4) * 10}%` }}
          />
        ))}
      </div>
    )
  }

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Toolbar */}
      <div className="flex items-center gap-1.5 px-3 py-2 border-b border-border/70 bg-background shrink-0">
        <Button
          variant="ghost" size="icon" className="size-7"
          onClick={() => goTo(page - 1)} disabled={page <= 1}
        >
          <ChevronLeft className="size-3.5" />
        </Button>

        <div className="flex items-center gap-1">
          <Input
            value={pageInput}
            onChange={(e) => setPageInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') commitPageInput() }}
            onBlur={commitPageInput}
            className="h-6 w-12 text-center text-xs px-1"
          />
          <span className="text-xs text-muted-foreground tabular-nums">/ {numPages}</span>
        </div>

        <Button
          variant="ghost" size="icon" className="size-7"
          onClick={() => goTo(page + 1)} disabled={page >= numPages}
        >
          <ChevronRight className="size-3.5" />
        </Button>

        <div className="flex items-center gap-0.5 ml-auto">
          <Button
            variant="ghost" size="icon" className="size-7"
            onClick={() => { setFitWidth(false); setScale((s) => parseFloat(Math.max(0.5, s - 0.15).toFixed(2))) }}
            disabled={!fitWidth && scale <= 0.5}
          >
            <ZoomOut className="size-3.5" />
          </Button>
          <span className="text-[11px] text-muted-foreground tabular-nums w-9 text-center">
            {fitWidth ? 'auto' : `${Math.round(scale * 100)}%`}
          </span>
          <Button
            variant="ghost" size="icon" className="size-7"
            onClick={() => { setFitWidth(false); setScale((s) => parseFloat(Math.min(3, s + 0.15).toFixed(2))) }}
            disabled={!fitWidth && scale >= 3}
          >
            <ZoomIn className="size-3.5" />
          </Button>
          <Button
            variant="ghost" size="icon" className={cn('size-7', fitWidth && 'bg-secondary')}
            onClick={() => setFitWidth((v) => !v)}
            title="Ajustar al ancho"
          >
            <Maximize2 className="size-3.5" />
          </Button>
        </div>
      </div>

      {/* Document */}
      <div
        ref={containerRef}
        className="flex-1 overflow-auto flex justify-center p-4 bg-muted/30"
      >
        <Document
          file={url}
          onLoadSuccess={({ numPages: n }) => setNumPages(n)}
          onLoadError={(err) => console.error('[PdfViewer] load error:', err)}
          loading={
            <div className="flex flex-col gap-2 w-full max-w-2xl mt-4">
              {Array.from({ length: 12 }).map((_, i) => (
                <div
                  key={i}
                  className="h-3 rounded bg-secondary/60 animate-pulse"
                  style={{ width: `${55 + (i % 5) * 9}%` }}
                />
              ))}
            </div>
          }
          error={
            <p className="text-sm text-destructive mt-8">Error al renderizar el PDF.</p>
          }
        >
          <Page
            pageNumber={page}
            width={pageWidth}
            scale={pageScale}
            renderTextLayer={false}
            renderAnnotationLayer={false}
            loading={
              <div
                className="rounded bg-secondary/40 animate-pulse"
                style={{ width: pageWidth ?? 600, height: Math.round((pageWidth ?? 600) * 1.414) }}
              />
            }
          />
        </Document>
      </div>
    </div>
  )
}
