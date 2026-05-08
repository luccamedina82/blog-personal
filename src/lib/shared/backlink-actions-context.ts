import { createContext, useContext } from 'react'

export type BacklinkActions = {
  onNavigate: (title: string) => void
  onPreview: (title: string) => void
}

export const BacklinkActionsContext = createContext<BacklinkActions>({
  onNavigate: () => {},
  onPreview: () => {},
})

export function useBacklinkActions() {
  return useContext(BacklinkActionsContext)
}
