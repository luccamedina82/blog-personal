import { useState } from "react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { InteractiveCodeBlock } from "@/components/interactive-code-block"
import { DevLabPostEditor, type DraftPost } from "@/components/devlab-post-editor"
import {
  ArrowLeft,
  Clock,
  CalendarDays,
  ChevronRight,
  MessageSquare,
  BookOpen,
  Plus,
} from "lucide-react"
import { ANNOTATIONS, CATEGORIES, SAMPLE_CODE, type Category, type Post } from "@/mocks/devlab-section-mock"

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

type View =
  | { kind: "categories" }
  | { kind: "posts"; categoryId: string }
  | { kind: "post"; categoryId: string; postId: string }
  | { kind: "editor"; categoryId: string }

// --- Level 1: Category grid ---
function CategoryGrid({
  onSelect,
}: {
  onSelect: (id: string) => void
}) {
  return (
    <div className="px-6 lg:px-14 py-10 lg:py-16 max-w-5xl">
      <div className="mb-10">
        <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-2">
          Dev Lab
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">
          Technical Notes
        </h1>
        <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
          A structured collection of notes on computer science fundamentals —
          compilers, networks, systems, and the stuff that matters at the bottom
          of the stack.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
        {CATEGORIES.map((cat) => {
          const Icon = cat.icon
          const total = cat.posts.reduce((s) => s + 1, 0)
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => onSelect(cat.id)}
              className={cn(
                "group relative flex flex-col items-start gap-3 rounded-lg border border-border/70",
                "bg-card/40 hover:bg-card/80 p-5 text-left transition-all duration-200",
                "hover:border-primary/30 hover:shadow-[0_0_0_1px_hsl(var(--primary)/0.15)]",
              )}
            >
              <div className="flex w-full items-start justify-between">
                <span className="flex size-9 items-center justify-center rounded-md bg-secondary/60 border border-border/60">
                  <Icon className="size-4 text-primary" />
                </span>
                <ChevronRight className="size-4 text-muted-foreground/40 group-hover:text-primary transition-colors mt-1" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">
                  {cat.label}
                </p>
                <p className="mt-1 text-xs text-muted-foreground leading-relaxed line-clamp-2">
                  {cat.description}
                </p>
              </div>
              <p className="text-[10px] text-muted-foreground/60 tabular-nums">
                {total} {total === 1 ? "note" : "notes"}
              </p>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// --- Level 2: Post list ---
function PostList({
  category,
  onSelect,
  onBack,
  onNewPost,
}: {
  category: Category
  onSelect: (postId: string) => void
  onBack: () => void
  onNewPost: () => void
}) {
  const Icon = category.icon
  return (
    <div className="px-6 lg:px-14 py-10 lg:py-16 max-w-3xl">
      {/* Breadcrumb */}
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mb-8"
      >
        <ArrowLeft className="size-3.5" />
        All categories
      </button>

      {/* Category header */}
      <div className="flex items-start justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-md bg-secondary/60 border border-border/60">
            <Icon className="size-5 text-primary" />
          </span>
          <div>
            <h2 className="text-xl font-semibold tracking-tight">
              {category.label}
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {category.description}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onNewPost}
          className="flex items-center gap-1.5 shrink-0 h-8 px-3 rounded-md border border-border/60 bg-card/40 hover:bg-card/80 hover:border-primary/30 text-xs text-muted-foreground hover:text-foreground transition-all"
        >
          <Plus className="size-3.5" />
          New post
        </button>
      </div>

      {/* Post list */}
      <ul className="divide-y divide-border/50">
        {category.posts.map((post) => (
          <li key={post.id}>
            <button
              type="button"
              onClick={() => onSelect(post.id)}
              className="group w-full flex flex-col sm:flex-row sm:items-start gap-3 py-5 text-left hover:bg-secondary/20 -mx-3 px-3 rounded-md transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1.5">
                  {post.pinned && (
                    <span className="text-[9px] uppercase tracking-[0.18em] text-primary font-medium">
                      Pinned
                    </span>
                  )}
                  {post.tags.slice(0, 2).map((t) => (
                    <Badge
                      key={t}
                      variant="secondary"
                      className="rounded-sm text-[9px] font-mono font-normal bg-secondary/40 border border-border/50 h-4 px-1.5"
                    >
                      {t}
                    </Badge>
                  ))}
                </div>
                <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors leading-snug">
                  {post.title}
                </p>
                <p className="mt-1 text-xs text-muted-foreground leading-relaxed line-clamp-2">
                  {post.excerpt}
                </p>
                <div className="mt-2.5 flex items-center gap-3 text-[11px] text-muted-foreground/70">
                  <span className="flex items-center gap-1">
                    <CalendarDays className="size-3" />
                    {post.date}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="size-3" />
                    {post.readingTime}
                  </span>
                  <span className="flex items-center gap-1">
                    <MessageSquare className="size-3" />
                    {post.replies}
                  </span>
                </div>
              </div>
              <ChevronRight className="size-4 text-muted-foreground/30 group-hover:text-primary transition-colors shrink-0 mt-0.5 sm:mt-1" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

// --- Level 3: Individual Post ---
function PostView({
  category,
  post,
  onBack,
}: {
  category: Category
  post: Post
  onBack: () => void
}) {
  const hasCode = post.id === "c1"

  return (
    <article className="px-6 lg:px-14 py-10 lg:py-16 max-w-4xl">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-xs text-muted-foreground mb-8">
        <button
          type="button"
          onClick={() => onBack()}
          className="flex items-center gap-1.5 hover:text-foreground transition-colors"
        >
          <ArrowLeft className="size-3.5" />
          {category.label}
        </button>
      </nav>

      {/* Header */}
      <header className="mb-10">
        <div className="flex items-center gap-3 text-[11px] text-muted-foreground mb-4">
          <span className="text-primary uppercase tracking-[0.18em]">
            {category.label}
          </span>
          <span className="size-0.5 rounded-full bg-muted-foreground/40" />
          <span className="flex items-center gap-1">
            <CalendarDays className="size-3" />
            {post.date}
          </span>
          <span className="size-0.5 rounded-full bg-muted-foreground/40" />
          <span className="flex items-center gap-1">
            <Clock className="size-3" />
            {post.readingTime} read
          </span>
        </div>
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-balance leading-snug">
          {post.title}
        </h1>
        <p className="mt-4 text-[15px] text-muted-foreground leading-relaxed text-pretty max-w-2xl">
          {post.excerpt}
        </p>
        <div className="mt-5 flex flex-wrap gap-1.5">
          {post.tags.map((t) => (
            <Badge
              key={t}
              variant="secondary"
              className="rounded-md text-[10px] font-mono font-normal bg-secondary/50 border border-border/60"
            >
              {t}
            </Badge>
          ))}
        </div>
      </header>

      {/* Body */}
      <section className="space-y-6">
        {post.blocks ? (
          post.blocks.map((block) => {
            if (block.kind === "text")
              return (
                <p key={block.id} className="text-[15px] text-foreground/85 leading-relaxed">
                  {block.content}
                </p>
              )
            if (block.kind === "code")
              return (
                <InteractiveCodeBlock
                  key={block.id}
                  language={block.language}
                  filename={block.filename || undefined}
                  code={block.code}
                  annotations={block.annotations}
                />
              )
            if (block.kind === "quote")
              return (
                <blockquote
                  key={block.id}
                  className="border-l-2 border-primary/50 pl-5 py-1 text-[15px] text-foreground/80 italic"
                >
                  &ldquo;{block.content}&rdquo;
                  {block.attribution && (
                    <footer className="mt-1 text-xs text-muted-foreground not-italic">
                      {block.attribution}
                    </footer>
                  )}
                </blockquote>
              )
            return null
          })
        ) : hasCode ? (
          <>
            <p className="text-[15px] text-foreground/85 leading-relaxed">
              The simplest interpreter you can write is a recursive function
              over an Abstract Syntax Tree. It receives a tree, walks it, and
              returns a value. Below, an evaluator for arithmetic expressions
              in a handful of lines:
            </p>
            <InteractiveCodeBlock
              language="ts"
              filename="evaluator.ts"
              code={SAMPLE_CODE}
              annotations={ANNOTATIONS}
            />
            <p className="text-[15px] text-foreground/85 leading-relaxed">
              Click any highlighted line in the snippet above to surface a
              focused note in the side panel. The notes here are the kind of
              marginalia I keep in my own reading copy of{" "}
              <em>
                Compilers: Principles, Techniques, and Tools
              </em>
              .
            </p>
            <blockquote className="border-l-2 border-primary/50 pl-5 py-1 text-[15px] text-foreground/80 italic">
              &ldquo;Optimize the IR, never the AST. The AST is a snapshot of
              intent; the IR is the contract you compile against.&rdquo;
            </blockquote>
            <h2 className="text-xl font-medium tracking-tight pt-4">
              Where this breaks down
            </h2>
            <p className="text-[15px] text-foreground/85 leading-relaxed">
              Tree-walking is wonderful for teaching and prototyping. The
              moment you introduce closures, exceptions, or first-class
              continuations, you will reach for a bytecode VM or a proper
              SSA-based IR. We will cover that in the next note.
            </p>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
            <BookOpen className="size-8 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">
              Full content coming soon.
            </p>
          </div>
        )}
      </section>
    </article>
  )
}

// ---------------------------------------------------------------------------
// Root component
// ---------------------------------------------------------------------------

export function DevLabSection() {
  const [view, setView] = useState<View>({ kind: "categories" })
  const [userPosts, setUserPosts] = useState<Record<string, Post[]>>({})

  const getCategory = (id: string): Category => {
    const base = CATEGORIES.find((c) => c.id === id)!
    const extra = userPosts[id] ?? []
    return { ...base, posts: [...extra, ...base.posts] }
  }

  const getPost = (categoryId: string, postId: string) =>
    getCategory(categoryId).posts.find((p) => p.id === postId)!

  const handleSave = (categoryId: string, draft: DraftPost) => {
    const newPost: Post = {
      id: `user-${Date.now()}`,
      title: draft.title,
      excerpt: draft.excerpt || "No excerpt provided.",
      date: new Date().toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
      readingTime: `${Math.max(1, Math.round(
        draft.blocks.reduce((acc, b) => {
          if (b.kind === "text") return acc + b.content.split(/\s+/).length
          if (b.kind === "code") return acc + b.code.split("\n").length * 2
          return acc + 20
        }, 0) / 200,
      ))} min`,
      tags: draft.tags,
      replies: 0,
      blocks: draft.blocks,
    }
    setUserPosts((prev) => ({
      ...prev,
      [categoryId]: [newPost, ...(prev[categoryId] ?? [])],
    }))
    setView({ kind: "posts", categoryId })
  }

  return (
    <div className="min-h-screen">
      {view.kind === "categories" && (
        <CategoryGrid onSelect={(id) => setView({ kind: "posts", categoryId: id })} />
      )}

      {view.kind === "posts" && (
        <PostList
          category={getCategory(view.categoryId)}
          onSelect={(postId) =>
            setView({ kind: "post", categoryId: view.categoryId, postId })
          }
          onBack={() => setView({ kind: "categories" })}
          onNewPost={() => setView({ kind: "editor", categoryId: view.categoryId })}
        />
      )}

      {view.kind === "post" && (
        <PostView
          category={getCategory(view.categoryId)}
          post={getPost(view.categoryId, view.postId)}
          onBack={() =>
            setView({ kind: "posts", categoryId: view.categoryId })
          }
        />
      )}

      {view.kind === "editor" && (
        <DevLabPostEditor
          categoryLabel={getCategory(view.categoryId).label}
          onSave={(draft) => handleSave(view.categoryId, draft)}
          onCancel={() => setView({ kind: "posts", categoryId: view.categoryId })}
        />
      )}
    </div>
  )
}
