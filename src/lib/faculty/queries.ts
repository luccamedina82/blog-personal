import { supabase } from '@/lib/supabase'
import type { DevLabBlock } from '@/lib/devlab/types'
import type {
  FacultySubject,
  FacultyTopic,
  FacultyNote,
  FacultyDeadline,
} from './types'

async function getUid(): Promise<string> {
  const { data } = await supabase.auth.getSession()
  const uid = data.session?.user?.id
  if (!uid) throw new Error('Not authenticated')
  return uid
}

function normalizeNote(row: Record<string, unknown>): FacultyNote {
  return { ...(row as FacultyNote), blocks: (row.blocks as DevLabBlock[]) ?? [] }
}

// ── Subjects ───────────────────────────────────────────────────────────────

export type SubjectPayload = Pick<
  FacultySubject,
  'name' | 'code' | 'status' | 'semester' | 'professor' | 'credits' | 'color'
>

export async function listFacultySubjects(): Promise<FacultySubject[]> {
  const { data, error } = await supabase
    .from('faculty_subjects')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function getFacultySubject(id: string): Promise<FacultySubject> {
  const { data, error } = await supabase
    .from('faculty_subjects')
    .select('*')
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

export async function createFacultySubject(payload: SubjectPayload): Promise<FacultySubject> {
  const user_id = await getUid()
  const { data, error } = await supabase
    .from('faculty_subjects')
    .insert({ ...payload, user_id })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateFacultySubject(
  id: string,
  payload: Partial<SubjectPayload>,
): Promise<void> {
  const { error } = await supabase.from('faculty_subjects').update(payload).eq('id', id)
  if (error) throw error
}

export async function deleteFacultySubject(id: string): Promise<void> {
  const { error } = await supabase.from('faculty_subjects').delete().eq('id', id)
  if (error) throw error
}

// ── Topics ─────────────────────────────────────────────────────────────────

export type TopicPayload = Pick<
  FacultyTopic,
  'subject_id' | 'title' | 'order_index' | 'status'
>

export async function listFacultyTopics(subjectId: string): Promise<FacultyTopic[]> {
  const { data, error } = await supabase
    .from('faculty_topics')
    .select('*')
    .eq('subject_id', subjectId)
    .order('order_index', { ascending: true })
  if (error) throw error
  return data
}

export async function createFacultyTopic(payload: TopicPayload): Promise<FacultyTopic> {
  const user_id = await getUid()
  const { data, error } = await supabase
    .from('faculty_topics')
    .insert({ ...payload, user_id })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateFacultyTopic(
  id: string,
  payload: Partial<TopicPayload>,
): Promise<void> {
  const { error } = await supabase.from('faculty_topics').update(payload).eq('id', id)
  if (error) throw error
}

export async function deleteFacultyTopic(id: string): Promise<void> {
  const { error } = await supabase.from('faculty_topics').delete().eq('id', id)
  if (error) throw error
}

// ── Notes ──────────────────────────────────────────────────────────────────

export type NotePayload = {
  subject_id: string
  topic_id: string | null
  kind: FacultyNote['kind']
  title: string
  date: string | null
  blocks: DevLabBlock[]
  tags: string[]
  grade: number | null
}

export async function listFacultyNotes(subjectId: string): Promise<FacultyNote[]> {
  const { data, error } = await supabase
    .from('faculty_notes')
    .select('*')
    .eq('subject_id', subjectId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data.map(normalizeNote)
}

export async function getFacultyNote(id: string): Promise<FacultyNote> {
  const { data, error } = await supabase
    .from('faculty_notes')
    .select('*')
    .eq('id', id)
    .single()
  if (error) throw error
  return normalizeNote(data)
}

export async function createFacultyNote(payload: NotePayload): Promise<FacultyNote> {
  const user_id = await getUid()
  const { data, error } = await supabase
    .from('faculty_notes')
    .insert({ ...payload, user_id })
    .select()
    .single()
  if (error) throw error
  return normalizeNote(data)
}

export async function updateFacultyNote(
  id: string,
  payload: Partial<NotePayload>,
): Promise<void> {
  const { error } = await supabase.from('faculty_notes').update(payload).eq('id', id)
  if (error) throw error
}

export async function deleteFacultyNote(id: string): Promise<void> {
  const { error } = await supabase.from('faculty_notes').delete().eq('id', id)
  if (error) throw error
}

// ── Deadlines ──────────────────────────────────────────────────────────────

export type DeadlinePayload = Pick<
  FacultyDeadline,
  'subject_id' | 'kind' | 'title' | 'due_at' | 'done' | 'note'
>

export async function listFacultyDeadlines(subjectId?: string): Promise<FacultyDeadline[]> {
  let query = supabase
    .from('faculty_deadlines')
    .select('*')
    .order('due_at', { ascending: true })
  if (subjectId) query = query.eq('subject_id', subjectId)
  const { data, error } = await query
  if (error) throw error
  return data
}

export async function listUpcomingDeadlines(limit = 5): Promise<FacultyDeadline[]> {
  const { data, error } = await supabase
    .from('faculty_deadlines')
    .select('*')
    .eq('done', false)
    .order('due_at', { ascending: true })
    .limit(limit)
  if (error) throw error
  return data
}

export async function createFacultyDeadline(payload: DeadlinePayload): Promise<FacultyDeadline> {
  const user_id = await getUid()
  const { data, error } = await supabase
    .from('faculty_deadlines')
    .insert({ ...payload, user_id })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateFacultyDeadline(
  id: string,
  payload: Partial<DeadlinePayload>,
): Promise<void> {
  const { error } = await supabase.from('faculty_deadlines').update(payload).eq('id', id)
  if (error) throw error
}

export async function deleteFacultyDeadline(id: string): Promise<void> {
  const { error } = await supabase.from('faculty_deadlines').delete().eq('id', id)
  if (error) throw error
}

// ── Topics progress (all subjects) ────────────────────────────────────────

export type TopicProgress = { dominado: number; total: number }

export async function listAllTopicsProgress(): Promise<Record<string, TopicProgress>> {
  const { data, error } = await supabase
    .from('faculty_topics')
    .select('subject_id, status')
  if (error) throw error
  const result: Record<string, TopicProgress> = {}
  for (const row of data as { subject_id: string; status: string }[]) {
    if (!result[row.subject_id]) result[row.subject_id] = { dominado: 0, total: 0 }
    result[row.subject_id].total++
    if (row.status === 'dominado') result[row.subject_id].dominado++
  }
  return result
}

// ── Dashboard stats ────────────────────────────────────────────────────────

export type DashboardStats = {
  cursando: number
  thisWeek: number
  avgGrade: number | null
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const now = new Date()
  const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

  const [subjectsRes, deadlinesRes, gradesRes] = await Promise.all([
    supabase
      .from('faculty_subjects')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'cursando'),
    supabase
      .from('faculty_deadlines')
      .select('id', { count: 'exact', head: true })
      .eq('done', false)
      .gte('due_at', now.toISOString())
      .lte('due_at', nextWeek.toISOString()),
    supabase.from('faculty_notes').select('grade').not('grade', 'is', null),
  ])

  if (subjectsRes.error) throw subjectsRes.error
  if (deadlinesRes.error) throw deadlinesRes.error
  if (gradesRes.error) throw gradesRes.error

  const grades = (gradesRes.data as { grade: number }[]).map((r) => r.grade)
  const avgGrade =
    grades.length > 0 ? Math.round((grades.reduce((a, b) => a + b, 0) / grades.length) * 10) / 10 : null

  return {
    cursando: subjectsRes.count ?? 0,
    thisWeek: deadlinesRes.count ?? 0,
    avgGrade,
  }
}
