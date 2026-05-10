import type { DevLabBlock } from '@/lib/devlab/types'

export type FacultySubjectStatus = 'cursando' | 'final-pendiente' | 'aprobada' | 'recursar'
export type FacultyTopicStatus = 'pendiente' | 'visto' | 'dominado'
export type FacultyNoteKind = 'clase' | 'apunte' | 'tp' | 'parcial' | 'final' | 'resumen'
export type FacultyDeadlineKind = 'tp' | 'parcial' | 'final' | 'recuperatorio' | 'entrega'
export type FacultyTopicCitationKind = 'faculty_note' | 'devlab_post' | 'library_book'

export type FacultySubject = {
  id: string
  user_id: string
  name: string
  code: string | null
  status: FacultySubjectStatus
  semester: string | null
  professor: string | null
  credits: number | null
  color: string | null
  created_at: string
}

export type FacultyTopicGroup = {
  id: string
  user_id: string
  subject_id: string
  title: string
  order_index: number
  deadline_id: string | null
  created_at: string
}

export type FacultyTopicUnit = {
  id: string
  user_id: string
  subject_id: string
  group_id: string
  title: string
  order_index: number
  created_at: string
}

export type FacultyTopic = {
  id: string
  user_id: string
  subject_id: string
  unit_id: string | null
  title: string
  order_index: number
  status: FacultyTopicStatus
  created_at: string
}

export type FacultyNote = {
  id: string
  user_id: string
  subject_id: string
  topic_id: string | null
  kind: FacultyNoteKind
  title: string
  date: string | null
  blocks: DevLabBlock[]
  tags: string[]
  grade: number | null
  created_at: string
}

export type FacultyDeadline = {
  id: string
  user_id: string
  subject_id: string
  kind: FacultyDeadlineKind
  title: string
  due_at: string
  done: boolean
  note: string | null
  grade: number | null
  note_id: string | null
  created_at: string
}

export type FacultyTopicCitation = {
  id: string
  user_id: string
  topic_id: string
  source_kind: FacultyTopicCitationKind
  source_id: string
  source_title: string | null
  source_storage_path: string | null
  page: number | null
  note: string | null
  order_index: number
  created_at: string
}

export type Quiz = {
  id: string
  user_id: string
  subject_id: string | null
  title: string
  source_note_ids: string[]
  model: string
  created_at: string
}

export type QuizQuestion = {
  id: string
  user_id: string
  quiz_id: string
  order_index: number
  question: string
  type: 'multiple_choice' | 'true_false' | 'open'
  options: string[] | null
  answer: string
  explanation: string | null
}

export type QuizAttempt = {
  id: string
  user_id: string
  quiz_id: string
  question_id: string
  user_answer: string | null
  correct: boolean | null
  created_at: string
}
