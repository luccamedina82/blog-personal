import { useState, useEffect, useCallback, useRef } from 'react'
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
  const [currentPage, setCurrentPage] = useState(initialPage)
  const [pageInput, setPageInput] = useState(String(initialPage))
  const [fitWidth, setFitWidth] = useState(true)
  const [scale, setScale] = useState(1.0)
  const [containerWidth, setContainerWidth] = useState(0)

  const containerRef = useRef<HTMLDivElement>(null)
  const pageRefs = useRef<Map<number, HTMLDivElement>>(new Map())
  const observerRef = useRef<IntersectionObserver | null>(null)

  useEffect(() => {
    setUrl(null)
    setUrlError(false)
    setNumPages(0)
    setCurrentPage(initialPage)
    setPageInput(String(initialPage))
    getSignedUrl(storagePath)
      .then(setUrl)
      .catch(() => setUrlError(true))
  }, [storagePath])

  // Sync pageInput when currentPage changes (e.g. via scroll)
  useEffect(() => {
    setPageInput(String(currentPage))
    onPageChange?.(currentPage)
  }, [currentPage])

  // ResizeObserver for fit-width
  const measureRef = useCallback((node: HTMLDivElement | null) => {
    if (!node) return
    const ro = new ResizeObserver((entries) => {
      setContainerWidth(entries[0].contentRect.width)
    })
    ro.observe(node)
  }, [])

  // IntersectionObserver: track which page is most visible
  useEffect(() => {
    if (!numPages) return
    observerRef.current?.disconnect()

    observerRef.current = new IntersectionObserver(
      (entries) => {
        let best: number | null = null
        let bestRatio = 0
        for (const entry of entries) {
          if (entry.isIntersecting && entry.intersectionRatio > bestRatio) {
            bestRatio = entry.intersectionRatio
            best = Number(entry.target.getAttribute('data-page'))
          }
        }
        if (best !== null) setCurrentPage(best)
      },
      { root: containerRef.current, threshold: [0, 0.25, 0.5, 0.75, 1] },
    )

    pageRefs.current.forEach((el) => observerRef.current!.observe(el))
    return () => observerRef.current?.disconnect()
  }, [numPages])

  function scrollToPage(n: number) {
    const el = pageRefs.current.get(n)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  function goTo(n: number) {
    const clamped = Math.max(1, Math.min(n, numPages || 1))
    scrollToPage(clamped)
    setCurrentPage(clamped)
    setPageInput(String(clamped))
  }

  function commitPageInput() {
    const n = parseInt(pageInput)
    if (!isNaN(n)) goTo(n)
    else setPageInput(String(currentPage))
  }

  const pageWidth = fitWidth && containerWidth > 0 ? containerWidth - 32 : undefined
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
          <div key={i} className="h-3 rounded bg-secondary/40 animate-pulse" style={{ width: `${60 + (i % 4) * 10}%` }} />
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
          onClick={() => goTo(currentPage - 1)} disabled={currentPage <= 1}
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
          onClick={() => goTo(currentPage + 1)} disabled={currentPage >= numPages}
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

      {/* Scrollable pages */}
      <div
        ref={(node) => { (containerRef as React.MutableRefObject<HTMLDivElement | null>).current = node; measureRef(node) }}
        className="flex-1 overflow-auto bg-muted/30"
      >
        <Document
          file={url}
          onLoadSuccess={({ numPages: n }) => {
            setNumPages(n)
            // Scroll to initialPage after load
            if (initialPage > 1) requestAnimationFrame(() => scrollToPage(initialPage))
          }}
          onLoadError={(err) => console.error('[PdfViewer] load error:', err)}
          loading={
            <div className="flex flex-col gap-2 p-6 max-w-2xl mx-auto">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="h-3 rounded bg-secondary/60 animate-pulse" style={{ width: `${55 + (i % 5) * 9}%` }} />
              ))}
            </div>
          }
          error={<p className="text-sm text-destructive p-6">Error al renderizar el PDF.</p>}
        >
          {Array.from({ length: numPages }, (_, i) => i + 1).map((n) => (
            <div
              key={n}
              data-page={n}
              ref={(el) => {
                if (el) { pageRefs.current.set(n, el); observerRef.current?.observe(el) }
                else pageRefs.current.delete(n)
              }}
              className="flex justify-center px-4 py-3"
            >
              <Page
                pageNumber={n}
                width={pageWidth}
                scale={pageScale}
                renderTextLayer
                renderAnnotationLayer={false}
                loading={
                  <div
                    className="rounded bg-secondary/40 animate-pulse"
                    style={{ width: pageWidth ?? 600, height: Math.round((pageWidth ?? 600) * 1.414) }}
                  />
                }
              />
            </div>
          ))}
        </Document>
      </div>
    </div>
  )
}
