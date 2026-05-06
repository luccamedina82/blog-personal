import { createContext, useContext } from 'react'

interface PdfPanelCtx {
  openPdf: (storagePath: string, page?: number) => void
}

export const PdfPanelContext = createContext<PdfPanelCtx>({
  openPdf: () => {},
})

export function usePdfPanel() {
  return useContext(PdfPanelContext)
}
