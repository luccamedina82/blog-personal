import { useState, useRef } from "react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  X,
  Plus,
  Trash2,
  Code2,
  Quote,
  AlignLeft,
  GripVertical,
  ChevronDown,
  ChevronUp,
  Tag,
  Info,
} from "lucide-react"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DraftAnnotation {
  line: number
  title: string
  body: string
}

export type DraftBlock =
  | { id: string; kind: "text"; content: string }
  | {
      id: string
      kind: "code"
      filename: string
      language: string
      code: string
      annotations: DraftAnnotation[]
    }
  | { id: string; kind: "quote"; content: string; attribution: string }

export interface DraftPost {
  title: string
  excerpt: string
  tags: string[]
  blocks: DraftBlock[]
}

interface DevLabPostEditorProps {
  categoryLabel: string
  onSave: (draft: DraftPost) => void
  onCancel: () => void
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function uid() {
  return Math.random().toString(36).slice(2, 9)
}

// ---------------------------------------------------------------------------
// Block sub-editors
// ---------------------------------------------------------------------------

function TextBlockEditor({
  block,
  onChange,
  onRemove,
}: {
  block: Extract<DraftBlock, { kind: "text" }>
  onChange: (b: Extract<DraftBlock, { kind: "text" }>) => void
  onRemove: () => void
}) {
  return (
    <div className="group relative flex gap-2">
      <GripHandle />
      <div className="flex-1 rounded-md border border-border/60 bg-card/40 overflow-hidden">
        <div className="flex items-center justify-between px-3 py-2 border-b border-border/50 bg-background/30">
          <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            <AlignLeft className="size-3" />
            Text
          </span>
          <button
            type="button"
            onClick={onRemove}
            className="text-muted-foreground/50 hover:text-destructive transition-colors"
            aria-label="Remove block"
          >
            <Trash2 className="size-3.5" />
          </button>
        </div>
        <textarea
          value={block.content}
          onChange={(e) => onChange({ ...block, content: e.target.value })}
          placeholder="Write your paragraph here..."
          rows={4}
          className="w-full bg-transparent px-3 py-3 text-sm text-foreground/85 placeholder:text-muted-foreground/40 leading-relaxed resize-y outline-none font-sans"
        />
      </div>
    </div>
  )
}

function CodeBlockEditor({
  block,
  onChange,
  onRemove,
}: {
  block: Extract<DraftBlock, { kind: "code" }>
  onChange: (b: Extract<DraftBlock, { kind: "code" }>) => void
  onRemove: () => void
}) {
  const [newAnnotation, setNewAnnotation] = useState<DraftAnnotation>({
    line: 1,
    title: "",
    body: "",
  })
  const [showAnnotationForm, setShowAnnotationForm] = useState(false)

  const addAnnotation = () => {
    if (!newAnnotation.title.trim()) return
    onChange({
      ...block,
      annotations: [...block.annotations, { ...newAnnotation }],
    })
    setNewAnnotation({ line: 1, title: "", body: "" })
    setShowAnnotationForm(false)
  }

  const removeAnnotation = (idx: number) => {
    onChange({
      ...block,
      annotations: block.annotations.filter((_, i) => i !== idx),
    })
  }

  return (
    <div className="group relative flex gap-2">
      <GripHandle />
      <div className="flex-1 rounded-md border border-border/60 bg-card/40 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-border/50 bg-background/30">
          <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            <Code2 className="size-3" />
            Code
          </span>
          <button
            type="button"
            onClick={onRemove}
            className="text-muted-foreground/50 hover:text-destructive transition-colors"
            aria-label="Remove block"
          >
            <Trash2 className="size-3.5" />
          </button>
        </div>

        <div className="p-3 space-y-3">
          {/* Meta row */}
          <div className="flex gap-2">
            <input
              type="text"
              value={block.filename}
              onChange={(e) => onChange({ ...block, filename: e.target.value })}
              placeholder="filename.ts"
              className="flex-1 h-8 rounded-md border border-border/60 bg-background/40 px-2.5 text-xs font-mono text-foreground/80 placeholder:text-muted-foreground/40 outline-none focus:border-primary/40 transition-colors"
            />
            <input
              type="text"
              value={block.language}
              onChange={(e) => onChange({ ...block, language: e.target.value })}
              placeholder="ts"
              className="w-16 h-8 rounded-md border border-border/60 bg-background/40 px-2.5 text-xs font-mono text-muted-foreground placeholder:text-muted-foreground/40 outline-none focus:border-primary/40 transition-colors"
            />
          </div>

          {/* Code textarea */}
          <textarea
            value={block.code}
            onChange={(e) => onChange({ ...block, code: e.target.value })}
            placeholder={"// Paste your code here...\nconst hello = 'world'"}
            rows={8}
            spellCheck={false}
            className="w-full rounded-md border border-border/60 bg-[hsl(var(--background)/0.6)] px-3 py-2.5 text-[12.5px] font-mono text-foreground/85 placeholder:text-muted-foreground/30 leading-6 resize-y outline-none focus:border-primary/30 transition-colors"
          />

          {/* Annotations */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                <Info className="size-3" />
                Annotations ({block.annotations.length})
              </span>
              <button
                type="button"
                onClick={() => setShowAnnotationForm((v) => !v)}
                className="flex items-center gap-1 text-[10px] text-primary hover:text-primary/80 transition-colors"
              >
                <Plus className="size-3" />
                Add note
              </button>
            </div>

            {block.annotations.map((ann, idx) => (
              <div
                key={idx}
                className="flex items-start gap-2 rounded-md bg-secondary/30 border border-border/50 px-3 py-2"
              >
                <span className="font-mono text-[10px] text-muted-foreground/60 tabular-nums shrink-0 mt-0.5">
                  L{ann.line.toString().padStart(2, "0")}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-foreground truncate">
                    {ann.title}
                  </p>
                  <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2 mt-0.5">
                    {ann.body}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => removeAnnotation(idx)}
                  className="text-muted-foreground/40 hover:text-destructive transition-colors shrink-0"
                >
                  <X className="size-3" />
                </button>
              </div>
            ))}

            {showAnnotationForm && (
              <div className="rounded-md border border-primary/25 bg-card/50 p-3 space-y-2">
                <p className="text-[10px] uppercase tracking-[0.18em] text-primary">
                  New annotation
                </p>
                <div className="flex gap-2">
                  <div className="flex flex-col gap-1 w-16">
                    <label className="text-[10px] text-muted-foreground">
                      Line
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={newAnnotation.line}
                      onChange={(e) =>
                        setNewAnnotation((p) => ({
                          ...p,
                          line: Number(e.target.value),
                        }))
                      }
                      className="h-8 rounded-md border border-border/60 bg-background/40 px-2 text-xs font-mono text-foreground/80 outline-none focus:border-primary/40 transition-colors text-center"
                    />
                  </div>
                  <div className="flex flex-col gap-1 flex-1">
                    <label className="text-[10px] text-muted-foreground">
                      Title
                    </label>
                    <input
                      type="text"
                      value={newAnnotation.title}
                      onChange={(e) =>
                        setNewAnnotation((p) => ({
                          ...p,
                          title: e.target.value,
                        }))
                      }
                      placeholder="Short title for this note"
                      className="h-8 rounded-md border border-border/60 bg-background/40 px-2.5 text-xs text-foreground/80 placeholder:text-muted-foreground/40 outline-none focus:border-primary/40 transition-colors"
                    />
                  </div>
                </div>
                <textarea
                  value={newAnnotation.body}
                  onChange={(e) =>
                    setNewAnnotation((p) => ({ ...p, body: e.target.value }))
                  }
                  placeholder="Explain why this line is interesting..."
                  rows={3}
                  className="w-full rounded-md border border-border/60 bg-background/40 px-2.5 py-2 text-xs text-foreground/80 placeholder:text-muted-foreground/40 leading-relaxed outline-none focus:border-primary/40 transition-colors resize-none"
                />
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAnnotationForm(false)}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={addAnnotation}
                    className="text-xs text-primary hover:text-primary/80 transition-colors font-medium"
                  >
                    Add annotation
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function QuoteBlockEditor({
  block,
  onChange,
  onRemove,
}: {
  block: Extract<DraftBlock, { kind: "quote" }>
  onChange: (b: Extract<DraftBlock, { kind: "quote" }>) => void
  onRemove: () => void
}) {
  return (
    <div className="group relative flex gap-2">
      <GripHandle />
      <div className="flex-1 rounded-md border border-border/60 bg-card/40 overflow-hidden">
        <div className="flex items-center justify-between px-3 py-2 border-b border-border/50 bg-background/30">
          <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            <Quote className="size-3" />
            Quote
          </span>
          <button
            type="button"
            onClick={onRemove}
            className="text-muted-foreground/50 hover:text-destructive transition-colors"
            aria-label="Remove block"
          >
            <Trash2 className="size-3.5" />
          </button>
        </div>
        <div className="p-3 space-y-2">
          <textarea
            value={block.content}
            onChange={(e) => onChange({ ...block, content: e.target.value })}
            placeholder='"The real problem is that programmers have spent far too much time worrying about efficiency in the wrong places..."'
            rows={3}
            className="w-full bg-transparent px-3 py-2 text-[14px] text-foreground/80 placeholder:text-muted-foreground/40 leading-relaxed resize-none outline-none italic font-sans border border-border/50 rounded-md border-l-2 border-l-primary/40"
          />
          <input
            type="text"
            value={block.attribution}
            onChange={(e) => onChange({ ...block, attribution: e.target.value })}
            placeholder="— Donald Knuth"
            className="w-full h-8 rounded-md border border-border/60 bg-background/40 px-2.5 text-xs text-muted-foreground placeholder:text-muted-foreground/40 outline-none focus:border-primary/40 transition-colors"
          />
        </div>
      </div>
    </div>
  )
}

function GripHandle() {
  return (
    <div className="flex items-start pt-3 opacity-30 hover:opacity-60 transition-opacity cursor-grab">
      <GripVertical className="size-3.5 text-muted-foreground" />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Tag input
// ---------------------------------------------------------------------------

function TagInput({
  tags,
  onChange,
}: {
  tags: string[]
  onChange: (t: string[]) => void
}) {
  const [input, setInput] = useState("")
  const ref = useRef<HTMLInputElement>(null)

  const commit = () => {
    const val = input.trim().replace(/^#/, "")
    if (!val || tags.includes(val)) {
      setInput("")
      return
    }
    onChange([...tags, val])
    setInput("")
  }

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault()
      commit()
    }
    if (e.key === "Backspace" && !input && tags.length > 0) {
      onChange(tags.slice(0, -1))
    }
  }

  return (
    <div
      className="flex flex-wrap gap-1.5 items-center min-h-9 w-full rounded-md border border-border/60 bg-background/40 px-2.5 py-1.5 cursor-text"
      onClick={() => ref.current?.focus()}
    >
      <Tag className="size-3 text-muted-foreground/50 shrink-0" />
      {tags.map((t) => (
        <Badge
          key={t}
          variant="secondary"
          className="rounded-sm text-[10px] font-mono font-normal bg-secondary/50 border border-border/60 h-5 px-1.5 flex items-center gap-1"
        >
          {t}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onChange(tags.filter((x) => x !== t))
            }}
            className="text-muted-foreground/60 hover:text-foreground transition-colors"
          >
            <X className="size-2.5" />
          </button>
        </Badge>
      ))}
      <input
        ref={ref}
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKey}
        onBlur={commit}
        placeholder={tags.length === 0 ? "Add tags (Enter to confirm)..." : ""}
        className="flex-1 min-w-[120px] h-5 bg-transparent text-xs text-foreground/80 placeholder:text-muted-foreground/40 outline-none"
      />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Add block toolbar
// ---------------------------------------------------------------------------

function AddBlockToolbar({ onAdd }: { onAdd: (kind: DraftBlock["kind"]) => void }) {
  return (
    <div className="flex items-center gap-2 pt-1">
      <span className="text-[10px] text-muted-foreground/50 uppercase tracking-[0.18em]">
        Add block
      </span>
      <div className="flex gap-1.5">
        {[
          { kind: "text" as const, icon: AlignLeft, label: "Text" },
          { kind: "code" as const, icon: Code2, label: "Code" },
          { kind: "quote" as const, icon: Quote, label: "Quote" },
        ].map(({ kind, icon: Icon, label }) => (
          <button
            key={kind}
            type="button"
            onClick={() => onAdd(kind)}
            className="flex items-center gap-1.5 rounded-md border border-border/60 bg-card/40 hover:bg-card/80 hover:border-primary/30 px-2.5 py-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-all"
          >
            <Icon className="size-3" />
            {label}
          </button>
        ))}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main editor
// ---------------------------------------------------------------------------

export function DevLabPostEditor({
  categoryLabel,
  onSave,
  onCancel,
}: DevLabPostEditorProps) {
  const [title, setTitle] = useState("")
  const [excerpt, setExcerpt] = useState("")
  const [tags, setTags] = useState<string[]>([])
  const [blocks, setBlocks] = useState<DraftBlock[]>([
    { id: uid(), kind: "text", content: "" },
  ])
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())

  const addBlock = (kind: DraftBlock["kind"]) => {
    const id = uid()
    let block: DraftBlock
    if (kind === "text") block = { id, kind: "text", content: "" }
    else if (kind === "code")
      block = {
        id,
        kind: "code",
        filename: "",
        language: "ts",
        code: "",
        annotations: [],
      }
    else block = { id, kind: "quote", content: "", attribution: "" }
    setBlocks((prev) => [...prev, block])
  }

  const updateBlock = (id: string, updated: DraftBlock) => {
    setBlocks((prev) => prev.map((b) => (b.id === id ? updated : b)))
  }

  const removeBlock = (id: string) => {
    setBlocks((prev) => prev.filter((b) => b.id !== id))
  }

  const toggleCollapse = (id: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const canSave = title.trim().length > 0

  const handleSave = () => {
    if (!canSave) return
    onSave({ title, excerpt, tags, blocks })
  }

  return (
    <div className="flex flex-col h-full">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 lg:px-14 py-4 border-b border-border/60 bg-background/60 sticky top-0 z-10">
        <div>
          <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
            New post in {categoryLabel}
          </p>
          <p className="text-sm font-medium text-foreground mt-0.5">
            {title.trim() || "Untitled"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="flex items-center gap-1.5 h-8 px-3 rounded-md text-xs text-muted-foreground hover:text-foreground border border-border/60 hover:border-border transition-colors"
          >
            Cancel
          </button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={!canSave}
            size="sm"
            className="h-8 text-xs"
          >
            Publish post
          </Button>
        </div>
      </div>

      {/* Scrollable editor body */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-6 lg:px-14 py-10 max-w-4xl space-y-8">

          {/* Post meta */}
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Give your note a clear, specific title"
                className="w-full h-11 rounded-md border border-border/60 bg-background/40 px-3 text-sm text-foreground placeholder:text-muted-foreground/40 outline-none focus:border-primary/40 transition-colors"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                Excerpt
              </label>
              <textarea
                value={excerpt}
                onChange={(e) => setExcerpt(e.target.value)}
                placeholder="One or two sentences that describe the core idea. Appears in the post list."
                rows={2}
                className="w-full rounded-md border border-border/60 bg-background/40 px-3 py-2.5 text-sm text-foreground/85 placeholder:text-muted-foreground/40 leading-relaxed resize-none outline-none focus:border-primary/40 transition-colors"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                Tags
              </label>
              <TagInput tags={tags} onChange={setTags} />
            </div>
          </div>

          <div className="border-t border-border/40" />

          {/* Content blocks */}
          <div className="space-y-3">
            <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              Content
            </p>

            {blocks.length === 0 && (
              <p className="text-xs text-muted-foreground/50 py-6 text-center">
                No blocks yet. Use the toolbar below to add content.
              </p>
            )}

            {blocks.map((block) => {
              const isCollapsed = collapsed.has(block.id)
              return (
                <div key={block.id} className="relative">
                  {block.kind === "code" && (
                    <button
                      type="button"
                      onClick={() => toggleCollapse(block.id)}
                      className="absolute right-0 -top-0.5 z-10 flex items-center gap-1 text-[10px] text-muted-foreground/50 hover:text-muted-foreground transition-colors pr-1"
                    >
                      {isCollapsed ? (
                        <ChevronDown className="size-3" />
                      ) : (
                        <ChevronUp className="size-3" />
                      )}
                      {isCollapsed ? "Expand" : "Collapse"}
                    </button>
                  )}
                  <div className={cn(isCollapsed && "opacity-60")}>
                    {!isCollapsed &&
                      (block.kind === "text" ? (
                        <TextBlockEditor
                          block={block}
                          onChange={(b) => updateBlock(block.id, b)}
                          onRemove={() => removeBlock(block.id)}
                        />
                      ) : block.kind === "code" ? (
                        <CodeBlockEditor
                          block={block}
                          onChange={(b) => updateBlock(block.id, b)}
                          onRemove={() => removeBlock(block.id)}
                        />
                      ) : (
                        <QuoteBlockEditor
                          block={block}
                          onChange={(b) => updateBlock(block.id, b)}
                          onRemove={() => removeBlock(block.id)}
                        />
                      ))}
                    {isCollapsed && (
                      <div className="flex gap-2">
                        <div className="w-4" />
                        <div className="flex-1 rounded-md border border-border/50 bg-card/30 px-3 py-2 flex items-center gap-2">
                          <Code2 className="size-3.5 text-muted-foreground/50" />
                          <span className="text-xs text-muted-foreground truncate font-mono">
                            {(block as Extract<DraftBlock, { kind: "code" }>).filename ||
                              "code block"}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}

            <AddBlockToolbar onAdd={addBlock} />
          </div>
        </div>
      </div>
    </div>
  )
}
