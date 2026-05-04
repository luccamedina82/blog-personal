import { createFileRoute } from '@tanstack/react-router'
import { JournalSection } from '@/components/sections/journal-section'

export const Route = createFileRoute('/bitacora')({
  component: JournalSection,
})
