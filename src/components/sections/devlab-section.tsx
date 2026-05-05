import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { InteractiveCodeBlock } from '@/components/interactive-code-block'
import { DevLabPostEditor } from '@/components/devlab-post-editor'
import { CategoryForm } from '@/components/devlab/category-form'
import { getDevLabIcon } from '@/components/devlab/icon-map'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import {
  ArrowLeft, Clock, CalendarDays, ChevronRight, BookOpen,
  Plus, Pencil, Trash2, Loader2,
} from 'lucide-react'
import {
  listDevLabCategories, createDevLabCategory, updateDevLabCategory, deleteDevLabCategory,
  listDevLabPosts, createDevLabPost, updateDevLabPost, deleteDevLabPost,
} from '@/lib/devlab/queries'
import type { DevLabCategory, DevLabPost, DevLabBlock, PostDraft } from '@/lib/devlab/types'

// ── View state ────────────────────────────────────────────────────────────────

type View =
  | { kind: 'categories' }
  | { kind: 'posts'; categoryId: string }
  | { kind: 'post'; categoryId: string; postId: string }
  | { kind: 'editor'; categoryId: string; editPost?: DevLabPost }

// ── Signed image (resolves storage path → URL on mount) ───────────────────────

function SignedImage({ path, alt }: { path: string; alt: string }) {
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    supabase.storage.from('media').createSignedUrl(path, 3600)
      .then(({ data }) => setUrl(data?.signedUrl ?? null))
  }, [path])
  if (!url) return <div className="h-40 rounded-lg bg-secondary/30 animate-pulse" />
  return <img src={url} alt={alt} className="rounded-lg max-w-full" />
}

// ── Category grid ─────────────────────────────────────────────────────────────

