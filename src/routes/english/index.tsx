import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/english/')({
  beforeLoad: () => {
    throw redirect({ to: '/english/anki', replace: true })
  },
  component: () => null,
})
