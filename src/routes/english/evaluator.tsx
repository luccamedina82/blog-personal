import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { TextAnalyzer } from '@/components/text-analyzer'
import { SourcePicker, type SourceMode } from '@/components/english/evaluator/source-picker'
import { HistoryChart } from '@/components/english/evaluator/history-chart'
import { listEvaluatorRuns } from '@/lib/english/queries'
import type { EvaluatorRun } from '@/lib/english/types'

export const Route = createFileRoute('/english/evaluator')({
  component: EvaluatorPage,
})

function EvaluatorPage() {
  'use no memo'
  const [source, setSource] = useState<SourceMode>('paste')
  const [sourceRef, setSourceRef] = useState<string | null>(null)
  const [sourceTitle, setSourceTitle] = useState<string | undefined>()
  const [externalText, setExternalText] = useState<string | undefined>()
  const [runs, setRuns] = useState<EvaluatorRun[]>([])

  useEffect(() => {
    listEvaluatorRuns()
      .then(setRuns)
      .catch(() => {})
  }, [])

  function handleModeChange(mode: SourceMode) {
    setSource(mode)
    setSourceRef(null)
    setSourceTitle(undefined)
    setExternalText(undefined)
  }

  function handleTextLoad(text: string, ref: string, title: string) {
    setExternalText(text)
    setSourceRef(ref)
    setSourceTitle(title)
  }

  function handleSaved(run: EvaluatorRun) {
    setRuns((prev) => [run, ...prev])
  }

  function handleRunUpdate(id: string, updates: Partial<EvaluatorRun>) {
    setRuns((prev) => prev.map((r) => (r.id === id ? { ...r, ...updates } : r)))
  }

  async function handleClear() {
    try {
      const fresh = await listEvaluatorRuns()
      setRuns(fresh)
    } catch {}
  }

  return (
    <div className="space-y-8">
      <div>
        <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-1">Tooling</p>
        <h2 className="text-xl font-medium tracking-tight">Evaluator agent</h2>
        <p className="mt-1.5 text-sm text-muted-foreground max-w-2xl">
          Paste a paragraph — or pick a post from Bitácora or DevLab — and get a six-axis English profile.
          Every run is saved automatically.
        </p>
      </div>

      <SourcePicker
        mode={source}
        onModeChange={handleModeChange}
        onTextLoad={handleTextLoad}
      />

      <TextAnalyzer
        source={source}
        sourceRef={sourceRef}
        sourceTitle={sourceTitle}
        initialText={externalText}
        onSaved={handleSaved}
      />

      {runs.length > 0 && (
        <HistoryChart runs={runs} onClear={handleClear} onRunUpdate={handleRunUpdate} />
      )}
    </div>
  )
}
