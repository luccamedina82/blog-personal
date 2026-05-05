import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  Form, FormField, FormItem, FormLabel, FormControl, FormMessage,
} from '@/components/ui/form'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { createFacultyDeadline, updateFacultyDeadline } from '@/lib/faculty/queries'
import type { FacultyDeadline, FacultyDeadlineKind } from '@/lib/faculty/types'

const KIND_OPTIONS: Array<{ value: FacultyDeadlineKind; label: string }> = [
  { value: 'tp', label: 'Trabajo Práctico' },
  { value: 'parcial', label: 'Parcial' },
  { value: 'final', label: 'Final' },
  { value: 'recuperatorio', label: 'Recuperatorio' },
  { value: 'entrega', label: 'Entrega' },
]

const schema = z.object({
  kind: z.enum(['tp', 'parcial', 'final', 'recuperatorio', 'entrega']),
  title: z.string().min(1, 'Requerido'),
  due_at: z.string().min(1, 'Requerido'),
  note: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

type Props = {
  open: boolean
  onOpenChange: (v: boolean) => void
  subjectId: string
  initial?: FacultyDeadline | null
  onCreated?: (d: FacultyDeadline) => void
  onUpdated?: (d: FacultyDeadline) => void
}

function toDatetimeLocal(iso: string) {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function DeadlineForm({ open, onOpenChange, subjectId, initial, onCreated, onUpdated }: Props) {
  const isEdit = !!initial

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { kind: 'tp', title: '', due_at: '', note: '' },
  })

  useEffect(() => {
    if (open) {
      form.reset({
        kind: initial?.kind ?? 'tp',
        title: initial?.title ?? '',
        due_at: initial?.due_at ? toDatetimeLocal(initial.due_at) : '',
        note: initial?.note ?? '',
      })
    }
  }, [open, initial])

  async function onSubmit(values: FormValues) {
    const payload = {
      subject_id: subjectId,
      kind: values.kind,
      title: values.title.trim(),
      due_at: new Date(values.due_at).toISOString(),
      done: initial?.done ?? false,
      note: values.note?.trim() || null,
    }

    try {
      if (isEdit && initial) {
        await updateFacultyDeadline(initial.id, payload)
        onUpdated?.({ ...initial, ...payload })
        toast.success('Deadline actualizado')
      } else {
        const created = await createFacultyDeadline(payload)
        onCreated?.(created)
        toast.success('Deadline creado')
      }
      onOpenChange(false)
    } catch {
      toast.error(isEdit ? 'Error al actualizar' : 'Error al crear')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar deadline' : 'Nuevo deadline'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Título</FormLabel>
                  <FormControl>
                    <Input placeholder="Parcial 1 — Unidades 1-4" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="kind"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {KIND_OPTIONS.map((o) => (
                          <SelectItem key={o.value} value={o.value}>
                            {o.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="due_at"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fecha y hora</FormLabel>
                    <FormControl>
                      <Input type="datetime-local" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="note"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Nota <span className="text-muted-foreground font-normal">(opcional)</span>
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Temas, aula, condiciones especiales…"
                      className="resize-none"
                      rows={2}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting
                  ? isEdit ? 'Guardando…' : 'Creando…'
                  : isEdit ? 'Guardar' : 'Crear'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
