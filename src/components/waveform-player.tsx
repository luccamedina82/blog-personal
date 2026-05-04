import { useEffect, useMemo, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { Play, Pause, Mic, RotateCcw } from 'lucide-react'

interface WaveformPlayerProps {
  title: string
  source?: string
  duration?: number
  audioUrl?: string
  onTimeUpdate?: (currentTime: number, duration: number) => void
}

function generateBars(count: number, seed = 7) {
  const bars: number[] = []
  let s = seed
  for (let i = 0; i < count; i++) {
    s = (s * 9301 + 49297) % 233280
    const r = s / 233280
    const t = i / count
    const v =
      0.35 +
      Math.sin(t * Math.PI * 6) * 0.25 +
      Math.sin(t * Math.PI * 18 + 1.4) * 0.15 +
      r * 0.3
    bars.push(Math.max(0.08, Math.min(1, Math.abs(v))))
  }
  return bars
}

export function WaveformPlayer({
  title,
  source = 'Shadowing · BBC interview',
  duration: durationProp = 154,
  audioUrl,
  onTimeUpdate,
}: WaveformPlayerProps) {
  const BAR_COUNT = 96
  const bars = useMemo(() => generateBars(BAR_COUNT, title.length || 7), [title])
  const [progress, setProgress] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [duration, setDuration] = useState(durationProp)
  const containerRef = useRef<HTMLDivElement>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  // simulated playback refs
  const rafRef = useRef<number | null>(null)
  const lastTickRef = useRef<number>(0)

  // Real audio mode
  useEffect(() => {
    if (!audioUrl) return
    const audio = new Audio(audioUrl)
    audioRef.current = audio

    audio.addEventListener('loadedmetadata', () => {
      setDuration(audio.duration)
    })
    audio.addEventListener('timeupdate', () => {
      if (!audio.duration) return
      const p = audio.currentTime / audio.duration
      setProgress(p)
      onTimeUpdate?.(audio.currentTime, audio.duration)
    })
    audio.addEventListener('ended', () => {
      setPlaying(false)
      setProgress(1)
    })

    return () => {
      audio.pause()
      audio.src = ''
      audioRef.current = null
    }
  }, [audioUrl]) // eslint-disable-line react-hooks/exhaustive-deps

  // Simulated playback mode
  useEffect(() => {
    if (audioUrl) return
    if (!playing) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      return
    }
    lastTickRef.current = performance.now()
    const tick = (now: number) => {
      const dt = (now - lastTickRef.current) / 1000
      lastTickRef.current = now
      setProgress((p) => {
        const next = p + dt / duration
        if (next >= 1) {
          setPlaying(false)
          return 1
        }
        return next
      })
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [playing, duration, audioUrl])

  function togglePlay() {
    if (audioRef.current) {
      if (playing) {
        audioRef.current.pause()
        setPlaying(false)
      } else {
        if (progress >= 1) {
          audioRef.current.currentTime = 0
          setProgress(0)
        }
        audioRef.current.play()
        setPlaying(true)
      }
    } else {
      if (progress >= 1) setProgress(0)
      setPlaying((p) => !p)
    }
  }

  function seek(e: React.MouseEvent<HTMLDivElement>) {
    const el = containerRef.current
    if (!el) return
    const x = (e.clientX - el.getBoundingClientRect().left) / el.offsetWidth
    const t = Math.max(0, Math.min(1, x))
    setProgress(t)
    if (audioRef.current) {
      audioRef.current.currentTime = t * audioRef.current.duration
    }
  }

  function reset() {
    setPlaying(false)
    setProgress(0)
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
    }
  }

  const fmt = (s: number) => {
    if (!isFinite(s)) return '0:00'
    const m = Math.floor(s / 60)
    const sec = Math.floor(s % 60)
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  return (
    <div className="rounded-lg border border-border/70 bg-card/40 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 border-b border-border/70">
        <div className="flex items-center gap-2">
          <Mic className="size-3.5 text-primary" />
          <h3 className="text-sm font-medium">Audio · Shadowing</h3>
        </div>
        {source && (
          <span className="text-[10px] text-muted-foreground/70">{source}</span>
        )}
      </div>

      <div className="p-5 space-y-4">
        <p className="text-sm text-foreground">{title}</p>

        {/* Waveform */}
        <div
          ref={containerRef}
          onClick={seek}
          className="relative h-20 cursor-pointer select-none"
          role="slider"
          aria-label="Audio progress"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progress * 100)}
          tabIndex={0}
        >
          <div className="absolute inset-0 flex items-center gap-[2px]">
            {bars.map((h, i) => {
              const t = i / (BAR_COUNT - 1)
              const passed = t <= progress
              return (
                <div
                  key={i}
                  className={cn(
                    'flex-1 rounded-sm transition-colors duration-150',
                    passed ? 'bg-primary' : 'bg-muted-foreground/25',
                  )}
                  style={{ height: `${h * 100}%` }}
                />
              )
            })}
          </div>
          <div
            className="absolute top-0 bottom-0 w-px bg-foreground/80 transition-[left] duration-100"
            style={{ left: `${progress * 100}%` }}
          />
        </div>

        {/* Controls */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={togglePlay}
            className="size-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:opacity-90 transition-opacity"
            aria-label={playing ? 'Pause' : 'Play'}
          >
            {playing ? <Pause className="size-4" /> : <Play className="size-4 ml-0.5" />}
          </button>
          <button
            type="button"
            onClick={reset}
            className="size-9 rounded-full border border-border/70 text-muted-foreground hover:text-foreground hover:border-border flex items-center justify-center transition-colors"
            aria-label="Restart"
          >
            <RotateCcw className="size-3.5" />
          </button>
          <div className="ml-auto flex items-center gap-1 font-mono text-[11px] tabular-nums text-muted-foreground">
            <span className="text-foreground">{fmt(progress * duration)}</span>
            <span className="text-muted-foreground/60">/</span>
            <span>{fmt(duration)}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
