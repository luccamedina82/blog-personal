import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/study/')({
  beforeLoad: () => {
    throw redirect({ to: '/study/decks', replace: true })
  },
})
