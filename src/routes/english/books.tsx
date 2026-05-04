import { createFileRoute } from '@tanstack/react-router'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Star } from 'lucide-react'

const BOOKS = [
  {
    title: 'The Remains of the Day',
    author: 'Kazuo Ishiguro',
    rating: 5,
    summary: 'A butler retraces a six-day drive through the English countryside while quietly unraveling a life of restraint, dignity, and missed affection.',
    tags: ['Novel', 'Restrained prose'],
  },
  {
    title: 'Educated',
    author: 'Tara Westover',
    rating: 4,
    summary: 'A memoir of self-invention through formal study, written with the sober clarity of a survivor mapping her own escape route.',
    tags: ['Memoir', 'Bildungsroman'],
  },
  {
    title: 'The Sense of Style',
    author: 'Steven Pinker',
    rating: 4,
    summary: 'A modern stylebook that grounds writing advice in cognitive science instead of dogma — useful for technical writers especially.',
    tags: ['Style', 'Reference'],
  },
]

function Stars({ n }: { n: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={i < n ? 'size-3 fill-primary text-primary' : 'size-3 text-muted-foreground/30'}
        />
      ))}
    </div>
  )
}

export const Route = createFileRoute('/english/books')({
  component: BooksPage,
})

function BooksPage() {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-1">Reading log</p>
        <h2 className="text-xl font-medium tracking-tight">Mini summaries</h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {BOOKS.map((b) => (
          <Card
            key={b.title}
            className="bg-card/60 border-border/70 p-5 transition-all duration-300 hover:bg-card hover:border-border"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="text-sm font-medium">{b.title}</h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">{b.author}</p>
              </div>
              <Stars n={b.rating} />
            </div>
            <p className="mt-4 text-[13px] text-muted-foreground leading-relaxed">{b.summary}</p>
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
    </div>
  )
}
