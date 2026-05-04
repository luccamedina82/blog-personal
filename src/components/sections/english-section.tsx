import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { TextAnalyzer } from '@/components/text-analyzer'
import { WaveformPlayer } from '@/components/waveform-player'
import { Star } from 'lucide-react'

const BOOKS = [
  {
    title: 'The Remains of the Day',
    author: 'Kazuo Ishiguro',
    rating: 5,
    summary:
      'A butler retraces a six-day drive through the English countryside while quietly unraveling a life of restraint, dignity, and missed affection.',
    tags: ['Novel', 'Restrained prose'],
  },
  {
    title: 'Educated',
    author: 'Tara Westover',
    rating: 4,
    summary:
      'A memoir of self-invention through formal study, written with the sober clarity of a survivor mapping her own escape route.',
    tags: ['Memoir', 'Bildungsroman'],
  },
  {
    title: 'The Sense of Style',
    author: 'Steven Pinker',
    rating: 4,
    summary:
      'A modern stylebook that grounds writing advice in cognitive science instead of dogma — useful for technical writers especially.',
    tags: ['Style', 'Reference'],
  },
]

const VOCAB = [
  {
    word: 'ineffable',
    meaning: 'Too great or extreme to be expressed in words.',
    context: 'An ineffable sense of relief settled over her.',
  },
  {
    word: 'halcyon',
    meaning: 'Denoting a period of time in the past that was idyllic.',
    context: 'Halcyon days of pre-internet summers.',
  },
  {
    word: 'perfunctory',
    meaning: 'Carried out with a minimum of effort or reflection.',
    context: 'He gave the report a perfunctory glance.',
  },
  {
    word: 'trenchant',
    meaning: 'Vigorous or incisive in expression or style.',
    context: 'Her trenchant critique left no room for rebuttal.',
  },
  {
    word: 'limn',
    meaning: 'To depict or describe in painting or words.',
    context: 'The novel limns a quiet provincial life.',
  },
]

const CONNECTORS = [
  { phrase: 'On balance', use: 'Concluding after weighing arguments.' },
  { phrase: 'Bearing this in mind', use: 'Carrying a prior point forward.' },
  { phrase: 'That said', use: 'Softening a contrast without contradicting.' },
  { phrase: 'Granted', use: 'Conceding a point before pivoting.' },
]

function Stars({ n }: { n: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={
            i < n
              ? 'size-3 fill-primary text-primary'
              : 'size-3 text-muted-foreground/30'
          }
        />
      ))}
    </div>
  )
}

export function EnglishSection() {
  return (
    <div className="max-w-6xl mx-auto px-6 lg:px-12 py-12 lg:py-20 space-y-20">
      {/* Header */}
      <header>
        <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-2">
          Module C · English & Literature
        </p>
        <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-balance">
          A laboratory for reading and writing English.
        </h1>
        <p className="mt-3 max-w-2xl text-base text-muted-foreground leading-relaxed">
          Book notes, evaluator agent, vocabulary vault, and shadowing audio —
          all the tools I use to keep my English sharp.
        </p>
      </header>

      {/* Books */}
      <section>
        <header className="mb-6">
          <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-2">
            Reading log
          </p>
          <h2 className="text-2xl font-medium tracking-tight">Mini summaries</h2>
        </header>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {BOOKS.map((b) => (
            <Card
              key={b.title}
              className="bg-card/60 border-border/70 p-5 transition-all duration-300 hover:bg-card hover:border-border"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-sm font-medium">{b.title}</h3>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {b.author}
                  </p>
                </div>
                <Stars n={b.rating} />
              </div>
              <p className="mt-4 text-[13px] text-muted-foreground leading-relaxed">
                {b.summary}
              </p>
              <div className="mt-4 flex flex-wrap gap-1.5">
                {b.tags.map((t) => (
                  <Badge
                    key={t}
                    variant="secondary"
                    className="rounded-md text-[10px] font-normal bg-secondary/50 border border-border/60"
                  >
                    {t}
                  </Badge>
                ))}
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* Analyzer */}
      <section>
        <header className="mb-6">
          <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-2">
            Tooling
          </p>
          <h2 className="text-2xl font-medium tracking-tight">Evaluator agent</h2>
          <p className="mt-2 text-sm text-muted-foreground max-w-2xl">
            Paste a paragraph and the agent returns a six-axis profile across
            formality, naturalness, nativeness, complexity, cohesion and
            coherence.
          </p>
        </header>
        <TextAnalyzer />
      </section>

      {/* Vocab + Audio */}
      <section className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-6">
        {/* Vocab Vault */}
        <div>
          <header className="mb-4">
            <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-2">
              Vocab vault
            </p>
            <h2 className="text-xl font-medium tracking-tight">
              Words I keep returning to
            </h2>
          </header>
          <div className="rounded-lg border border-border/70 overflow-hidden bg-card/40">
            <div className="grid grid-cols-[1fr_1fr_1.6fr] text-[10px] uppercase tracking-[0.18em] text-muted-foreground bg-background/40 border-b border-border/70">
              <div className="px-4 py-2.5">Word</div>
              <div className="px-4 py-2.5">Meaning</div>
              <div className="px-4 py-2.5">Context</div>
            </div>
            <ul className="divide-y divide-border/70">
              {VOCAB.map((v) => (
                <li
                  key={v.word}
                  className="grid grid-cols-[1fr_1fr_1.6fr] text-[13px] hover:bg-card transition-colors"
                >
                  <div className="px-4 py-3 font-mono text-foreground">
                    {v.word}
                  </div>
                  <div className="px-4 py-3 text-muted-foreground">
                    {v.meaning}
                  </div>
                  <div className="px-4 py-3 text-muted-foreground/90 italic">
                    "{v.context}"
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* Connectors */}
          <header className="mt-8 mb-3">
            <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-1">
              Connectors
            </p>
            <h3 className="text-base font-medium">Discourse markers</h3>
          </header>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {CONNECTORS.map((c) => (
              <div
                key={c.phrase}
                className="rounded-md border border-border/70 bg-card/40 px-3.5 py-2.5"
              >
                <p className="text-sm text-foreground">{c.phrase}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {c.use}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Audio */}
        <div>
          <header className="mb-4">
            <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-2">
              Audio
            </p>
            <h2 className="text-xl font-medium tracking-tight">
              Shadowing recorder
            </h2>
          </header>
          <WaveformPlayer
            title="The unreasonable effectiveness of slow reading"
            source="Shadowing · BBC interview · 2026-04-22"
            duration={154}
          />
          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-md border border-border/70 bg-card/40 px-3 py-3">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Sessions
              </p>
              <p className="mt-1 font-mono text-sm tabular-nums">128</p>
            </div>
            <div className="rounded-md border border-border/70 bg-card/40 px-3 py-3">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Streak
              </p>
              <p className="mt-1 font-mono text-sm tabular-nums">19d</p>
            </div>
            <div className="rounded-md border border-border/70 bg-card/40 px-3 py-3">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Hours
              </p>
              <p className="mt-1 font-mono text-sm tabular-nums">42.5</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