function CategoryGrid({
  categories,
  postCounts,
  onSelect,
  onEdit,
  onDelete,
  onNew,
}: {
  categories: DevLabCategory[]
  postCounts: Record<string, number>
  onSelect: (id: string) => void
  onEdit: (cat: DevLabCategory) => void
  onDelete: (cat: DevLabCategory) => void
  onNew: () => void
}) {
  return (
    <div className="px-6 lg:px-14 py-10 lg:py-16 max-w-5xl">
      <div className="mb-10 flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-2">Dev Lab</p>
          <h1 className="text-2xl font-semibold tracking-tight">Technical Notes</h1>
          <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
            A structured collection of notes on computer science fundamentals — compilers, networks,
            systems, and the stuff that matters at the bottom of the stack.
          </p>
        </div>
        <Button size="sm" className="gap-1.5 shrink-0" onClick={onNew}>
          <Plus className="size-3.5" />
          New category
        </Button>
      </div>

      {categories.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
          <p className="text-sm text-muted-foreground">No categories yet.</p>
          <Button size="sm" variant="outline" onClick={onNew}>Create your first category</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {categories.map((cat) => {
            const Icon = getDevLabIcon(cat.icon)
            const total = postCounts[cat.id] ?? 0
            return (
              <div
                key={cat.id}
                className={cn(
                  'group relative flex flex-col items-start gap-3 rounded-lg border border-border/70',
                  'bg-card/40 hover:bg-card/80 p-5 transition-all duration-200',
                  'hover:border-primary/30 hover:shadow-[0_0_0_1px_hsl(var(--primary)/0.15)]',
                )}
              >
                <button type="button" onClick={() => onSelect(cat.id)} className="absolute inset-0 rounded-lg" aria-label={cat.label} />
                <div className="flex w-full items-start justify-between relative z-10 pointer-events-none">
                  <span className="flex size-9 items-center justify-center rounded-md bg-secondary/60 border border-border/60">
                    <Icon className="size-4 text-primary" />
                  </span>
                  <ChevronRight className="size-4 text-muted-foreground/40 group-hover:text-primary transition-colors mt-1" />
                </div>
                <div className="relative z-10 pointer-events-none">
                  <p className="text-sm font-medium text-foreground">{cat.label}</p>
                  <p className="mt-1 text-xs text-muted-foreground leading-relaxed line-clamp-2">{cat.description}</p>
                </div>
                <div className="w-full flex items-center justify-between relative z-10">
                  <p className="text-[10px] text-muted-foreground/60 tabular-nums pointer-events-none">
                    {total} {total === 1 ? 'note' : 'notes'}
                  </p>
                  <div
                    className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button type="button" onClick={() => onEdit(cat)}
                      className="flex items-center justify-center size-6 rounded text-muted-foreground/50 hover:text-foreground hover:bg-secondary transition-colors">
                      <Pencil className="size-3" />
                    </button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <button type="button"
                          className="flex items-center justify-center size-6 rounded text-muted-foreground/50 hover:text-destructive hover:bg-secondary transition-colors">
                          <Trash2 className="size-3" />
                        </button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete "{cat.label}"?</AlertDialogTitle>
                          <AlertDialogDescription>
                            All posts in this category will become uncategorized. Cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => onDelete(cat)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Post list ─────────────────────────────────────────────────────────────────

function PostList({
  category,
  posts,
  loading,
  onSelect,
  onEdit,
  onDelete,
  onBack,
  onNewPost,
}: {
  category: DevLabCategory
  posts: DevLabPost[]
  loading: boolean
  onSelect: (postId: string) => void
  onEdit: (post: DevLabPost) => void
  onDelete: (post: DevLabPost) => void
  onBack: () => void
  onNewPost: () => void
}) {
  const Icon = getDevLabIcon(category.icon)
  return (
    <div className="px-6 lg:px-14 py-10 lg:py-16 max-w-3xl">
      <button type="button" onClick={onBack}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mb-8">
        <ArrowLeft className="size-3.5" />
        All categories
      </button>

      <div className="flex items-start justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-md bg-secondary/60 border border-border/60">
            <Icon className="size-5 text-primary" />
          </span>
          <div>
            <h2 className="text-xl font-semibold tracking-tight">{category.label}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">{category.description}</p>
          </div>
        </div>
        <button type="button" onClick={onNewPost}
          className="flex items-center gap-1.5 shrink-0 h-8 px-3 rounded-md border border-border/60 bg-card/40 hover:bg-card/80 hover:border-primary/30 text-xs text-muted-foreground hover:text-foreground transition-all">
          <Plus className="size-3.5" />
          New post
        </button>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Loading posts…
        </div>
      ) : posts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
          <p className="text-sm text-muted-foreground">No posts yet.</p>
          <Button size="sm" variant="outline" onClick={onNewPost}>Write the first post</Button>
        </div>
      ) : (
        <ul className="divide-y divide-border/50">
          {posts.map((post) => (
            <li key={post.id} className="group relative">
              <button type="button" onClick={() => onSelect(post.id)}
                className="w-full flex flex-col sm:flex-row sm:items-start gap-3 py-5 text-left hover:bg-secondary/20 -mx-3 px-3 rounded-md transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1.5">
                    {post.pinned && <span className="text-[9px] uppercase tracking-[0.18em] text-primary font-medium">Pinned</span>}
                    {post.tags.slice(0, 2).map((t) => (
                      <Badge key={t} variant="secondary" className="rounded-sm text-[9px] font-mono font-normal bg-secondary/40 border border-border/50 h-4 px-1.5">{t}</Badge>
                    ))}
                  </div>
                  <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors leading-snug">{post.title}</p>
                  {post.excerpt && <p className="mt-1 text-xs text-muted-foreground leading-relaxed line-clamp-2">{post.excerpt}</p>}
                  <div className="mt-2.5 flex items-center gap-3 text-[11px] text-muted-foreground/70">
                    <span className="flex items-center gap-1">
                      <CalendarDays className="size-3" />
                      {new Date(post.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                    {post.reading_time && (
                      <span className="flex items-center gap-1">
                        <Clock className="size-3" />
                        {post.reading_time}
                      </span>
                    )}
                  </div>
                </div>
                <ChevronRight className="size-4 text-muted-foreground/30 group-hover:text-primary transition-colors shrink-0 mt-0.5 sm:mt-1" />
              </button>
              <div
                className="absolute top-4 right-8 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => e.stopPropagation()}
              >
                <button type="button" onClick={() => onEdit(post)}
                  className="flex items-center justify-center size-6 rounded text-muted-foreground/50 hover:text-foreground hover:bg-secondary transition-colors">
                  <Pencil className="size-3" />
                </button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <button type="button"
                      className="flex items-center justify-center size-6 rounded text-muted-foreground/50 hover:text-destructive hover:bg-secondary transition-colors">
                      <Trash2 className="size-3" />
                    </button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete "{post.title}"?</AlertDialogTitle>
                      <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => onDelete(post)}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// ── Post view ─────────────────────────────────────────────────────────────────

function PostView({
  category,
  post,
  onBack,
  onEdit,
  onDelete,
}: {
  category: DevLabCategory
  post: DevLabPost
  onBack: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  return (
    <div className="flex flex-col min-h-full">
      {/* Sticky nav bar */}
      <div className="sticky top-0 z-10 flex items-center justify-between px-6 lg:px-10 py-3 border-b border-border/50 bg-background/80 backdrop-blur-md">
        <button type="button" onClick={onBack}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="size-3.5" />
          {category.label}
        </button>
        <div className="flex items-center gap-1">
          <button type="button" onClick={onEdit}
            className="flex items-center gap-1.5 h-7 px-2.5 rounded-md text-xs text-muted-foreground hover:text-foreground border border-border/60 hover:border-border transition-colors">
            <Pencil className="size-3" />
            Edit
          </button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button type="button"
                className="flex items-center gap-1.5 h-7 px-2.5 rounded-md text-xs text-muted-foreground hover:text-destructive border border-border/60 hover:border-destructive/40 transition-colors">
                <Trash2 className="size-3" />
                Delete
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete "{post.title}"?</AlertDialogTitle>
                <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={onDelete}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <article className="flex-1 px-6 lg:px-10 py-10 lg:py-14">
        <header className="mb-10 max-w-2xl">
          <div className="flex items-center gap-3 text-[11px] text-muted-foreground mb-5">
            <span className="text-primary uppercase tracking-[0.18em] font-medium">{category.label}</span>
            <span className="size-0.5 rounded-full bg-muted-foreground/40" />
            <span className="flex items-center gap-1">
              <CalendarDays className="size-3" />
              {new Date(post.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
            {post.reading_time && (
              <>
                <span className="size-0.5 rounded-full bg-muted-foreground/40" />
                <span className="flex items-center gap-1">
                  <Clock className="size-3" />
                  {post.reading_time} read
                </span>
              </>
            )}
          </div>
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-balance leading-tight">{post.title}</h1>
          {post.excerpt && (
            <p className="mt-4 text-base text-muted-foreground leading-relaxed text-pretty">{post.excerpt}</p>
          )}
          {post.tags.length > 0 && (
            <div className="mt-5 flex flex-wrap gap-1.5">
              {post.tags.map((t) => (
                <Badge key={t} variant="secondary" className="rounded-md text-[10px] font-mono font-normal bg-secondary/50 border border-border/60">{t}</Badge>
              ))}
            </div>
          )}
        </header>

        <div className="h-px bg-border/40 mb-10 max-w-2xl" />

        <section className="space-y-8">
          {post.blocks.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-4 py-20 text-center max-w-2xl">
              <BookOpen className="size-8 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">No content yet.</p>
            </div>
          ) : (
            post.blocks.map((block) => <BlockRenderer key={block.id} block={block} />)
          )}
        </section>
      </article>
    </div>
  )
}

function BlockRenderer({ block }: { block: DevLabBlock }) {
  if (block.kind === 'text') {
    return (
      <div
        className="tiptap-render max-w-2xl"
        dangerouslySetInnerHTML={{ __html: block.html }}
      />
    )
  }
  if (block.kind === 'code') {
    return (
      <div className="max-w-5xl">
        <InteractiveCodeBlock
          language={block.language}
          filename={block.filename || undefined}
          code={block.code}
          annotations={block.annotations}
        />
      </div>
    )
  }
  if (block.kind === 'quote') {
    return (
      <blockquote className="max-w-2xl border-l-2 border-primary/50 pl-5 py-1 text-[15px] text-foreground/80 italic">
        &ldquo;{block.content}&rdquo;
        {block.attribution && (
          <footer className="mt-1 text-xs text-muted-foreground not-italic">{block.attribution}</footer>
        )}
      </blockquote>
    )
  }
  if (block.kind === 'image') {
    return (
      <div className="max-w-3xl">
        <SignedImage path={block.storage_path} alt={block.alt} />
      </div>
    )
  }
  return null
}

// ── Root component ────────────────────────────────────────────────────────────

export function DevLabSection() {
  const [view, setView] = useState<View>({ kind: 'categories' })
  const [categories, setCategories] = useState<DevLabCategory[]>([])
  const [posts, setPosts] = useState<DevLabPost[]>([])
  const [postCounts, setPostCounts] = useState<Record<string, number>>({})
  const [loadingCats, setLoadingCats] = useState(true)
  const [loadingPosts, setLoadingPosts] = useState(false)
  const [catFormOpen, setCatFormOpen] = useState(false)
  const [editingCat, setEditingCat] = useState<DevLabCategory | null>(null)

  // Load categories on mount
  useEffect(() => {
    listDevLabCategories()
      .then(async (cats) => {
        setCategories(cats)
        // Load post counts in parallel
        const counts = await Promise.all(
          cats.map((c) => listDevLabPosts(c.id).then((p) => ({ id: c.id, count: p.length }))),
        )
        setPostCounts(Object.fromEntries(counts.map(({ id, count }) => [id, count])))
      })
      .catch(() => toast.error('Failed to load categories'))
      .finally(() => setLoadingCats(false))
  }, [])

  // Load posts when entering a category
  useEffect(() => {
    if (view.kind !== 'posts') return
    setLoadingPosts(true)
    listDevLabPosts(view.categoryId)
      .then(setPosts)
      .catch(() => toast.error('Failed to load posts'))
      .finally(() => setLoadingPosts(false))
  }, [view.kind === 'posts' ? view.categoryId : null])

  // ── Category CRUD ──────────────────────────────────────────────────────────

  async function handleCreateCategory(payload: Parameters<typeof createDevLabCategory>[0]) {
    try {
      const cat = await createDevLabCategory(payload)
      setCategories((prev) => [...prev, cat])
      setPostCounts((prev) => ({ ...prev, [cat.id]: 0 }))
      toast.success('Category created')
    } catch {
      toast.error('Failed to create category')
      throw new Error('create failed')
    }
  }

  async function handleUpdateCategory(payload: Parameters<typeof updateDevLabCategory>[1]) {
    if (!editingCat) return
    try {
      await updateDevLabCategory(editingCat.id, payload)
      setCategories((prev) => prev.map((c) => (c.id === editingCat.id ? { ...c, ...payload } : c)))
      setEditingCat(null)
      toast.success('Category updated')
    } catch {
      toast.error('Failed to update category')
      throw new Error('update failed')
    }
  }

  async function handleDeleteCategory(cat: DevLabCategory) {
    try {
      await deleteDevLabCategory(cat.id)
      setCategories((prev) => prev.filter((c) => c.id !== cat.id))
      toast.success('Category deleted')
    } catch {
      toast.error('Failed to delete category')
    }
  }

  // ── Post CRUD ──────────────────────────────────────────────────────────────

  function computeReadingTime(blocks: DevLabBlock[]): string {
    const words = blocks.reduce((acc, b) => {
      if (b.kind === 'text') return acc + b.html.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length
      if (b.kind === 'code') return acc + b.code.split('\n').length * 2
      return acc + 20
    }, 0)
    return `${Math.max(1, Math.round(words / 200))} min`
  }

  async function handleSavePost(draft: PostDraft) {
    const categoryId = view.kind === 'editor' ? view.categoryId : null
    const payload = {
      category_id: draft.category_id,
      title: draft.title,
      excerpt: draft.excerpt || null,
      blocks: draft.blocks,
      tags: draft.tags,
      pinned: false,
      reading_time: computeReadingTime(draft.blocks),
    }

    if (view.kind === 'editor' && view.editPost) {
      // Update
      await updateDevLabPost(view.editPost.id, payload)
      setPosts((prev) => prev.map((p) => p.id === view.editPost!.id ? { ...p, ...payload } : p))
      toast.success('Post updated')
      setView({ kind: 'posts', categoryId: categoryId! })
    } else {
      // Create
      const post = await createDevLabPost(payload)
      setPosts((prev) => [post, ...prev])
      setPostCounts((prev) => ({ ...prev, [categoryId!]: (prev[categoryId!] ?? 0) + 1 }))
      toast.success('Post published')
      setView({ kind: 'posts', categoryId: categoryId! })
    }
  }

  async function handleDeletePost(post: DevLabPost) {
    try {
      await deleteDevLabPost(post.id)
      setPosts((prev) => prev.filter((p) => p.id !== post.id))
      const catId = view.kind === 'post' ? view.categoryId : (view.kind === 'posts' ? view.categoryId : null)
      if (catId) setPostCounts((prev) => ({ ...prev, [catId]: Math.max(0, (prev[catId] ?? 1) - 1) }))
      toast.success('Post deleted')
      if (view.kind === 'post') setView({ kind: 'posts', categoryId: view.categoryId })
    } catch {
      toast.error('Failed to delete post')
    }
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  function getCat(id: string) {
    return categories.find((c) => c.id === id)
  }

  function getPost(id: string) {
    return posts.find((p) => p.id === id)
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  const catForView = view.kind === 'posts' || view.kind === 'post' || view.kind === 'editor'
    ? getCat(view.categoryId)
    : undefined
  const postForView = view.kind === 'post' ? getPost(view.postId) : undefined

  return (
    <div className="min-h-screen">
      {loadingCats && (
        <div className="flex items-center gap-2 px-6 py-16 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Loading…
        </div>
      )}

      {!loadingCats && view.kind === 'categories' && (
        <CategoryGrid
          categories={categories}
          postCounts={postCounts}
          onSelect={(id) => setView({ kind: 'posts', categoryId: id })}
          onEdit={(cat) => { setEditingCat(cat); setCatFormOpen(true) }}
          onDelete={handleDeleteCategory}
          onNew={() => { setEditingCat(null); setCatFormOpen(true) }}
        />
      )}

      {!loadingCats && view.kind === 'posts' && catForView && (
        <PostList
          category={catForView}
          posts={posts}
          loading={loadingPosts}
          onSelect={(postId) => setView({ kind: 'post', categoryId: view.categoryId, postId })}
          onEdit={(post) => setView({ kind: 'editor', categoryId: view.categoryId, editPost: post })}
          onDelete={handleDeletePost}
          onBack={() => setView({ kind: 'categories' })}
          onNewPost={() => setView({ kind: 'editor', categoryId: view.categoryId })}
        />
      )}

      {!loadingCats && view.kind === 'post' && catForView && postForView && (
        <PostView
          category={catForView}
          post={postForView}
          onBack={() => setView({ kind: 'posts', categoryId: view.categoryId })}
          onEdit={() => setView({ kind: 'editor', categoryId: view.categoryId, editPost: postForView })}
          onDelete={() => handleDeletePost(postForView)}
        />
      )}

      {!loadingCats && view.kind === 'editor' && catForView && (
        <DevLabPostEditor
          categoryLabel={catForView.label}
          categoryId={view.categoryId}
          initial={view.editPost}
          onSave={handleSavePost}
          onCancel={() => setView({ kind: 'posts', categoryId: view.categoryId })}
        />
      )}

      {/* Always mounted — never remounts when view changes, Dialog opens reliably */}
      <CategoryForm
        open={catFormOpen}
        onOpenChange={(v) => { setCatFormOpen(v); if (!v) setEditingCat(null) }}
        initial={editingCat}
        onSubmit={editingCat ? handleUpdateCategory : handleCreateCategory}
      />
    </div>
  )
}
