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
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { createFacultySubject, updateFacultySubject } from '@/lib/faculty/queries'
import type { FacultySubject } from '@/lib/faculty/types'

const COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#ef4444',
  '#f97316', '#eab308', '#22c55e', '#06b6d4',
  '#3b82f6', '#64748b',
]

const STATUS_OPTIONS: Array<{ value: FacultySubject['status']; label: string }> = [
  { value: 'cursando', label: 'Cursando' },
  { value: 'final-pendiente', label: 'Final pendiente' },
  { value: 'aprobada', label: 'Aprobada' },
  { value: 'recursar', label: 'Recursar' },
]

const schema = z.object({
  name: z.string().min(1, 'Requerido'),
  code: z.string().optional(),
  semester: z.string().optional(),
  professor: z.string().optional(),
  credits: z.string().optional(),
  color: z.string().optional(),
  status: z.enum(['cursando', 'final-pendiente', 'aprobada', 'recursar']),
})

type FormValues = {
  name: string
  code?: string
  semester?: string
  professor?: string
  credits?: string
  color?: string
  status: FacultySubject['status']
}

type Props = {
  open: boolean
  onOpenChange: (v: boolean) => void
  initial?: FacultySubject | null
  onCreated?: (s: FacultySubject) => void
  onUpdated?: (s: FacultySubject) => void
}

export function SubjectForm({ open, onOpenChange, initial, onCreated, onUpdated }: Props) {
  const isEdit = !!initial

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      code: '',
      semester: '',
      professor: '',
      credits: '',
      color: COLORS[0],
      status: 'cursando',
    },
  })

  useEffect(() => {
    if (open) {
      form.reset({
        name: initial?.name ?? '',
        code: initial?.code ?? '',
        semester: initial?.semester ?? '',
        professor: initial?.professor ?? '',
        credits: initial?.credits != null ? String(initial.credits) : '',
        color: initial?.color ?? COLORS[0],
        status: initial?.status ?? 'cursando',
      })
    }
  }, [open, initial])

  async function onSubmit(values: FormValues) {
    const payload = {
      name: values.name.trim(),
      code: values.code?.trim() || null,
      semester: values.semester?.trim() || null,
      professor: values.professor?.trim() || null,
      credits: values.credits ? Number(values.credits) || null : null,
      color: values.color || null,
      status: values.status,
    }

    try {
      if (isEdit && initial) {
        await updateFacultySubject(initial.id, payload)
        onUpdated?.({ ...initial, ...payload })
        toast.success('Materia actualizada')
      } else {
        const created = await createFacultySubject(payload)
        onCreated?.(created)
        toast.success('Materia creada')
      }
      onOpenChange(false)
    } catch {
      toast.error(isEdit ? 'Error al actualizar' : 'Error al crear')
    }
  }

  const selectedColor = form.watch('color')

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar materia' : 'Nueva materia'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre</FormLabel>
                  <FormControl>
                    <Input placeholder="Algoritmos y Estructuras de Datos" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Código <span className="text-muted-foreground font-normal">(opcional)</span></FormLabel>
                    <FormControl>
                      <Input placeholder="MAT-101" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="semester"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cuatrimestre <span className="text-muted-foreground font-normal">(opcional)</span></FormLabel>
                    <FormControl>
                      <Input placeholder="2026-1C" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="professor"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Profesor <span className="text-muted-foreground font-normal">(opcional)</span></FormLabel>
                    <FormControl>
                      <Input placeholder="Dr. Pérez" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="credits"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Créditos <span className="text-muted-foreground font-normal">(opcional)</span></FormLabel>
                    <FormControl>
                      <Input type="number" min={1} placeholder="6" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Estado</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {STATUS_OPTIONS.map((o) => (
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
              name="color"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Color</FormLabel>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => field.onChange(c)}
                        className={cn(
                          'size-7 rounded-full border-2 transition-all',
                          selectedColor === c
                            ? 'border-foreground scale-110'
                            : 'border-transparent hover:scale-105',
                        )}
                        style={{ backgroundColor: c }}
                        aria-label={c}
                      />
                    ))}
                    <button
                      type="button"
                      onClick={() => field.onChange(null)}
                      className={cn(
                        'size-7 rounded-full border-2 bg-muted text-muted-foreground text-[10px] transition-all',
                        selectedColor == null
                          ? 'border-foreground scale-110'
                          : 'border-transparent hover:scale-105',
                      )}
                      aria-label="Sin color"
                    >
                      —
                    </button>
                  </div>
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
