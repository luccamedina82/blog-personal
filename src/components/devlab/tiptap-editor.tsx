import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import Placeholder from '@tiptap/extension-placeholder'
import { Bold, Italic, Underline as UnderlineIcon, BookOpen } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useState, useCallback, useRef } from 'react'
import { useBacklinkSuggestions } from '@/lib/faculty/backlinks-context'
import { BookCitationExtension } from '@/lib/faculty/book-citation-extension'
import { BookCitationPicker } from '@/components/library/book-citation-picker'
import { usePdfPanel } from '@/lib/faculty/pdf-panel-context'

interface TiptapEditorProps {
  value: string
  onChange: (html: string) => void
  placeholder?: string
  className?: string
}

export function TiptapEditor({ value, onChange, placeholder, className }: TiptapEditorProps) {
  const allSuggestions = useBacklinkSuggestions()
  const { openPdf } = usePdfPanel()
  const [query, setQuery] = useState<string | null>(null)
  const [activeIndex, setActiveIndex] = useState(0)
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number } | null>(null)
  const [pickerOpen, setPickerOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const filtered =
    query !== null && allSuggestions.length > 0
      ? allSuggestions
          .filter((s) => s.title.toLowerCase().includes(query.toLowerCase()))
          .slice(0, 8)
      : []

  const insertBacklink = useCallback(
    (title: string) => {
      if (!editor) return
      const { from } = editor.state.selection
      const textBefore = editor.state.doc.textBetween(Math.max(0, from - 200), from, '\n')
      const match = textBefore.match(/\[\[([^\]]*)$/)
      if (!match) return
      const start = from - match[0].length
      editor.chain().focus().deleteRange({ from: start, to: from }).insertContent(`[[${title}]]`).run()
      setQuery(null)
      setDropdownPos(null)
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ codeBlock: false }),
      Underline,
      Placeholder.configure({ placeholder: placeholder ?? 'Write your content here…' }),
      BookCitationExtension,
    ],
    content: value,
    onUpdate({ editor: e }) {
      onChange(e.getHTML())
      if (allSuggestions.length === 0) return
      const { from } = e.state.selection
      const textBefore = e.state.doc.textBetween(Math.max(0, from - 200), from, '\n')
      const match = textBefore.match(/\[\[([^\]]*)$/)
      if (match) {
        setQuery(match[1])
        setActiveIndex(0)
        // Position dropdown just below the cursor
        if (containerRef.current) {
          try {
            const coords = e.view.coordsAtPos(from)
            const rect = containerRef.current.getBoundingClientRect()
            setDropdownPos({
              top: coords.bottom - rect.top + 4,
              left: Math.min(coords.left - rect.left, rect.width - 240),
            })
          } catch {
            setDropdownPos(null)
          }
        }
      } else {
        setQuery(null)
        setDropdownPos(null)
      }
    },
  })

  function handleKeyDown(e: React.KeyboardEvent) {
    if (query === null || filtered.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((i) => Math.min(i + 1, filtered.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault()
      insertBacklink(filtered[activeIndex].title)
    } else if (e.key === 'Escape') {
      setQuery(null)
      setDropdownPos(null)
    }
  }

  if (!editor) return null

  return (
    <div ref={containerRef} className={cn('flex flex-col relative', className)}>
      {/* Static formatting toolbar */}
      <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-border/40 bg-background/20 flex-wrap">
        <ToolBtn active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()} title="Bold (⌘B)">
          <Bold className="size-3.5" />
        </ToolBtn>
        <ToolBtn active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()} title="Italic (⌘I)">
          <Italic className="size-3.5" />
        </ToolBtn>
        <ToolBtn active={editor.isActive('underline')} onClick={() => editor.chain().focus().toggleUnderline().run()} title="Underline (⌘U)">
          <UnderlineIcon className="size-3.5" />
        </ToolBtn>
        <div className="w-px h-4 bg-border/60 mx-1 shrink-0" />
        <ToolBtn active={editor.isActive('heading', { level: 1 })} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} title="Heading 1">
          <span className="text-[10px] font-bold font-mono leading-none">H1</span>
        </ToolBtn>
        <ToolBtn active={editor.isActive('heading', { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} title="Heading 2">
          <span className="text-[10px] font-bold font-mono leading-none">H2</span>
        </ToolBtn>
        <ToolBtn active={editor.isActive('heading', { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} title="Heading 3">
          <span className="text-[10px] font-bold font-mono leading-none">H3</span>
        </ToolBtn>
        <div className="w-px h-4 bg-border/60 mx-1 shrink-0" />
        <ToolBtn active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()} title="Bullet list">
          <span className="text-[10px] font-mono leading-none">• ≡</span>
        </ToolBtn>
        <ToolBtn active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()} title="Numbered list">
          <span className="text-[10px] font-mono leading-none">1 ≡</span>
        </ToolBtn>
        <div className="w-px h-4 bg-border/60 mx-1 shrink-0" />
        <ToolBtn active={editor.isActive('blockquote')} onClick={() => editor.chain().focus().toggleBlockquote().run()} title="Blockquote">
          <span className="text-[10px] font-mono leading-none">"</span>
        </ToolBtn>
        <ToolBtn active={editor.isActive('code')} onClick={() => editor.chain().focus().toggleCode().run()} title="Inline code">
          <span className="text-[10px] font-mono leading-none">{`</>`}</span>
        </ToolBtn>
        <div className="w-px h-4 bg-border/60 mx-1 shrink-0" />
        <ToolBtn active={false} onClick={() => setPickerOpen(true)} title="Citar libro">
          <BookOpen className="size-3.5" />
        </ToolBtn>
      </div>

      <EditorContent
        editor={editor}
        className="px-3 py-3 text-sm leading-relaxed min-h-[120px]"
        onKeyDown={handleKeyDown}
      />

      <BookCitationPicker
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        onPick={(bookId, bookTitle, storagePath, page) => {
          editor.chain().focus().insertContent({
            type: 'bookCitation',
            attrs: { bookId, bookTitle, storagePath, page },
          }).run()
          openPdf(storagePath, page)
        }}
      />

      {/* [[backlink]] autocomplete dropdown — anchored to cursor position */}
      {filtered.length > 0 && dropdownPos && (
        <div
          className="absolute z-50 rounded-md border border-border bg-popover shadow-lg py-1 w-64 max-h-[220px] overflow-y-auto"
          style={{ top: dropdownPos.top, left: dropdownPos.left }}
        >
          <p className="px-3 py-1 text-[10px] uppercase tracking-wider text-muted-foreground/70">
            <kbd className="font-mono">↑↓</kbd> · <kbd className="font-mono">↵</kbd> insertar · <kbd className="font-mono">Esc</kbd>
          </p>
          {filtered.map((s, i) => (
            <button
              key={s.id}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault()
                insertBacklink(s.title)
              }}
              className={cn(
                'w-full text-left px-3 py-1.5 text-sm flex items-center justify-between gap-3 hover:bg-accent transition-colors',
                i === activeIndex && 'bg-accent',
              )}
            >
              <span className="truncate">{s.title}</span>
              {s.hint && (
                <span className="text-[10px] text-muted-foreground shrink-0">{s.hint}</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function ToolBtn({
  active,
  onClick,
  title,
  children,
}: {
  active: boolean
  onClick: () => void
  title: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => {
        e.preventDefault()
        onClick()
      }}
      title={title}
      className={cn(
        'flex items-center justify-center size-6 rounded transition-colors',
        active
          ? 'bg-primary/20 text-primary'
          : 'text-muted-foreground hover:text-foreground hover:bg-secondary',
      )}
    >
      {children}
    </button>
  )
}
