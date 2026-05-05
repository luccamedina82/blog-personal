import { createContext, useContext } from 'react'

export type BacklinkSuggestion = { id: string; title: string; hint?: string }

export const BacklinkSuggestionsContext = createContext<BacklinkSuggestion[]>([])

export function useBacklinkSuggestions(): BacklinkSuggestion[] {
  return useContext(BacklinkSuggestionsContext)
}
