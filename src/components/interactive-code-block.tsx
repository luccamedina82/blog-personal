import { cn } from '@/lib/utils'
import { useState } from 'react'
import { Info, Copy, Check } from 'lucide-react'

export interface CodeAnnotation {
  /** 1-indexed line number that triggers this note */
  line: number
  title: string
  body: string
}

interface InteractiveCodeBlockProps {
  language?: string
  filename?: string
  code: string
  annotations?: CodeAnnotation[]
}

function tokenize(line: string) {
  const KEYWORDS = new Set([
    'const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while',
    'import', 'from', 'export', 'default', 'class', 'extends', 'new', 'async',
    'await', 'try', 'catch', 'throw', 'type', 'interface', 'as', 'in', 'of',
    'true', 'false', 'null', 'undefined', 'void', 'this',
  ])

  const tokens: { text: string; kind: string }[] = []
  const re =
    /(\/\/.*$)|(["'`])(?:\\.|(?!\2).)*\2|(\b\d+(?:\.\d+)?\b)|(\b[A-Za-z_$][\w$]*\b)|([{}()[\];,.<>=+\-*/%!&|?:])|(\s+)/g
  let m: RegExpExecArray | null
  let lastIndex = 0
  while ((m = re.exec(line)) !== null) {
    if (m.index > lastIndex) {
      tokens.push({ text: line.slice(lastIndex, m.index), kind: 'plain' })
    }
    if (m[1]) tokens.push({ text: m[1], kind: 'comment' })
    else if (m[2]) tokens.push({ text: m[0], kind: 'string' })
    else if (m[3]) tokens.push({ text: m[3], kind: 'number' })
    else if (m[4]) {
      tokens.push({
        text: m[4],
        kind: KEYWORDS.has(m[4]) ? 'keyword' : /^[A-Z]/.test(m[4]) ? 'type' : 'ident',
      })
    } else if (m[5]) tokens.push({ text: m[5], kind: 'punct' })
    else if (m[6]) tokens.push({ text: m[6], kind: 'ws' })
    lastIndex = re.lastIndex
  }
  if (lastIndex < line.length) {
    tokens.push({ text: line.slice(lastIndex), kind: 'plain' })
  }
  return tokens
}

const TOKEN_CLASS: Record<string, string> = {
  keyword: 'text-primary/90',
  string: 'text-foreground/80',
  number: 'text-foreground/70',
  comment: 'text-muted-foreground/60 italic',
  type: 'text-foreground',
  ident: 'text-foreground/85',
  punct: 'text-muted-foreground',
  plain: 'text-foreground/85',
  ws: '',
}

export function InteractiveCodeBlock({
  language = 'ts',
  filename,
  code,
  annotations = [],
}: InteractiveCodeBlockProps) {
  const [active, setActive] = useState<number | null>(null)
  const [copied, setCopied] = useState(false)

  const lines = code.replace(/\n+$/, '').split('\n')
  const annotated = new Map(annotations.map((a) => [a.line, a]))
  const activeNote = active !== null ? annotated.get(active) : null

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      /* noop */
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-4">
      <div className="rounded-lg border border-border/70 bg-card/60 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/70 bg-background/40">
          <div className="flex items-center gap-2 min-w-0">
            <div className="flex gap-1.5">
              <span className="size-2.5 rounded-full bg-border" />
              <span className="size-2.5 rounded-full bg-border" />
              <span className="size-2.5 rounded-full bg-border" />
            </div>
            <span className="ml-2 text-xs font-mono text-muted-foreground truncate">
              {filename ?? `snippet.${language}`}
            </span>
          </div>
          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Copy code"
          >
            {copied ? <Check className="size-3 text-primary" /> : <Copy className="size-3" />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>

        {/* Code */}
        <pre className="font-mono text-[12.5px] leading-6 overflow-x-auto py-3">
          {lines.map((line, i) => {
            const lineNum = i + 1
            const note = annotated.get(lineNum)
            const isActive = active === lineNum
            return (
              <button
                key={lineNum}
                type="button"
                onClick={() => setActive(isActive ? null : lineNum)}
                disabled={!note}
                className={cn(
                  'group flex w-full items-start gap-4 px-4 text-left',
                  note && 'cursor-pointer',
                  !note && 'cursor-default',
                  isActive && 'bg-primary/5',
                  note && !isActive && 'hover:bg-secondary/40',
                )}
              >
                <span
                  className={cn(
                    'select-none text-right tabular-nums w-6 shrink-0 text-muted-foreground/40',
                    isActive && 'text-primary',
                  )}
                >
                  {lineNum}
                </span>
                <span className="flex-1 whitespace-pre">
                  {tokenize(line).map((t, idx) => (
                    <span key={idx} className={TOKEN_CLASS[t.kind]}>
                      {t.text}
                    </span>
                  ))}
                  {line.length === 0 && ' '}
                </span>
                {note && (
                  <span
                    className={cn(
                      'shrink-0 inline-flex items-center justify-center size-5 rounded border border-border/70 transition-colors',
                      isActive
                        ? 'bg-primary/15 border-primary/40 text-primary'
                        : 'text-muted-foreground/70 group-hover:text-primary group-hover:border-primary/40',
                    )}
                  >
                    <Info className="size-3" />
                  </span>
                )}
              </button>
            )
          })}
        </pre>
      </div>

      {/* Side note */}
      <aside className="lg:sticky lg:top-6 lg:self-start">
        <div
          className={cn(
            'rounded-lg border bg-card/40 p-4 transition-all duration-300',
            activeNote ? 'border-primary/30' : 'border-border/60',
          )}
        >
          {activeNote ? (
            <>
              <p className="text-[10px] uppercase tracking-[0.18em] text-primary mb-2">
                Line {activeNote.line}
              </p>
              <h4 className="text-sm font-medium text-foreground mb-1.5">
                {activeNote.title}
              </h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {activeNote.body}
              </p>
            </>
          ) : (
            <>
              <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-2">
                Notes
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Click any highlighted line in the snippet to read a deeper
                explanation of that fragment.
              </p>
              <ul className="mt-3 space-y-1.5">
                {annotations.map((a) => (
                  <li key={a.line}>
                    <button
                      type="button"
                      onClick={() => setActive(a.line)}
                      className="w-full flex items-center gap-2 text-left text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <span className="font-mono tabular-nums text-muted-foreground/60">
                        L{a.line.toString().padStart(2, '0')}
                      </span>
                      <span className="truncate">{a.title}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </aside>
    </div>
  )
}
