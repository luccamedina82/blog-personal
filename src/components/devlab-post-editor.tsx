import { useState, useRef, useEffect } from 'react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { TiptapEditor } from '@/components/devlab/tiptap-editor'
import { supabase } from '@/lib/supabase'
import {
  X, Plus, Trash2, Code2, Quote, AlignLeft, Image,
  GripVertical, ChevronDown, ChevronUp, Tag, Info,
  ArrowUp, ArrowDown, Loader2,
} from 'lucide-react'
import type { DevLabBlock, CodeAnnotation, DevLabPost, PostDraft, DevLabAnnotation } from '@/lib/devlab/types'
import {
  listAnnotations,
  updateAnnotationStatus,
} from '@/lib/devlab/annotations-queries'
import { ReviewButton } from '@/components/devlab/annotations/review-button'
import { AnnotationPopover } from '@/components/devlab/annotations/annotation-popover'
import { cn } from '@/lib/utils'

// Re-export types consumed by devlab-section
export type { DevLabBlock, PostDraft }
export type { CodeAnnotation as DraftAnnotation }

function uid() {
  return Math.random().toString(36).slice(2, 9)
}

// ── Text block ───────────────────────────────────────────────────────────────

function TextBlockEditor({
  block,
  onChange,
  onRemove,
  onMove,
  isFirst,
  isLast,
  annotations,
  onAnnotationClick,
}: {
  block: Extract<DevLabBlock, { kind: 'text' }>
  onChange: (b: Extract<DevLabBlock, { kind: 'text' }>) => void
  onRemove: () => void
  onMove: (dir: 'up' | 'down') => void
  isFirst: boolean
  isLast: boolean
  annotations?: DevLabAnnotation[]
  onAnnotationClick?: (id: string, rect: { top: number; left: number }) => void
}) {
  return (
    <div className="group relative flex gap-2">
      <MoveHandle onMove={onMove} isFirst={isFirst} isLast={isLast} />
      <div className="flex-1 rounded-md border border-border/60 bg-card/40 overflow-hidden">
        <BlockHeader icon={<AlignLeft className="size-3" />} label="Text" onRemove={onRemove} />
        <TiptapEditor
          value={block.html}
          onChange={(html) => onChange({ ...block, html })}
          placeholder="Write your paragraph here…"
          annotations={annotations}
          onAnnotationClick={onAnnotationClick}
        />
      </div>
    </div>
  )
}

// ── Code block ───────────────────────────────────────────────────────────────

