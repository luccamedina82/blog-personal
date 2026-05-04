import { createFileRoute } from '@tanstack/react-router'
import { WaveformPlayer } from '@/components/waveform-player'

export const Route = createFileRoute('/english/shadowing')({
  component: ShadowingPage,
})

function ShadowingPage() {
  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-1">Audio</p>
        <h2 className="text-xl font-medium tracking-tight">Shadowing Studio</h2>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Upload and review shadowing recordings with transcript and notes — coming in Phase 5.
        </p>
      </div>

      <WaveformPlayer
        title="The unreasonable effectiveness of slow reading"
        source="Shadowing · BBC interview · 2026-04-22"
        duration={154}
      />

      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-md border border-border/70 bg-card/40 px-3 py-3">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Sessions</p>
          <p className="mt-1 font-mono text-sm tabular-nums">128</p>
        </div>
        <div className="rounded-md border border-border/70 bg-card/40 px-3 py-3">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Streak</p>
          <p className="mt-1 font-mono text-sm tabular-nums">19d</p>
        </div>
        <div className="rounded-md border border-border/70 bg-card/40 px-3 py-3">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Hours</p>
          <p className="mt-1 font-mono text-sm tabular-nums">42.5</p>
        </div>
      </div>
    </div>
  )
}
