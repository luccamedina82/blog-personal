import { ArrowLeft, CalendarDays, Link2, Pencil, Star, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { SaveToAnkiButton } from '@/components/english/anki/save-to-anki-button'
import { InteractiveCodeBlock } from '@/components/interactive-code-block'
import { supabase } from '@/lib/supabase'
import { useState, useEffect, useRef } from 'react'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { listNotesReferencingTitle } from '@/lib/faculty/queries'
import type { FacultyNote, FacultyNoteKind, FacultySubject } from '@/lib/faculty/types'
import type { DevLabBlock } from '@/lib/devlab/types'

const KIND_LABEL: Record<FacultyNoteKind, string> = {
  clase: 'Clase',
  apunte: 'Apunte',
  tp: 'TP',
  parcial: 'Parcial',
  final: 'Final',
}

const KIND_BADGE: Record<FacultyNoteKind, string> = {
  clase: 'bg-blue-500/10 text-blue-600 border-blue-200 dark:border-blue-800',
  apunte: 'bg-violet-500/10 text-violet-600 border-violet-200 dark:border-violet-800',
  tp: 'bg-orange-500/10 text-orange-600 border-orange-200 dark:border-orange-800',
  parcial: 'bg-red-500/10 text-red-600 border-red-200 dark:border-red-800',
  final: 'bg-rose-500/10 text-rose-700 border-rose-200 dark:border-rose-800',
}

function SignedImage({ path, alt }: { path: string; alt: string }) {
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    supabase.storage.from('media').createSignedUrl(path, 3600)
      .then(({ data }) => setUrl(data?.signedUrl ?? null))
  }, [path])
  if (!url) return <div className="h-40 rounded-lg bg-secondary/30 animate-pulse" />
  return <img src={url} alt={alt} className="rounded-lg max-w-full" />
}

function TextBlockView({
  html,
  onBacklinkClick,
}: {
  html: string
  onBacklinkClick?: (title: string) => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  const processed = html.replace(
    /\[\[([^\]]+)\]\]/g,
    '<a class="faculty-backlink" data-bk="$1" href="#">[[$1]]</a>',
  )

  useEffect(() => {
    const container = ref.current
    if (!container) return
    const links = container.querySelectorAll<HTMLAnchorElement>('.faculty-backlink')
    const cleanup: Array<() => void> = []
    links.forEach((el) => {
      const title = el.dataset.bk ?? ''
      const fn = (e: MouseEvent) => {
        e.preventDefault()
        onBacklinkClick?.(title)
      }
      el.addEventListener('click', fn)
      cleanup.push(() => el.removeEventListener('click', fn))
    })
    return () => cleanup.forEach((f) => f())
  }, [processed, onBacklinkClick])

  return (
    <div
      ref={ref}
      className="tiptap-render max-w-2xl"
      dangerouslySetInnerHTML={{ __html: processed }}
    />
  )
}

