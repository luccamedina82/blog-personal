import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
} from 'recharts'
import type { GradesBySemester } from '@/lib/faculty/queries'

type Props = { data: GradesBySemester }

function barFill(avg: number) {
  if (avg >= 7) return 'hsl(142 76% 36%)'
  if (avg >= 4) return 'hsl(48 96% 40%)'
  return 'hsl(0 84% 60%)'
}

export function GradesChart({ data }: Props) {
  if (data.length === 0) return null

  return (
    <section className="mt-8">
      <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-3">
        Promedio por semestre
      </p>
      <div className="rounded-lg border border-border/70 bg-card/40 p-5">
        <div className="h-[180px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
              <CartesianGrid
                stroke="var(--border)"
                strokeDasharray="2 3"
                vertical={false}
              />
              <XAxis
                dataKey="semester"
                tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                domain={[0, 10]}
                ticks={[0, 2, 4, 6, 8, 10]}
                tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  background: 'var(--card)',
                  border: '1px solid var(--border)',
                  borderRadius: '6px',
                  fontSize: '12px',
                  color: 'var(--foreground)',
                }}
                labelStyle={{ color: 'var(--muted-foreground)', marginBottom: 4 }}
                formatter={(val: number, _: string, props: { payload?: GradesBySemester[number] }) => [
                  `${val} / 10  (${props.payload?.count ?? 0} eval.)`,
                  'Promedio',
                ]}
              />
              <Bar dataKey="avg" radius={[4, 4, 0, 0]}>
                {data.map((entry, i) => (
                  <Cell key={i} fill={barFill(entry.avg)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </section>
  )
}
