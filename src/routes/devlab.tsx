import { createFileRoute } from '@tanstack/react-router'
import { DevLabSection } from '@/components/sections/devlab-section'

export const Route = createFileRoute('/devlab')({
  validateSearch: (search: Record<string, unknown>) => ({
    post: typeof search.post === 'string' ? search.post : undefined,
    category: typeof search.category === 'string' ? search.category : undefined,
  }),
  component: DevLabPage,
})

function DevLabPage() {
  const { post, category } = Route.useSearch()
  return <DevLabSection initialPostId={post} initialCategoryId={category} />
}
