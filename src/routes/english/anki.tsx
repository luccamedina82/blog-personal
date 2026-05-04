import { createFileRoute } from '@tanstack/react-router'
import { Layers } from 'lucide-react'

export const Route = createFileRoute('/english/anki')({
  component: AnkiPage,
})

function AnkiPage() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="size-12 rounded-xl bg-secondary flex items-center justify-center mb-4">
        <Layers className="size-5 text-muted-foreground" />
      </div>
      <h2 className="text-lg font-medium tracking-tight mb-1">Anki Lab</h2>
      <p className="text-sm text-muted-foreground max-w-xs">
        Spaced-repetition decks — coming in Phase 4.
      </p>
    </div>
  )
}
