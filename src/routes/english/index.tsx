import { createFileRoute } from '@tanstack/react-router'
import { EnglishDashboard } from '@/components/english/dashboard'

export const Route = createFileRoute('/english/')({
  component: EnglishDashboard,
})
