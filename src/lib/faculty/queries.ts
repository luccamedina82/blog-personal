import { supabase } from '@/lib/supabase'
import type { DevLabBlock } from '@/lib/devlab/types'
import type {
  FacultySubject,
  FacultyTopicGroup,
  FacultyTopicUnit,
  FacultyTopic,
  FacultyNote,
  FacultyDeadline,
  FacultyTopicCitation,
  FacultyTopicCitationKind,
  FacultyDeadlineKind,
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

export type TopicPayload = Pick<FacultyTopic, 'subject_id' | 'title' | 'order_index' | 'status'> & {
  unit_id?: string | null
}

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

// ── Topic Groups ───────────────────────────────────────────────────────────

export type TopicGroupPayload = Pick<FacultyTopicGroup, 'subject_id' | 'title' | 'order_index'>

export async function listFacultyTopicGroups(subjectId: string): Promise<FacultyTopicGroup[]> {
  const { data, error } = await supabase
    .from('faculty_topic_groups')
    .select('*')
    .eq('subject_id', subjectId)
    .order('order_index', { ascending: true })
  if (error) throw error
  return data
}

export async function createFacultyTopicGroup(payload: TopicGroupPayload): Promise<FacultyTopicGroup> {
  const user_id = await getUid()
  const { data, error } = await supabase
    .from('faculty_topic_groups')
    .insert({ ...payload, user_id })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateFacultyTopicGroup(
  id: string,
  payload: Partial<TopicGroupPayload>,
): Promise<void> {
  const { error } = await supabase.from('faculty_topic_groups').update(payload).eq('id', id)
  if (error) throw error
}

export async function deleteFacultyTopicGroup(id: string): Promise<void> {
  const { error } = await supabase.from('faculty_topic_groups').delete().eq('id', id)
  if (error) throw error
}

// ── Topic Units ────────────────────────────────────────────────────────────

export type TopicUnitPayload = Pick<FacultyTopicUnit, 'subject_id' | 'group_id' | 'title' | 'order_index'>

export async function listFacultyTopicUnits(subjectId: string): Promise<FacultyTopicUnit[]> {
  const { data, error } = await supabase
    .from('faculty_topic_units')
    .select('*')
    .eq('subject_id', subjectId)
    .order('order_index', { ascending: true })
  if (error) throw error
  return data
}

export async function createFacultyTopicUnit(payload: TopicUnitPayload): Promise<FacultyTopicUnit> {
  const user_id = await getUid()
  const { data, error } = await supabase
    .from('faculty_topic_units')
    .insert({ ...payload, user_id })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateFacultyTopicUnit(
  id: string,
  payload: Partial<TopicUnitPayload>,
): Promise<void> {
  const { error } = await supabase.from('faculty_topic_units').update(payload).eq('id', id)
  if (error) throw error
}

export async function deleteFacultyTopicUnit(id: string): Promise<void> {
  const { error } = await supabase.from('faculty_topic_units').delete().eq('id', id)
  if (error) throw error
}

// ── Structured topics helper ───────────────────────────────────────────────

export type StructuredTopics = {
  groups: Array<{
    group: FacultyTopicGroup
    units: Array<{ unit: FacultyTopicUnit; topics: FacultyTopic[] }>
  }>
  unclassified: FacultyTopic[]
}

export async function listTopicsStructured(subjectId: string): Promise<StructuredTopics> {
  const [groups, units, topics] = await Promise.all([
    listFacultyTopicGroups(subjectId),
    listFacultyTopicUnits(subjectId),
    listFacultyTopics(subjectId),
  ])
  return {
    groups: groups.map((group) => ({
      group,
      units: units
        .filter((u) => u.group_id === group.id)
        .map((unit) => ({ unit, topics: topics.filter((t) => t.unit_id === unit.id) })),
    })),
    unclassified: topics.filter((t) => !t.unit_id),
  }
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

  const [subjectsRes, deadlinesRes, aprobadasRes] = await Promise.all([
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
    supabase.from('faculty_subjects').select('id').eq('status', 'aprobada'),
  ])

  if (subjectsRes.error) throw subjectsRes.error
  if (deadlinesRes.error) throw deadlinesRes.error
  if (aprobadasRes.error) throw aprobadasRes.error

  const aprobadasIds = (aprobadasRes.data as { id: string }[]).map((r) => r.id)

  let avgGrade: number | null = null
  if (aprobadasIds.length > 0) {
    const { data: gradesData, error: gradesError } = await supabase
      .from('faculty_deadlines')
      .select('grade')
      .in('subject_id', aprobadasIds)
      .not('grade', 'is', null)
    if (gradesError) throw gradesError
    const grades = (gradesData as { grade: number }[]).map((r) => r.grade)
    if (grades.length > 0) {
      avgGrade = Math.round((grades.reduce((a, b) => a + b, 0) / grades.length) * 10) / 10
    }
  }

  return {
    cursando: subjectsRes.count ?? 0,
    thisWeek: deadlinesRes.count ?? 0,
    avgGrade,
  }
}

// ── Backlinks ──────────────────────────────────────────────────────────────

export async function listAllNotesSummary(): Promise<
  Array<{ id: string; title: string; subject_id: string; kind: FacultyNote['kind']; subject_name: string }>
> {
  const { data, error } = await supabase
    .from('faculty_notes')
    .select('id, title, subject_id, kind, faculty_subjects(name)')
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data as unknown as Array<{
    id: string; title: string; subject_id: string; kind: string
    faculty_subjects: Array<{ name: string }> | null
  }>).map((n) => ({
    id: n.id,
    title: n.title,
    subject_id: n.subject_id,
    kind: n.kind as FacultyNote['kind'],
    subject_name: (() => { const s = n.faculty_subjects; return Array.isArray(s) ? s[0]?.name ?? '' : (s as { name?: string } | null)?.name ?? '' })(),
  }))
}

export async function listNotesReferencingTitle(
  title: string,
  excludeNoteId: string,
): Promise<Array<{ id: string; title: string; subject_id: string; kind: FacultyNote['kind'] }>> {
  const needle = `[[${title}]]`
  const { data, error } = await supabase
    .from('faculty_notes')
    .select('id, title, subject_id, kind, blocks')
  if (error) throw error
  return (
    data as Array<{
      id: string
      title: string
      subject_id: string
      kind: FacultyNote['kind']
      blocks: unknown
    }>
  )
    .filter((n) => n.id !== excludeNoteId && JSON.stringify(n.blocks).includes(needle))
    .map(({ blocks: _b, ...rest }) => rest)
}

// ── Topic Citations ────────────────────────────────────────────────────────────

export type TopicCitationPayload = {
  topic_id: string
  source_kind: FacultyTopicCitationKind
  source_id: string
  source_title?: string | null
  source_storage_path?: string | null
  page?: number | null
  note?: string | null
  order_index?: number
}

export async function listTopicCitationsForSubject(
  topicIds: string[],
): Promise<FacultyTopicCitation[]> {
  if (topicIds.length === 0) return []
  const { data, error } = await supabase
    .from('faculty_topic_citations')
    .select('*')
    .in('topic_id', topicIds)
    .order('order_index', { ascending: true })
  if (error) throw error
  return data as FacultyTopicCitation[]
}

export async function addTopicCitation(
  payload: TopicCitationPayload,
): Promise<FacultyTopicCitation> {
  const user_id = await getUid()
  const { data, error } = await supabase
    .from('faculty_topic_citations')
    .insert({ ...payload, user_id })
    .select()
    .single()
  if (error) throw error
  return data as FacultyTopicCitation
}

export async function removeTopicCitation(id: string): Promise<void> {
  const { error } = await supabase.from('faculty_topic_citations').delete().eq('id', id)
  if (error) throw error
}

// ── Deadline enrichment ────────────────────────────────────────────────────────

export async function setDeadlineGrade(id: string, grade: number | null): Promise<void> {
  const { error } = await supabase.from('faculty_deadlines').update({ grade }).eq('id', id)
  if (error) throw error
}

export async function setDeadlineNoteLink(id: string, note_id: string | null): Promise<void> {
  const { error } = await supabase.from('faculty_deadlines').update({ note_id }).eq('id', id)
  if (error) throw error
}

export async function linkGroupToDeadline(
  groupId: string,
  deadlineId: string | null,
): Promise<void> {
  const { error } = await supabase
    .from('faculty_topic_groups')
    .update({ deadline_id: deadlineId })
    .eq('id', groupId)
  if (error) throw error
}

// ── Grades from deadlines ────────────────────────────────────────────────────

export type DeadlineGradeEntry = {
  id: string
  title: string
  kind: FacultyDeadlineKind
  grade: number
  due_at: string
}

export async function listDeadlineGrades(subjectId: string): Promise<DeadlineGradeEntry[]> {
  const { data, error } = await supabase
    .from('faculty_deadlines')
    .select('id, title, kind, grade, due_at')
    .eq('subject_id', subjectId)
    .not('grade', 'is', null)
    .order('due_at', { ascending: true })
  if (error) throw error
  return data as DeadlineGradeEntry[]
}

// ── Topic Citation Backlinks ──────────────────────────────────────────────────

export type TopicCitationBacklink = {
  citation_id: string
  topic_id: string
  topic_title: string
  subject_id: string
  subject_name: string
}

type RawBacklinkRow = {
  id: string
  topic_id: string
  faculty_topics:
    | { title: string; subject_id: string; faculty_subjects: { name: string } | Array<{ name: string }> | null }
    | Array<{ title: string; subject_id: string; faculty_subjects: { name: string } | Array<{ name: string }> | null }>
    | null
}

function normalizeBacklink(row: RawBacklinkRow): TopicCitationBacklink {
  const t = Array.isArray(row.faculty_topics) ? row.faculty_topics[0] : row.faculty_topics
  const s = t?.faculty_subjects
  const subjectName = Array.isArray(s) ? (s[0]?.name ?? '') : ((s as { name?: string } | null)?.name ?? '')
  return {
    citation_id: row.id,
    topic_id: row.topic_id,
    topic_title: t?.title ?? '',
    subject_id: t?.subject_id ?? '',
    subject_name: subjectName,
  }
}

export async function listTopicCitationsForBook(bookId: string): Promise<TopicCitationBacklink[]> {
  const { data, error } = await supabase
    .from('faculty_topic_citations')
    .select('id, topic_id, faculty_topics(title, subject_id, faculty_subjects(name))')
    .eq('source_kind', 'library_book')
    .eq('source_id', bookId)
  if (error) throw error
  return (data as unknown as RawBacklinkRow[]).map(normalizeBacklink)
}

export async function listTopicCitationsForNote(
  sourceKind: 'faculty_note' | 'devlab_post',
  sourceId: string,
): Promise<TopicCitationBacklink[]> {
  const { data, error } = await supabase
    .from('faculty_topic_citations')
    .select('id, topic_id, faculty_topics(title, subject_id, faculty_subjects(name))')
    .eq('source_kind', sourceKind)
    .eq('source_id', sourceId)
  if (error) throw error
  return (data as unknown as RawBacklinkRow[]).map(normalizeBacklink)
}

export async function listUpcomingExams(days = 30): Promise<FacultyDeadline[]> {
  const now = new Date()
  const future = new Date(now.getTime() + days * 24 * 60 * 60 * 1000)
  const { data, error } = await supabase
    .from('faculty_deadlines')
    .select('*')
    .in('kind', ['parcial', 'final', 'recuperatorio'])
    .eq('done', false)
    .gte('due_at', now.toISOString())
    .lte('due_at', future.toISOString())
    .order('due_at', { ascending: true })
  if (error) throw error
  return data
}

// ── Grades by semester ─────────────────────────────────────────────────────

export type GradesBySemester = Array<{ semester: string; avg: number; count: number }>

export async function getGradesBySemester(): Promise<GradesBySemester> {
  const [subjectsRes, deadlinesRes] = await Promise.all([
    supabase.from('faculty_subjects').select('id, semester'),
    supabase.from('faculty_deadlines').select('subject_id, grade').not('grade', 'is', null),
  ])
  if (subjectsRes.error) throw subjectsRes.error
  if (deadlinesRes.error) throw deadlinesRes.error

  const semesterMap = new Map(
    (subjectsRes.data as { id: string; semester: string | null }[]).map((s) => [
      s.id,
      s.semester ?? 'Sin semestre',
    ]),
  )

  const bySemester = new Map<string, number[]>()
  for (const d of deadlinesRes.data as { subject_id: string; grade: number }[]) {
    const sem = semesterMap.get(d.subject_id) ?? 'Sin semestre'
    if (!bySemester.has(sem)) bySemester.set(sem, [])
    bySemester.get(sem)!.push(d.grade)
  }

  return Array.from(bySemester.entries())
    .map(([semester, grades]) => ({
      semester,
      avg: Math.round((grades.reduce((a, b) => a + b, 0) / grades.length) * 10) / 10,
      count: grades.length,
    }))
    .sort((a, b) => a.semester.localeCompare(b.semester))
}
