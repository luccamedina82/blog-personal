import { createFileRoute } from '@tanstack/react-router'
import React, { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { BookOpen, CalendarClock, GraduationCap, Star } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { FacultyShell } from '@/components/faculty/faculty-shell'
import { SubjectGrid } from '@/components/faculty/subject-grid'
import { SubjectForm } from '@/components/faculty/subject-form'
import { CountdownBadge } from '@/components/faculty/countdown-badge'
import { listFacultySubjects, listUpcomingDeadlines, listUpcomingExams, getDashboardStats, listAllTopicsProgress } from '@/lib/faculty/queries'
import type { DashboardStats, TopicProgress } from '@/lib/faculty/queries'
import type { FacultySubject, FacultyDeadline } from '@/lib/faculty/types'

export const Route = createFileRoute('/faculty/')({
  component: FacultyDashboard,
})

function FacultyDashboard() {
  const [subjects, setSubjects] = useState<FacultySubject[]>([])
  const [deadlines, setDeadlines] = useState<FacultyDeadline[]>([])
  const [exams, setExams] = useState<FacultyDeadline[]>([])
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [topicsProgress, setTopicsProgress] = useState<Record<string, TopicProgress>>({})
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<FacultySubject | null>(null)

  useEffect(() => {
    Promise.all([listFacultySubjects(), listUpcomingDeadlines(5), listUpcomingExams(30), getDashboardStats(), listAllTopicsProgress()])
      .then(([s, d, ex, st, tp]) => {
        setSubjects(s)
        setDeadlines(d)
        setExams(ex)
        setStats(st)
        setTopicsProgress(tp)
      })
      .catch(() => toast.error('Error al cargar materias'))
      .finally(() => setLoading(false))
  }, [])

  function openCreate() {
    setEditing(null)
    setFormOpen(true)
  }

  function openEdit(s: FacultySubject) {
    setEditing(s)
    setFormOpen(true)
  }

  function handleCreated(s: FacultySubject) {
    setSubjects((prev) => [s, ...prev])
  }

  function handleUpdated(s: FacultySubject) {
    setSubjects((prev) => prev.map((x) => (x.id === s.id ? s : x)))
    setEditing(null)
  }

  function handleDeleted(id: string) {
    setSubjects((prev) => prev.filter((s) => s.id !== id))
  }

  return (
    <FacultyShell
      title="Materias"
      subtitle="Apuntes, deadlines y progreso por materia."
    >
      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-10">
        <StatCard
          icon={<BookOpen className="size-4" />}
          label="Cursando"
          value={loading ? '—' : String(stats?.cursando ?? 0)}
          tone="blue"
        />
        <StatCard
          icon={<CalendarClock className="size-4" />}
          label="Esta semana"
          value={loading ? '—' : String(stats?.thisWeek ?? 0)}
          sub="deadlines"
          tone="orange"
        />
        <StatCard
          icon={<Star className="size-4" />}
          label="Promedio"
          value={loading || stats?.avgGrade == null ? '—' : String(stats.avgGrade)}
          sub={stats?.avgGrade != null ? '/ 10' : undefined}
          tone="green"
        />
      </div>

      <div className="grid gap-10 lg:grid-cols-[1fr_280px]">
        <section>
          {loading ? (
            <p className="text-xs text-muted-foreground">Cargando…</p>
          ) : (
            <SubjectGrid
              subjects={subjects}
              topicsProgress={topicsProgress}
              onNew={openCreate}
              onEdit={openEdit}
              onDeleted={handleDeleted}
            />
          )}
        </section>

        <aside className="space-y-7">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-medium flex items-center gap-1.5">
                <CalendarClock className="size-3 text-muted-foreground/70" />
                Próximos deadlines
              </h2>
              {deadlines.length > 0 && (
                <span className="text-[10px] text-muted-foreground/60 tabular-nums">{deadlines.length}</span>
              )}
            </div>
            {loading ? (
              <p className="text-xs text-muted-foreground">Cargando…</p>
            ) : deadlines.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border/70 p-4 text-center">
                <p className="text-xs text-muted-foreground">Sin deadlines próximos.</p>
              </div>
            ) : (
              <ul className="space-y-2">
                {deadlines.map((d) => (
                  <DeadlineCard key={d.id} deadline={d} subjects={subjects} />
                ))}
              </ul>
            )}
          </div>

          {!loading && exams.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-medium flex items-center gap-1.5">
                  <GraduationCap className="size-3 text-muted-foreground/70" />
                  Parciales / finales · 30d
                </h2>
                <span className="text-[10px] text-muted-foreground/60 tabular-nums">{exams.length}</span>
              </div>
              <ul className="space-y-2">
                {exams.map((d) => (
                  <ExamCard key={d.id} deadline={d} subjects={subjects} />
                ))}
              </ul>
            </div>
          )}
        </aside>
      </div>

      {/* {!loading && <GradesChart data={gradesBySemester} />} */}

      <SubjectForm
        open={formOpen}
        onOpenChange={(v) => {
          setFormOpen(v)
          if (!v) setEditing(null)
        }}
        initial={editing}
        onCreated={handleCreated}
        onUpdated={handleUpdated}
      />
    </FacultyShell>
  )
}

