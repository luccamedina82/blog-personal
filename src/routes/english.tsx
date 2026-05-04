import { createFileRoute, Outlet } from '@tanstack/react-router'
import { EnglishShell } from '@/components/english/english-shell'

export const Route = createFileRoute('/english')({
  component: EnglishLayout,
})

function EnglishLayout() {
  return <EnglishShell><Outlet /></EnglishShell>
}
