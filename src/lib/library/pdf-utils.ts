import { pdfjs } from 'react-pdf'

let initialized = false

export function ensurePdfWorker() {
  if (initialized) return
  // CDN worker bypasses Vite bundling issues with pdfjs-dist pure ESM
  pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`
  initialized = true
}

export async function getPdfPageCount(file: File): Promise<number> {
  ensurePdfWorker()
  const url = URL.createObjectURL(file)
  try {
    const pdf = await pdfjs.getDocument({ url }).promise
    return pdf.numPages
  } finally {
    URL.revokeObjectURL(url)
  }
}

export async function generatePdfCover(file: File, maxWidth = 400): Promise<Blob> {
  ensurePdfWorker()
  const url = URL.createObjectURL(file)
  try {
    const pdf = await pdfjs.getDocument({ url }).promise
    const page = await pdf.getPage(1)
    const viewport = page.getViewport({ scale: 1 })
    const scale = Math.min(1, maxWidth / viewport.width)
    const scaled = page.getViewport({ scale })

    const canvas = document.createElement('canvas')
    canvas.width = scaled.width
    canvas.height = scaled.height
    const ctx = canvas.getContext('2d')!
    await page.render({ canvasContext: ctx, viewport: scaled }).promise

    return new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('Cover generation failed'))),
        'image/jpeg',
        0.82,
      )
    })
  } finally {
    URL.revokeObjectURL(url)
  }
}
