import { createFileRoute } from '@tanstack/react-router'
import { TextAnalyzer } from '@/components/text-analyzer'

export const Route = createFileRoute('/english/evaluator')({
  component: EvaluatorPage,
})

function EvaluatorPage() {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-1">Tooling</p>
        <h2 className="text-xl font-medium tracking-tight">Evaluator agent</h2>
        <p className="mt-1.5 text-sm text-muted-foreground max-w-2xl">
          Paste a paragraph and the agent returns a six-axis profile across
          formality, naturalness, nativeness, complexity, cohesion and coherence.
        </p>
      </div>
      <TextAnalyzer />
    </div>
  )
}
