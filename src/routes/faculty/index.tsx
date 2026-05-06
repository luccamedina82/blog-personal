import { createFileRoute } from '@tanstack/react-router'
import React, { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { BookOpen, CalendarClock, GraduationCap, Star } from 'lucide-react'
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
      <div className="grid grid-cols-3 gap-3 mb-8">
        <StatCard
          icon={<BookOpen className="size-4" />}
          label="Cursando"
          value={loading ? '—' : String(stats?.cursando ?? 0)}
        />
        <StatCard
          icon={<CalendarClock className="size-4" />}
          label="Esta semana"
          value={loading ? '—' : String(stats?.thisWeek ?? 0)}
          sub="deadlines"
        />
        <StatCard
          icon={<Star className="size-4" />}
          label="Promedio"
          value={loading || stats?.avgGrade == null ? '—' : String(stats.avgGrade)}
          sub={stats?.avgGrade != null ? '/ 10' : undefined}
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

        <aside className="space-y-6">
          <div className="space-y-3">
            <h2 className="text-sm font-medium">Próximos deadlines</h2>
            {loading ? (
              <p className="text-xs text-muted-foreground">Cargando…</p>
            ) : deadlines.length === 0 ? (
              <div className="rounded-md border border-dashed border-border p-4 text-center">
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
              <h2 className="text-sm font-medium flex items-center gap-1.5">
                <GraduationCap className="size-3.5 text-muted-foreground" />
                Parciales / finales (30 días)
              </h2>
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

function StatCard({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode
  label: string
  value: string
  sub?: string
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4 flex flex-col gap-2">
      <div className="flex items-center gap-1.5 text-muted-foreground">
        {icon}
        <span className="text-[11px] uppercase tracking-[0.14em]">{label}</span>
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-2xl font-semibold tabular-nums">{value}</span>
        {sub && <span className="text-xs text-muted-foreground">{sub}</span>}
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
    <li className="rounded-md border border-border bg-card p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium truncate">{deadline.title}</span>
        <CountdownBadge dueAt={deadline.due_at} done={deadline.done} />
      </div>
      {subject && (
        <p className="text-[11px] text-muted-foreground mt-0.5">{subject.name}</p>
      )}
      <p className="text-[10px] text-muted-foreground/60 mt-1 tabular-nums">
        {due.toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })}
      </p>
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
    <li className="rounded-md border border-border bg-card p-3">
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
        <p className="text-[11px] text-muted-foreground mt-0.5">{subject.name}</p>
      )}
      <p className="text-[10px] text-muted-foreground/60 mt-1 tabular-nums">
        {due.toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })}
      </p>
    </li>
  )
}
