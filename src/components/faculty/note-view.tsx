import { ArrowLeft, CalendarDays, Pencil, Star, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { SaveToAnkiButton } from '@/components/english/anki/save-to-anki-button'
import { InteractiveCodeBlock } from '@/components/interactive-code-block'
import { supabase } from '@/lib/supabase'
import { useState, useEffect } from 'react'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
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

function BlockRenderer({ block, noteTitle, noteId }: { block: DevLabBlock; noteTitle: string; noteId: string }) {
  if (block.kind === 'text') {
    return (
      <div className="tiptap-render max-w-2xl" dangerouslySetInnerHTML={{ __html: block.html }} />
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

type Props = {
  note: FacultyNote
  subject: FacultySubject
  onBack: () => void
  onEdit: () => void
  onDelete: () => void
}

export function NoteView({ note, subject, onBack, onEdit, onDelete }: Props) {
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
              <BlockRenderer key={block.id} block={block} noteTitle={note.title} noteId={note.id} />
            ))
          )}
        </section>
      </article>
    </div>
  )
}
