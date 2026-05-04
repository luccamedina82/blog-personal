import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import Placeholder from '@tiptap/extension-placeholder'
import { Bold, Italic, Underline as UnderlineIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TiptapEditorProps {
  value: string
  onChange: (html: string) => void
  placeholder?: string
  className?: string
}

export function TiptapEditor({ value, onChange, placeholder, className }: TiptapEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ codeBlock: false }),
      Underline,
      Placeholder.configure({ placeholder: placeholder ?? 'Write your content here…' }),
    ],
    content: value,
    onUpdate({ editor }) {
      onChange(editor.getHTML())
    },
  })

  if (!editor) return null

  return (
    <div className={cn('flex flex-col', className)}>
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
      </div>

      <EditorContent
        editor={editor}
        className="px-3 py-3 text-sm leading-relaxed min-h-[120px]"
      />
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
