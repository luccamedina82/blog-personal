import { createFileRoute } from '@tanstack/react-router'
import { DevLabSection } from '@/components/sections/devlab-section'

export const Route = createFileRoute('/devlab')({
  component: DevLabSection,
})
