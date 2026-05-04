import { createFileRoute } from '@tanstack/react-router'
import { EnglishSection } from '@/components/sections/english-section'

export const Route = createFileRoute('/english')({
  component: EnglishSection,
})
