import { createFileRoute } from '@tanstack/react-router'
import { PortfolioSection } from '@/components/sections/portfolio-section'

export const Route = createFileRoute('/')({
  component: PortfolioSection,
})
