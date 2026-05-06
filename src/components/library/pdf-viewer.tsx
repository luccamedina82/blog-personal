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
import type { DocumentProps } from 'react-pdf'

ensurePdfWorker()

type PdfDoc = Parameters<NonNullable<DocumentProps['onLoadSuccess']>>[0]

const RENDER_MARGIN = '900px' // pages within 900px of viewport get rendered

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
  // Pages that should render their <Page> (near viewport)
  const [renderedPages, setRenderedPages] = useState<Set<number>>(new Set())
  const [ratiosReady, setRatiosReady] = useState(false)

  const containerRef = useRef<HTMLDivElement>(null)
  const aspectRatios = useRef<Map<number, number>>(new Map())
  const pageWrapperRefs = useRef<Map<number, HTMLDivElement>>(new Map())
  const renderObserver = useRef<IntersectionObserver | null>(null)
  const scrollRafRef = useRef<number | null>(null)

  useEffect(() => {
    setUrl(null)
    setUrlError(false)
    setNumPages(0)
    setRenderedPages(new Set())
    aspectRatios.current.clear()
    setRatiosReady(false)
    setCurrentPage(initialPage)
    setPageInput(String(initialPage))
    getSignedUrl(storagePath).then(setUrl).catch(() => setUrlError(true))
  }, [storagePath])

  useEffect(() => {
    setPageInput(String(currentPage))
    onPageChange?.(currentPage)
  }, [currentPage])

  // Setup render observer (pre-loads pages near viewport)
  useEffect(() => {
    if (!numPages || !containerRef.current) return

    renderObserver.current?.disconnect()
    renderObserver.current = new IntersectionObserver(
      (entries) => {
        const toAdd: number[] = []
        for (const e of entries) {
          if (e.isIntersecting) toAdd.push(Number(e.target.getAttribute('data-page')))
        }
        if (toAdd.length > 0) {
          setRenderedPages((prev) => {
            const next = new Set(prev)
            toAdd.forEach((n) => next.add(n))
            return next
          })
        }
      },
      { root: containerRef.current, rootMargin: RENDER_MARGIN, threshold: 0 },
    )

    pageWrapperRefs.current.forEach((el) => {
      renderObserver.current!.observe(el)
    })

    return () => {
      renderObserver.current?.disconnect()
    }
  }, [numPages])

  function computeCurrentPage() {
    const container = containerRef.current
    if (!container || !pageWrapperRefs.current.size) return
    const readingLine = container.scrollTop + container.clientHeight * 0.4

    let best = 1
    let bestDist = Infinity
    for (const [n, el] of pageWrapperRefs.current) {
      const top = el.offsetTop
      const bottom = top + el.offsetHeight
      if (top <= readingLine && bottom > readingLine) {
        setCurrentPage(n)
        return
      }
      const dist = Math.min(Math.abs(top - readingLine), Math.abs(bottom - readingLine))
      if (dist < bestDist) {
        bestDist = dist
        best = n
      }
    }
    setCurrentPage(best)
  }

  function onContainerScroll() {
    if (scrollRafRef.current !== null) cancelAnimationFrame(scrollRafRef.current)
    scrollRafRef.current = requestAnimationFrame(computeCurrentPage)
  }

  const containerMeasureRef = useCallback((node: HTMLDivElement | null) => {
    if (!node) return
    const ro = new ResizeObserver((entries) => setContainerWidth(entries[0].contentRect.width))
    ro.observe(node)
  }, [])

  async function onDocumentLoad(pdf: PdfDoc) {
    setNumPages(pdf.numPages)
    const pages = await Promise.all(
      Array.from({ length: pdf.numPages }, (_, i) => pdf.getPage(i + 1)),
    )
    for (const p of pages) {
      const vp = p.getViewport({ scale: 1 })
      aspectRatios.current.set(p.pageNumber, vp.height / vp.width)
    }
    setRatiosReady(true)
  }

  useEffect(() => {
    if (ratiosReady && initialPage > 1) {
      requestAnimationFrame(() => scrollToPage(initialPage))
    }
  }, [ratiosReady])

  function scrollToPage(n: number) {
    pageWrapperRefs.current.get(n)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
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

  function placeholderHeight(n: number) {
    const ratio = aspectRatios.current.get(n) ?? 1.414 // A4 fallback
    return Math.round((pageWidth ?? 600) * ratio)
  }

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
        <Button variant="ghost" size="icon" className="size-7" onClick={() => goTo(currentPage - 1)} disabled={currentPage <= 1}>
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
        <Button variant="ghost" size="icon" className="size-7" onClick={() => goTo(currentPage + 1)} disabled={currentPage >= numPages}>
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

      {/* Scrollable container */}
      <div
        ref={(node) => {
          (containerRef as React.MutableRefObject<HTMLDivElement | null>).current = node
          containerMeasureRef(node)
        }}
        className="flex-1 overflow-auto bg-muted/30"
        onScroll={onContainerScroll}
      >
        <Document
          file={url}
          onLoadSuccess={onDocumentLoad}
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
                if (el) {
                  pageWrapperRefs.current.set(n, el)
                  renderObserver.current?.observe(el)
                } else {
                  pageWrapperRefs.current.delete(n)
                }
              }}
              className="flex justify-center px-4 py-3"
              // Stable height prevents scroll position jumps when page mounts/unmounts
              style={{ minHeight: placeholderHeight(n) + 24 }}
            >
              {renderedPages.has(n) ? (
                <Page
                  pageNumber={n}
                  width={pageWidth}
                  scale={pageScale}
                  renderTextLayer
                  renderAnnotationLayer={false}
                  loading={
                    <div
                      className="rounded bg-secondary/40 animate-pulse"
                      style={{ width: pageWidth ?? 600, height: placeholderHeight(n) }}
                    />
                  }
                />
              ) : (
                <div
                  className="rounded bg-secondary/30"
                  style={{ width: pageWidth ?? 600, height: placeholderHeight(n) }}
                />
              )}
            </div>
          ))}
        </Document>
      </div>
    </div>
  )
}