function CodeBlockEditor({
  block,
  onChange,
  onRemove,
  onMove,
  isFirst,
  isLast,
}: {
  block: Extract<DevLabBlock, { kind: 'code' }>
  onChange: (b: Extract<DevLabBlock, { kind: 'code' }>) => void
  onRemove: () => void
  onMove: (dir: 'up' | 'down') => void
  isFirst: boolean
  isLast: boolean
}) {
  const MAX_LINES = 20

  const [newAnn, setNewAnn] = useState<CodeAnnotation>({ line: 1, title: '', body: '' })
  const [showAnnForm, setShowAnnForm] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const [visibleLines, setVisibleLines] = useState(MAX_LINES)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const lineNumRef = useRef<HTMLDivElement>(null)

  const lineCount = (block.code || '').split('\n').length
  const displayLines = Math.min(visibleLines, lineCount)

  function handleScroll() {
    if (lineNumRef.current && textareaRef.current) {
      lineNumRef.current.style.transform = `translateY(-${textareaRef.current.scrollTop}px)`
    }
  }

  function handleTabKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key !== 'Tab') return
    e.preventDefault()
    const ta = e.currentTarget
    const start = ta.selectionStart
    const end = ta.selectionEnd
    const next = ta.value.substring(0, start) + '  ' + ta.value.substring(end)
    onChange({ ...block, code: next })
    requestAnimationFrame(() => {
      if (textareaRef.current) {
        textareaRef.current.selectionStart = textareaRef.current.selectionEnd = start + 2
      }
    })
  }

  function addAnnotation() {
    if (!newAnn.title.trim()) return
    onChange({ ...block, annotations: [...block.annotations, { ...newAnn }] })
    setNewAnn({ line: 1, title: '', body: '' })
    setShowAnnForm(false)
  }

  return (
    <div className="group relative flex gap-2">
      <MoveHandle onMove={onMove} isFirst={isFirst} isLast={isLast} />
      <div className="flex-1 rounded-md border border-border/60 bg-card/40 overflow-hidden">
        <div className="flex items-center justify-between px-3 py-2 border-b border-border/50 bg-background/30">
          <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            <Code2 className="size-3" />
            Code
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCollapsed((v) => !v)}
              className="flex items-center gap-1 text-[10px] text-muted-foreground/50 hover:text-muted-foreground transition-colors"
            >
              {collapsed ? <ChevronDown className="size-3" /> : <ChevronUp className="size-3" />}
              {collapsed ? 'Expand' : 'Collapse'}
            </button>
            <button type="button" onClick={onRemove} className="text-muted-foreground/50 hover:text-destructive transition-colors">
              <Trash2 className="size-3.5" />
            </button>
          </div>
        </div>

        {!collapsed && (
          <div className="p-3 space-y-3">
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
            <div className="space-y-1">
              <div
                className="relative rounded-md border border-border/60 bg-background/60 focus-within:border-primary/30 transition-colors"
              >
                <div className="absolute inset-y-0 left-0 w-11 overflow-hidden bg-secondary/30 border-r border-border/60 rounded-l-md select-none z-10">
                  <div ref={lineNumRef} className="py-2.5">
                    {(block.code || '').split('\n').map((_, i) => {
                      const lineNum = i + 1
                      const hasNote = block.annotations.some((a) => a.line === lineNum)
                      return (
                        <button
                          key={i}
                          type="button"
                          title={`Add note at line ${lineNum}`}
                          onClick={() => {
                            setNewAnn((p) => ({ ...p, line: lineNum }))
                            setShowAnnForm(true)
                          }}
                          className={cn(
                            'w-full pr-2 text-right text-[12.5px] font-mono leading-6 tabular-nums transition-colors',
                            hasNote
                              ? 'text-primary/70 hover:text-primary'
                              : 'text-muted-foreground/40 hover:text-primary/70',
                          )}
                        >
                          {lineNum}
                        </button>
                      )
                    })}
                  </div>
                </div>
                <textarea
                  ref={textareaRef}
                  value={block.code}
                  onChange={(e) => onChange({ ...block, code: e.target.value })}
                  onKeyDown={handleTabKey}
                  onScroll={handleScroll}
                  placeholder={'// Paste your code here…'}
                  rows={displayLines}
                  wrap="off"
                  spellCheck={false}
                  className="w-full bg-transparent pl-12 pr-3 py-2.5 text-[12.5px] font-mono text-foreground/85 placeholder:text-muted-foreground/30 leading-6 resize-none outline-none overflow-x-auto"
                />
              </div>
              {lineCount > MAX_LINES && (
                <div className="flex items-center gap-4">
                  {visibleLines < lineCount && (
                    <button
                      type="button"
                      onClick={() => setVisibleLines((v) => Math.min(v + MAX_LINES, lineCount))}
                      className="flex items-center gap-1 text-[10px] text-muted-foreground/60 hover:text-primary transition-colors"
                    >
                      <ChevronDown className="size-3" />
                      {`Extend code block (${Math.min(MAX_LINES, lineCount - visibleLines)} more lines)`}
                    </button>
                  )}
                  {visibleLines > MAX_LINES && (
                    <button
                      type="button"
                      onClick={() => setVisibleLines((v) => Math.max(v - MAX_LINES, MAX_LINES))}
                      className="flex items-center gap-1 text-[10px] text-muted-foreground/60 hover:text-primary transition-colors"
                    >
                      <ChevronUp className="size-3" />
                      Collapse code block
                    </button>
                  )}
                </div>
              )}
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                  <Info className="size-3" />
                  Annotations ({block.annotations.length})
                </span>
                <button type="button" onClick={() => setShowAnnForm((v) => !v)} className="flex items-center gap-1 text-[10px] text-primary hover:text-primary/80 transition-colors">
                  <Plus className="size-3" />
                  Add note
                </button>
              </div>
              {block.annotations.map((ann, idx) => (
                <div key={idx} className="flex items-start gap-2 rounded-md bg-secondary/30 border border-border/50 px-3 py-2">
                  <span className="font-mono text-[10px] text-muted-foreground/60 tabular-nums shrink-0 mt-0.5">
                    L{ann.line.toString().padStart(2, '0')}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground truncate">{ann.title}</p>
                    <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2 mt-0.5">{ann.body}</p>
                  </div>
                  <button type="button" onClick={() => onChange({ ...block, annotations: block.annotations.filter((_, i) => i !== idx) })} className="text-muted-foreground/40 hover:text-destructive transition-colors shrink-0">
                    <X className="size-3" />
                  </button>
                </div>
              ))}
              {showAnnForm && (
                <div className="rounded-md border border-primary/25 bg-card/50 p-3 space-y-2">
                  <p className="text-[10px] uppercase tracking-[0.18em] text-primary">New annotation</p>
                  <div className="flex gap-2">
                    <div className="flex flex-col gap-1 w-16">
                      <label className="text-[10px] text-muted-foreground">Line</label>
                      <input type="number" min={1} max={lineCount} value={newAnn.line} onChange={(e) => setNewAnn((p) => ({ ...p, line: Math.max(1, Math.min(Number(e.target.value), lineCount)) }))}
                        className="h-8 rounded-md border border-border/60 bg-background/40 px-2 text-xs font-mono text-foreground/80 outline-none focus:border-primary/40 transition-colors text-center" />
                    </div>
                    <div className="flex flex-col gap-1 flex-1">
                      <label className="text-[10px] text-muted-foreground">Title</label>
                      <input type="text" value={newAnn.title} onChange={(e) => setNewAnn((p) => ({ ...p, title: e.target.value }))} placeholder="Short title"
                        className="h-8 rounded-md border border-border/60 bg-background/40 px-2.5 text-xs text-foreground/80 placeholder:text-muted-foreground/40 outline-none focus:border-primary/40 transition-colors" />
                    </div>
                  </div>
                  <textarea value={newAnn.body} onChange={(e) => setNewAnn((p) => ({ ...p, body: e.target.value }))} placeholder="Explain why this line is interesting…" rows={3}
                    className="w-full rounded-md border border-border/60 bg-background/40 px-2.5 py-2 text-xs text-foreground/80 placeholder:text-muted-foreground/40 leading-relaxed outline-none focus:border-primary/40 transition-colors resize-none" />
                  <div className="flex justify-end gap-2">
                    <button type="button" onClick={() => setShowAnnForm(false)} className="text-xs text-muted-foreground hover:text-foreground transition-colors">Cancel</button>
                    <button type="button" onClick={addAnnotation} className="text-xs text-primary hover:text-primary/80 transition-colors font-medium">Add annotation</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {collapsed && (
          <div className="px-3 py-2 flex items-center gap-2">
            <Code2 className="size-3.5 text-muted-foreground/50" />
            <span className="text-xs text-muted-foreground truncate font-mono">{block.filename || 'code block'}</span>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Quote block ───────────────────────────────────────────────────────────────

function QuoteBlockEditor({
  block,
  onChange,
  onRemove,
  onMove,
  isFirst,
  isLast,
}: {
  block: Extract<DevLabBlock, { kind: 'quote' }>
  onChange: (b: Extract<DevLabBlock, { kind: 'quote' }>) => void
  onRemove: () => void
  onMove: (dir: 'up' | 'down') => void
  isFirst: boolean
  isLast: boolean
}) {
  return (
    <div className="group relative flex gap-2">
      <MoveHandle onMove={onMove} isFirst={isFirst} isLast={isLast} />
      <div className="flex-1 rounded-md border border-border/60 bg-card/40 overflow-hidden">
        <BlockHeader icon={<Quote className="size-3" />} label="Quote" onRemove={onRemove} />
        <div className="p-3 space-y-2">
          <textarea
            value={block.content}
            onChange={(e) => onChange({ ...block, content: e.target.value })}
            placeholder='"The real problem is that programmers have spent far too much time worrying about efficiency..."'
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

// ── Image block ───────────────────────────────────────────────────────────────

function ImageBlockEditor({
  block,
  onChange,
  onRemove,
  onMove,
  isFirst,
  isLast,
}: {
  block: Extract<DevLabBlock, { kind: 'image' }>
  onChange: (b: Extract<DevLabBlock, { kind: 'image' }>) => void
  onRemove: () => void
  onMove: (dir: 'up' | 'down') => void
  isFirst: boolean
  isLast: boolean
}) {
  const [uploading, setUploading] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleFile(file: File) {
    setPreviewUrl(URL.createObjectURL(file))
    setUploading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')
      const ext = file.name.split('.').pop() ?? 'jpg'
      const path = `${user.id}/devlab/${Date.now()}-${uid()}.${ext}`
      const { error } = await supabase.storage.from('media').upload(path, file)
      if (error) throw error
      onChange({ ...block, storage_path: path })
    } catch {
      setPreviewUrl(null)
    } finally {
      setUploading(false)
    }
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file?.type.startsWith('image/')) handleFile(file)
  }

  return (
    <div className="group relative flex gap-2">
      <MoveHandle onMove={onMove} isFirst={isFirst} isLast={isLast} />
      <div className="flex-1 rounded-md border border-border/60 bg-card/40 overflow-hidden">
        <BlockHeader icon={<Image className="size-3" />} label="Image" onRemove={onRemove} />
        <div className="p-3 space-y-2">
          {previewUrl || block.storage_path ? (
            <div className="relative rounded-md overflow-hidden bg-secondary/30 border border-border/50">
              {previewUrl && (
                <img src={previewUrl} alt={block.alt || 'preview'} className="max-h-64 w-full object-contain" />
              )}
              {uploading && (
                <div className="absolute inset-0 flex items-center justify-center bg-background/60">
                  <Loader2 className="size-5 animate-spin text-primary" />
                </div>
              )}
              {!uploading && block.storage_path && (
                <p className="text-[10px] text-muted-foreground/60 px-2 py-1 font-mono truncate">{block.storage_path}</p>
              )}
            </div>
          ) : (
            <div
              onDrop={onDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => inputRef.current?.click()}
              className="flex flex-col items-center justify-center gap-2 h-32 rounded-md border border-dashed border-border/60 bg-secondary/20 hover:bg-secondary/30 cursor-pointer transition-colors"
            >
              <Image className="size-6 text-muted-foreground/40" />
              <p className="text-xs text-muted-foreground/60">Drop image or click to upload</p>
            </div>
          )}
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
          />
          <input
            type="text"
            value={block.alt}
            onChange={(e) => onChange({ ...block, alt: e.target.value })}
            placeholder="Alt text (for accessibility)"
            className="w-full h-8 rounded-md border border-border/60 bg-background/40 px-2.5 text-xs text-muted-foreground placeholder:text-muted-foreground/40 outline-none focus:border-primary/40 transition-colors"
          />
          {block.storage_path && !previewUrl && (
            <button type="button" onClick={() => inputRef.current?.click()} className="text-[11px] text-primary hover:text-primary/80 transition-colors">
              Replace image
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Shared block UI ───────────────────────────────────────────────────────────

function BlockHeader({ icon, label, onRemove }: { icon: React.ReactNode; label: string; onRemove: () => void }) {
  return (
    <div className="flex items-center justify-between px-3 py-2 border-b border-border/50 bg-background/30">
      <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
        {icon}
        {label}
      </span>
      <button type="button" onClick={onRemove} className="text-muted-foreground/50 hover:text-destructive transition-colors">
        <Trash2 className="size-3.5" />
      </button>
    </div>
  )
}

function MoveHandle({ onMove, isFirst, isLast }: { onMove: (d: 'up' | 'down') => void; isFirst: boolean; isLast: boolean }) {
  return (
    <div className="flex flex-col items-center pt-1.5 gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
      <button
        type="button"
        disabled={isFirst}
        onClick={() => onMove('up')}
        className="flex items-center justify-center size-5 rounded text-muted-foreground/50 hover:text-foreground hover:bg-secondary disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
        title="Move up"
      >
        <ArrowUp className="size-3" />
      </button>
      <GripVertical className="size-3.5 text-muted-foreground/25" />
      <button
        type="button"
        disabled={isLast}
        onClick={() => onMove('down')}
        className="flex items-center justify-center size-5 rounded text-muted-foreground/50 hover:text-foreground hover:bg-secondary disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
        title="Move down"
      >
        <ArrowDown className="size-3" />
      </button>
    </div>
  )
}

// ── Tag input ─────────────────────────────────────────────────────────────────

function TagInput({ tags, onChange }: { tags: string[]; onChange: (t: string[]) => void }) {
  const [input, setInput] = useState('')
  const ref = useRef<HTMLInputElement>(null)

  function commit() {
    const val = input.trim().replace(/^#/, '')
    if (!val || tags.includes(val)) { setInput(''); return }
    onChange([...tags, val])
    setInput('')
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); commit() }
    if (e.key === 'Backspace' && !input && tags.length > 0) onChange(tags.slice(0, -1))
  }

  return (
    <div className="flex flex-wrap gap-1.5 items-center min-h-9 w-full rounded-md border border-border/60 bg-background/40 px-2.5 py-1.5 cursor-text" onClick={() => ref.current?.focus()}>
      <Tag className="size-3 text-muted-foreground/50 shrink-0" />
      {tags.map((t) => (
        <Badge key={t} variant="secondary" className="rounded-sm text-[10px] font-mono font-normal bg-secondary/50 border border-border/60 h-5 px-1.5 flex items-center gap-1">
          {t}
          <button type="button" onClick={(e) => { e.stopPropagation(); onChange(tags.filter((x) => x !== t)) }} className="text-muted-foreground/60 hover:text-foreground transition-colors">
            <X className="size-2.5" />
          </button>
        </Badge>
      ))}
      <input ref={ref} type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKey} onBlur={commit}
        placeholder={tags.length === 0 ? 'Add tags (Enter to confirm)…' : ''}
        className="flex-1 min-w-[120px] h-5 bg-transparent text-xs text-foreground/80 placeholder:text-muted-foreground/40 outline-none" />
    </div>
  )
}

// ── Add block toolbar ─────────────────────────────────────────────────────────

function AddBlockToolbar({ onAdd }: { onAdd: (kind: DevLabBlock['kind']) => void }) {
  const items = [
    { kind: 'text' as const, icon: AlignLeft, label: 'Text' },
    { kind: 'code' as const, icon: Code2, label: 'Code' },
    { kind: 'quote' as const, icon: Quote, label: 'Quote' },
    { kind: 'image' as const, icon: Image, label: 'Image' },
  ]
  return (
    <div className="flex items-center gap-2 pt-1">
      <span className="text-[10px] text-muted-foreground/50 uppercase tracking-[0.18em]">Add block</span>
      <div className="flex gap-1.5">
        {items.map(({ kind, icon: Icon, label }) => (
          <button key={kind} type="button" onClick={() => onAdd(kind)}
            className="flex items-center gap-1.5 rounded-md border border-border/60 bg-card/40 hover:bg-card/80 hover:border-primary/30 px-2.5 py-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-all">
            <Icon className="size-3" />
            {label}
          </button>
        ))}
      </div>
    </div>
  )
}

// ── Main editor ───────────────────────────────────────────────────────────────

interface DevLabPostEditorProps {
  categoryLabel: string
  categoryId: string | null
  initial?: DevLabPost
  onSave: (draft: PostDraft) => Promise<void>
  onCancel: () => void
}

export function DevLabPostEditor({ categoryLabel, categoryId, initial, onSave, onCancel }: DevLabPostEditorProps) {
  const [title, setTitle] = useState(initial?.title ?? '')
  const [excerpt, setExcerpt] = useState(initial?.excerpt ?? '')
  const [tags, setTags] = useState<string[]>(initial?.tags ?? [])
  const [blocks, setBlocks] = useState<DevLabBlock[]>(
    initial?.blocks?.length ? initial.blocks : [{ id: uid(), kind: 'text', html: '' }],
  )
  const [saving, setSaving] = useState(false)
  const [annotations, setAnnotations] = useState<DevLabAnnotation[]>([])
  const [popoverState, setPopoverState] = useState<{
    annotation: DevLabAnnotation
    pos: { top: number; left: number }
  } | null>(null)

  useEffect(() => {
    if (!initial?.id) return
    listAnnotations(initial.id, false)
      .then(setAnnotations)
      .catch((err) => console.error('[devlab annotations load]', err))
  }, [initial?.id])

  const pendingCount = annotations.filter((a) => a.status === 'pending').length
  const annotationsByBlock = new Map<string, DevLabAnnotation[]>()
  for (const a of annotations) {
    if (!annotationsByBlock.has(a.block_id)) annotationsByBlock.set(a.block_id, [])
    annotationsByBlock.get(a.block_id)!.push(a)
  }

  function handleAnnotationClick(id: string, rect: { top: number; left: number }) {
    const ann = annotations.find((a) => a.id === id)
    if (!ann) return
    setPopoverState({ annotation: ann, pos: rect })
  }

  async function handleAcceptAnnotation() {
    if (!popoverState) return
    const ann = popoverState.annotation
    // Guard: skip accept if originalText or suggestion contains HTML tags
    if (/[<>]/.test(ann.original_text) || /[<>]/.test(ann.suggestion)) {
      try {
        await updateAnnotationStatus(ann.id, 'dismissed')
        setAnnotations((prev) => prev.map((a) => (a.id === ann.id ? { ...a, status: 'dismissed' } : a)))
        toast.error('Sugerencia descartada: contiene formato no soportado')
      } catch {
        toast.error('Error')
      }
      setPopoverState(null)
      return
    }
    // Find block + replace originalText -> suggestion (first occurrence)
    const block = blocks.find((b) => b.id === ann.block_id)
    if (!block || block.kind !== 'text') {
      setPopoverState(null)
      return
    }
    if (!block.html.includes(ann.original_text)) {
      toast.error('Texto original ya no existe en el bloque')
      setPopoverState(null)
      return
    }
    const newHtml = block.html.replace(ann.original_text, ann.suggestion)
    setBlocks((prev) => prev.map((b) => (b.id === ann.block_id ? { ...b, html: newHtml } : b)))
    try {
      await updateAnnotationStatus(ann.id, 'accepted')
      setAnnotations((prev) => prev.map((a) => (a.id === ann.id ? { ...a, status: 'accepted' } : a)))
      toast.success('Aplicado')
    } catch {
      toast.error('Error al guardar status')
    }
    setPopoverState(null)
  }

  async function handleDismissAnnotation() {
    if (!popoverState) return
    const ann = popoverState.annotation
    try {
      await updateAnnotationStatus(ann.id, 'dismissed')
      setAnnotations((prev) => prev.map((a) => (a.id === ann.id ? { ...a, status: 'dismissed' } : a)))
    } catch {
      toast.error('Error')
    }
    setPopoverState(null)
  }

  function addBlock(kind: DevLabBlock['kind']) {
    const id = uid()
    let block: DevLabBlock
    if (kind === 'text') block = { id, kind: 'text', html: '' }
    else if (kind === 'code') block = { id, kind: 'code', filename: '', language: 'ts', code: '', annotations: [] }
    else if (kind === 'quote') block = { id, kind: 'quote', content: '', attribution: '' }
    else block = { id, kind: 'image', storage_path: '', alt: '' }
    setBlocks((prev) => [...prev, block])
  }

  function updateBlock(id: string, updated: DevLabBlock) {
    setBlocks((prev) => prev.map((b) => (b.id === id ? updated : b)))
  }

  function removeBlock(id: string) {
    setBlocks((prev) => prev.filter((b) => b.id !== id))
  }

  function moveBlock(id: string, dir: 'up' | 'down') {
    setBlocks((prev) => {
      const idx = prev.findIndex((b) => b.id === id)
      if (idx === -1) return prev
      if (dir === 'up' && idx === 0) return prev
      if (dir === 'down' && idx === prev.length - 1) return prev
      const next = [...prev]
      const swapIdx = dir === 'up' ? idx - 1 : idx + 1
      ;[next[idx], next[swapIdx]] = [next[swapIdx], next[idx]]
      return next
    })
  }

  async function handleSave() {
    if (!title.trim()) return
    setSaving(true)
    try {
      await onSave({
        category_id: categoryId,
        title: title.trim(),
        excerpt: excerpt.trim(),
        tags,
        blocks,
      })
    } finally {
      setSaving(false)
    }
  }

  const isEdit = !!initial

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-6 lg:px-14 py-4 border-b border-border/60 bg-background/60 sticky top-0 z-10">
        <div>
          <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
            {isEdit ? `Editing · ${categoryLabel}` : `New post in ${categoryLabel}`}
          </p>
          <p className="text-sm font-medium text-foreground mt-0.5">{title.trim() || 'Untitled'}</p>
        </div>
        <div className="flex items-center gap-2">
          {isEdit && initial?.id && (
            <ReviewButton
              postId={initial.id}
              blocks={blocks}
              pendingCount={pendingCount}
              onCreated={(created) => setAnnotations((prev) => [...created, ...prev])}
            />
          )}
          <button type="button" onClick={onCancel}
            className="flex items-center gap-1.5 h-8 px-3 rounded-md text-xs text-muted-foreground hover:text-foreground border border-border/60 hover:border-border transition-colors">
            Cancel
          </button>
          <Button type="button" onClick={handleSave} disabled={saving || !title.trim()} size="sm" className="h-8 text-xs">
            {saving ? <><Loader2 className="size-3 animate-spin" /> Saving…</> : isEdit ? 'Save changes' : 'Publish post'}
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="px-6 lg:px-14 py-10 max-w-4xl space-y-8">
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Title</label>
              <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
                placeholder="Give your note a clear, specific title"
                className="w-full h-11 rounded-md border border-border/60 bg-background/40 px-3 text-sm text-foreground placeholder:text-muted-foreground/40 outline-none focus:border-primary/40 transition-colors" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Excerpt</label>
              <textarea value={excerpt} onChange={(e) => setExcerpt(e.target.value)}
                placeholder="One or two sentences. Appears in the post list."
                rows={2}
                className="w-full rounded-md border border-border/60 bg-background/40 px-3 py-2.5 text-sm text-foreground/85 placeholder:text-muted-foreground/40 leading-relaxed resize-none outline-none focus:border-primary/40 transition-colors" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Tags</label>
              <TagInput tags={tags} onChange={setTags} />
            </div>
          </div>

          <div className="border-t border-border/40" />

          <div className="space-y-3">
            <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Content</p>
            {blocks.length === 0 && (
              <p className="text-xs text-muted-foreground/50 py-6 text-center">No blocks yet. Use the toolbar below.</p>
            )}
            {blocks.map((block, idx) => {
              const props = {
                onRemove: () => removeBlock(block.id),
                onMove: (dir: 'up' | 'down') => moveBlock(block.id, dir),
                isFirst: idx === 0,
                isLast: idx === blocks.length - 1,
              }
              return (
                <div key={block.id}>
                  {block.kind === 'text' && (
                    <TextBlockEditor
                      block={block}
                      onChange={(b) => updateBlock(block.id, b)}
                      {...props}
                      annotations={annotationsByBlock.get(block.id)}
                      onAnnotationClick={handleAnnotationClick}
                    />
                  )}
                  {block.kind === 'code' && (
                    <CodeBlockEditor block={block} onChange={(b) => updateBlock(block.id, b)} {...props} />
                  )}
                  {block.kind === 'quote' && (
                    <QuoteBlockEditor block={block} onChange={(b) => updateBlock(block.id, b)} {...props} />
                  )}
                  {block.kind === 'image' && (
                    <ImageBlockEditor block={block} onChange={(b) => updateBlock(block.id, b)} {...props} />
                  )}
                </div>
              )
            })}
            <AddBlockToolbar onAdd={addBlock} />
          </div>
        </div>
      </div>
      {popoverState && (
        <AnnotationPopover
          annotation={popoverState.annotation}
          pos={popoverState.pos}
          onAccept={handleAcceptAnnotation}
          onDismiss={handleDismissAnnotation}
          onClose={() => setPopoverState(null)}
        />
      )}
    </div>
  )
}
