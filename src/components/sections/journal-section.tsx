import { Card } from '@/components/ui/card'
import { Heart, MessageCircle, Play } from 'lucide-react'

type Post =
  | {
      type: 'text'
      date: string
      mood?: string
      title?: string
      content: string
    }
  | {
      type: 'gallery'
      date: string
      mood?: string
      caption: string
      images: string[]
    }
  | {
      type: 'video'
      date: string
      mood?: string
      caption: string
      poster: string
      meta: string
    }

const POSTS: Post[] = [
  {
    type: 'text',
    date: 'Apr 28, 2026',
    mood: 'Reflective',
    title: 'On unfinished things',
    content:
      'I am learning that an unfinished side project is not a failure — it is a recorded conversation with a previous self. The notes outlive the code. The code rusts; the questions don\'t.',
  },
  {
    type: 'gallery',
    date: 'Apr 25, 2026',
    mood: 'Curious',
    caption: 'Late session at the desk. Mechanical keys, cold coffee, warm lamp.',
    images: ['/journal-1.jpg', '/journal-3.jpg'],
  },
  {
    type: 'text',
    date: 'Apr 22, 2026',
    mood: 'Calm',
    content:
      'Walked twelve kilometers without my phone. The first hour was loud inside my head; by the second, the noise had finally settled into something like a draft.',
  },
  {
    type: 'video',
    date: 'Apr 19, 2026',
    mood: 'Inspired',
    caption: 'Foggy dawn from the cabin window. Field recording for the next post.',
    poster: '/journal-2.jpg',
    meta: '1:24 · silent',
  },
  {
    type: 'text',
    date: 'Apr 17, 2026',
    title: 'Note to self',
    content:
      'Read more poetry, even if I don\'t understand it on the first pass. Especially then.',
  },
]

function PostShell({
  date,
  mood,
  children,
}: {
  date: string
  mood?: string
  children: React.ReactNode
}) {
  return (
    <Card className="bg-card/60 border-border/70 overflow-hidden transition-colors hover:border-border hover:bg-card">
      <div className="flex items-center gap-3 px-5 pt-4 text-[11px] text-muted-foreground">
        <span className="tabular-nums">{date}</span>
        {mood && (
          <>
            <span className="size-0.5 rounded-full bg-muted-foreground/50" />
            <span className="text-primary uppercase tracking-[0.16em] text-[10px]">
              {mood}
            </span>
          </>
        )}
      </div>
      {children}
      <div className="flex items-center gap-4 px-5 pb-4 pt-3 text-[11px] text-muted-foreground border-t border-border/60 mt-2">
        <button
          type="button"
          className="flex items-center gap-1 hover:text-foreground transition-colors"
        >
          <Heart className="size-3.5" />
          <span className="tabular-nums">12</span>
        </button>
        <button
          type="button"
          className="flex items-center gap-1 hover:text-foreground transition-colors"
        >
          <MessageCircle className="size-3.5" />
          <span className="tabular-nums">3</span>
        </button>
      </div>
    </Card>
  )
}

export function JournalSection() {
  return (
    <div className="max-w-3xl mx-auto px-6 lg:px-12 py-12 lg:py-20">
      {/* Header */}
      <header className="mb-10">
        <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-2">
          Module D · Bitácora
        </p>
        <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-balance">
          Daily log
        </h1>
        <p className="mt-3 text-base text-muted-foreground leading-relaxed">
          A casual wall of texts, photos, and clips. Personal, low-stakes, and
          honest.
        </p>
      </header>

      {/* Composer */}
      <div className="rounded-lg border border-border/70 bg-card/40 p-4 mb-8">
        <textarea
          rows={2}
          placeholder="What are you noticing today?"
          className="w-full resize-none bg-transparent text-sm text-foreground placeholder:text-muted-foreground/70 focus:outline-none leading-relaxed"
        />
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
            <button type="button" className="hover:text-foreground transition-colors">
              + photo
            </button>
            <button type="button" className="hover:text-foreground transition-colors">
              + video
            </button>
            <button type="button" className="hover:text-foreground transition-colors">
              + mood
            </button>
          </div>
          <button
            type="button"
            className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90 transition-opacity"
          >
            Post
          </button>
        </div>
      </div>

      {/* Feed */}
      <div className="flex flex-col gap-4">
        {POSTS.map((p, idx) => {
          if (p.type === 'text') {
            return (
              <PostShell key={idx} date={p.date} mood={p.mood}>
                <div className="px-5 pt-3 pb-1">
                  {p.title && (
                    <h3 className="text-base font-medium text-foreground mb-1.5">
                      {p.title}
                    </h3>
                  )}
                  <p className="text-[15px] text-foreground/90 leading-relaxed text-pretty">
                    {p.content}
                  </p>
                </div>
              </PostShell>
            )
          }
          if (p.type === 'gallery') {
            return (
              <PostShell key={idx} date={p.date} mood={p.mood}>
                <div className="px-5 pt-3">
                  <p className="text-[14px] text-foreground/85 leading-relaxed">
                    {p.caption}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-1 mt-3 px-5">
                  {p.images.map((src, i) => (
                    <div
                      key={i}
                      className="relative aspect-[4/3] overflow-hidden rounded-md border border-border/60"
                    >
                      <img
                        src={src || '/placeholder.svg'}
                        alt={`${p.caption} — image ${i + 1}`}
                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 hover:scale-[1.03]"
                      />
                    </div>
                  ))}
                </div>
              </PostShell>
            )
          }
          return (
            <PostShell key={idx} date={p.date} mood={p.mood}>
              <div className="px-5 pt-3">
                <p className="text-[14px] text-foreground/85 leading-relaxed">
                  {p.caption}
                </p>
              </div>
              <div className="relative mt-3 mx-5 aspect-video overflow-hidden rounded-md border border-border/60 group">
                <img
                  src={p.poster || '/placeholder.svg'}
                  alt={p.caption}
                  className="absolute inset-0 w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-background/30 group-hover:bg-background/20 transition-colors flex items-center justify-center">
                  <div className="size-12 rounded-full bg-background/90 backdrop-blur-sm flex items-center justify-center border border-border/70">
                    <Play className="size-4 ml-0.5 text-foreground" />
                  </div>
                </div>
                <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-background/80 backdrop-blur-sm text-[10px] font-mono tabular-nums text-foreground border border-border/60">
                  {p.meta}
                </div>
              </div>
            </PostShell>
          )
        })}
      </div>

      <div className="mt-10 text-center text-[11px] text-muted-foreground">
        — end of feed —
      </div>
    </div>
  )
}
