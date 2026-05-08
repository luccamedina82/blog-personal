import { createContext, useContext } from 'react'

interface PdfPanelCtx {
  openPdf: (storagePath: string, page?: number) => void
  startCitationBrowse: (
    book: { id: string; title: string; storage_path: string },
    insertFn: (page: number) => void,
  ) => void
}

export const PdfPanelContext = createContext<PdfPanelCtx>({
  openPdf: () => {},
  startCitationBrowse: () => {},
})

export function usePdfPanel() {
  return useContext(PdfPanelContext)
}
