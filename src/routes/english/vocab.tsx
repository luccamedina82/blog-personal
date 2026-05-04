import { createFileRoute } from '@tanstack/react-router'
import { DAILY_TIPS } from '@/mocks/english-section-mock'

const VOCAB = [
  { word: 'ineffable', meaning: 'Too great or extreme to be expressed in words.', context: 'An ineffable sense of relief settled over her.' },
  { word: 'halcyon', meaning: 'Denoting a period of time in the past that was idyllic.', context: 'Halcyon days of pre-internet summers.' },
  { word: 'perfunctory', meaning: 'Carried out with a minimum of effort or reflection.', context: 'He gave the report a perfunctory glance.' },
  { word: 'trenchant', meaning: 'Vigorous or incisive in expression or style.', context: 'Her trenchant critique left no room for rebuttal.' },
  { word: 'limn', meaning: 'To depict or describe in painting or words.', context: 'The novel limns a quiet provincial life.' },
]

const CONNECTORS = [
  { phrase: 'On balance', use: 'Concluding after weighing arguments.' },
  { phrase: 'Bearing this in mind', use: 'Carrying a prior point forward.' },
  { phrase: 'That said', use: 'Softening a contrast without contradicting.' },
  { phrase: 'Granted', use: 'Conceding a point before pivoting.' },
]

export const Route = createFileRoute('/english/vocab')({
  component: VocabPage,
})

function VocabPage() {
  const todayTip = DAILY_TIPS[new Date().getDate() % DAILY_TIPS.length]

  return (
    <div className="space-y-10">
      {/* Tip del día */}
      <div className="rounded-lg border border-primary/20 bg-primary/5 p-5">
        <p className="text-[10px] uppercase tracking-[0.22em] text-primary/70 mb-2">Tip of the day</p>
        <div className="flex items-baseline gap-2">
          <span className="font-mono text-base font-medium text-foreground">{todayTip.term}</span>
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{todayTip.kind}</span>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">{todayTip.meaning}</p>
        <p className="mt-1.5 text-[13px] text-muted-foreground/80 italic">"{todayTip.example}"</p>
      </div>

      {/* Vocab table */}
      <div>
        <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-2">Vocab vault</p>
        <h2 className="text-xl font-medium tracking-tight mb-4">Words I keep returning to</h2>
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
                <div className="px-4 py-3 font-mono text-foreground">{v.word}</div>
                <div className="px-4 py-3 text-muted-foreground">{v.meaning}</div>
                <div className="px-4 py-3 text-muted-foreground/90 italic">"{v.context}"</div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Connectors */}
      <div>
        <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-1">Connectors</p>
        <h3 className="text-base font-medium mb-3">Discourse markers</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {CONNECTORS.map((c) => (
            <div key={c.phrase} className="rounded-md border border-border/70 bg-card/40 px-3.5 py-2.5">
              <p className="text-sm text-foreground">{c.phrase}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">{c.use}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