const STAT_TONE: Record<string, { hover: string; icon: string; glow: string }> = {
  blue: { hover: 'hover:ring-1 hover:ring-blue-500/20', icon: 'bg-blue-500/10 text-blue-400', glow: 'from-blue-500/[0.06]' },
  orange: { hover: 'hover:ring-1 hover:ring-orange-500/20', icon: 'bg-orange-500/10 text-orange-400', glow: 'from-orange-500/[0.06]' },
  green: { hover: 'hover:ring-1 hover:ring-green-500/20', icon: 'bg-green-500/10 text-green-400', glow: 'from-green-500/[0.06]' },
}

function StatCard({
  icon,
  label,
  value,
  sub,
  tone = 'blue',
}: {
  icon: React.ReactNode
  label: string
  value: string
  sub?: string
  tone?: 'blue' | 'orange' | 'green'
}) {
  const t = STAT_TONE[tone]
  return (
    <div className={cn(
      'group relative overflow-hidden rounded-xl border border-border/70 bg-card/40 p-5',
      'transition-all duration-300 hover:border-border hover:bg-card/70',
      t.hover,
    )}>
      <div className={cn('absolute inset-0 bg-gradient-to-br to-transparent opacity-60 pointer-events-none', t.glow)} />
      <div className="relative flex items-start gap-3">
        <div className={cn('flex size-9 items-center justify-center rounded-lg shrink-0', t.icon)}>
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground/80 font-medium">{label}</p>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-3xl font-semibold tabular-nums tracking-tight">{value}</span>
            {sub && <span className="text-xs text-muted-foreground">{sub}</span>}
          </div>
        </div>
      </div>
    </div>
  )
}

const EXAM_KIND_BADGE: Record<string, string> = {
  parcial: 'bg-red-500/10 text-red-600 border-red-200 dark:border-red-800',
  final: 'bg-rose-500/10 text-rose-700 border-rose-200 dark:border-rose-800',
  recuperatorio: 'bg-yellow-500/10 text-yellow-700 border-yellow-200 dark:border-yellow-800',
}

const EXAM_KIND_LABEL: Record<string, string> = {
  parcial: 'Parcial',
  final: 'Final',
  recuperatorio: 'Recup.',
}

function urgencyDot(dueAt: string, done: boolean): string {
  if (done) return 'bg-green-500/70'
  const due = new Date(dueAt); due.setHours(0, 0, 0, 0)
  const now = new Date(); now.setHours(0, 0, 0, 0)
  const diff = Math.ceil((due.getTime() - now.getTime()) / 86400000)
  if (diff < 0) return 'bg-destructive'
  if (diff <= 1) return 'bg-orange-500'
  if (diff <= 7) return 'bg-yellow-500'
  return 'bg-muted-foreground/40'
}

function DeadlineCard({
  deadline,
  subjects,
}: {
  deadline: FacultyDeadline
  subjects: FacultySubject[]
}) {
  const subject = subjects.find((s) => s.id === deadline.subject_id)
  const due = new Date(deadline.due_at)

  return (
    <li className="group relative rounded-lg border border-border/70 bg-card/40 hover:bg-card/70 hover:border-border transition-all p-3">
      <div className="flex items-start gap-2.5">
        <span className={cn('mt-1.5 size-2 rounded-full shrink-0 ring-2 ring-background', urgencyDot(deadline.due_at, deadline.done))} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-medium truncate">{deadline.title}</span>
            <CountdownBadge dueAt={deadline.due_at} done={deadline.done} />
          </div>
          {subject && (
            <p className="text-[11px] text-muted-foreground mt-0.5 truncate" style={subject.color ? { color: subject.color } : undefined}>
              {subject.name}
            </p>
          )}
          <p className="text-[10px] text-muted-foreground/60 mt-1 tabular-nums">
            {due.toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })}
          </p>
        </div>
      </div>
    </li>
  )
}

function ExamCard({
  deadline,
  subjects,
}: {
  deadline: FacultyDeadline
  subjects: FacultySubject[]
}) {
  const subject = subjects.find((s) => s.id === deadline.subject_id)
  const due = new Date(deadline.due_at)

  return (
    <li className="group relative rounded-lg border border-border/70 bg-card/40 hover:bg-card/70 hover:border-border transition-all p-3 overflow-hidden">
      <span className={cn('absolute left-0 top-0 bottom-0 w-1', urgencyDot(deadline.due_at, deadline.done))} />
      <div className="pl-1.5">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 min-w-0">
            <Badge
              variant="outline"
              className={`text-[9px] uppercase tracking-wide shrink-0 ${EXAM_KIND_BADGE[deadline.kind] ?? ''}`}
            >
              {EXAM_KIND_LABEL[deadline.kind] ?? deadline.kind}
            </Badge>
            <span className="text-sm font-medium truncate">{deadline.title}</span>
          </div>
          <CountdownBadge dueAt={deadline.due_at} done={deadline.done} />
        </div>
        {subject && (
          <p className="text-[11px] text-muted-foreground mt-0.5 truncate" style={subject.color ? { color: subject.color } : undefined}>
            {subject.name}
          </p>
        )}
        <p className="text-[10px] text-muted-foreground/60 mt-1 tabular-nums">
          {due.toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })}
        </p>
      </div>
    </li>
  )
}