function BlockRenderer({
  block,
  noteTitle,
  noteId,
  onBacklinkClick,
}: {
  block: DevLabBlock
  noteTitle: string
  noteId: string
  onBacklinkClick?: (title: string) => void
}) {
  if (block.kind === 'text') {
    return <TextBlockView html={block.html} onBacklinkClick={onBacklinkClick} />
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
      <div className="max-w-2xl flex items-start gap-3">
        <blockquote className="flex-1 border-l-2 border-primary/50 pl-5 py-1 text-[15px] text-foreground/80 italic">
          &ldquo;{block.content}&rdquo;
          {block.attribution && (
            <footer className="mt-1 text-xs text-muted-foreground not-italic">{block.attribution}</footer>
          )}
        </blockquote>
        <SaveToAnkiButton
          front={block.content}
          back={block.attribution || noteTitle}
          sourceKind={null}
          sourceRef={noteId}
        />
      </div>
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

type IncomingLink = { id: string; title: string; subject_id: string; kind: FacultyNoteKind }

type Props = {
  note: FacultyNote
  subject: FacultySubject
  onBack: () => void
  onEdit: () => void
  onDelete: () => void
  onBacklinkClick?: (title: string) => void
}

export function NoteView({ note, subject, onBack, onEdit, onDelete, onBacklinkClick }: Props) {
  const [incomingLinks, setIncomingLinks] = useState<IncomingLink[]>([])

  useEffect(() => {
    listNotesReferencingTitle(note.title, note.id)
      .then(setIncomingLinks)
      .catch(() => {})
  }, [note.id, note.title])

  return (
    <div className="flex flex-col min-h-full">
      {/* Sticky nav */}
      <div className="sticky top-0 z-10 flex items-center justify-between px-6 lg:px-12 py-3 border-b border-border/50 bg-background/80 backdrop-blur-md">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="size-3.5" />
          {subject.name}
        </button>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onEdit}
            className="flex items-center gap-1.5 h-7 px-2.5 rounded-md text-xs text-muted-foreground hover:text-foreground border border-border/60 hover:border-border transition-colors"
          >
            <Pencil className="size-3" />
            Editar
          </button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button
                type="button"
                className="flex items-center gap-1.5 h-7 px-2.5 rounded-md text-xs text-muted-foreground hover:text-destructive border border-border/60 hover:border-destructive/40 transition-colors"
              >
                <Trash2 className="size-3" />
                Eliminar
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>¿Eliminar "{note.title}"?</AlertDialogTitle>
                <AlertDialogDescription>No se puede deshacer.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={onDelete}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Eliminar
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <article className="flex-1 px-6 lg:px-12 py-10 lg:py-14">
        <header className="mb-10 max-w-2xl">
          <div className="flex items-center gap-3 text-[11px] text-muted-foreground mb-4 flex-wrap">
            <Badge
              variant="outline"
              className={cn('text-[10px] uppercase tracking-wide', KIND_BADGE[note.kind])}
            >
              {KIND_LABEL[note.kind]}
            </Badge>
            {note.date && (
              <span className="flex items-center gap-1">
                <CalendarDays className="size-3" />
                {new Date(note.date + 'T00:00:00').toLocaleDateString('es-AR', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </span>
            )}
            {note.grade != null && (
              <span className="flex items-center gap-1 font-medium text-foreground">
                <Star className="size-3 text-yellow-500" />
                {note.grade}
              </span>
            )}
          </div>
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-balance leading-tight">
            {note.title}
          </h1>
          {note.tags.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-1.5">
              {note.tags.map((t) => (
                <Badge
                  key={t}
                  variant="secondary"
                  className="rounded-md text-[10px] font-mono font-normal bg-secondary/50 border border-border/60"
                >
                  {t}
                </Badge>
              ))}
            </div>
          )}
        </header>

        <div className="h-px bg-border/40 mb-8 max-w-2xl" />

        <section className="space-y-8">
          {note.blocks.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-4 py-20 text-center max-w-2xl">
              <p className="text-sm text-muted-foreground">Sin contenido todavía. Editá la nota para agregar bloques.</p>
            </div>
          ) : (
            note.blocks.map((block) => (
              <BlockRenderer
                key={block.id}
                block={block}
                noteTitle={note.title}
                noteId={note.id}
                onBacklinkClick={onBacklinkClick}
              />
            ))
          )}
        </section>

        {/* Incoming links */}
        {incomingLinks.length > 0 && (
          <div className="mt-16 max-w-2xl">
            <div className="h-px bg-border/40 mb-6" />
            <div className="flex items-center gap-2 mb-4 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              <Link2 className="size-3.5" />
              Referenciada por
            </div>
            <ul className="space-y-2">
              {incomingLinks.map((n) => (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() => onBacklinkClick?.(n.title)}
                    className="group flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full text-left"
                  >
                    <span className="inline-block rounded px-1.5 py-0.5 text-[10px] font-medium bg-secondary text-secondary-foreground shrink-0">
                      {KIND_LABEL[n.kind]}
                    </span>
                    <span className="truncate group-hover:underline underline-offset-2">{n.title}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </article>
    </div>
  )
}
