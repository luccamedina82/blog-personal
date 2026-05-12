import { supabase } from '@/lib/supabase'
import type { Quiz, QuizQuestion } from './types'

async function getUid(): Promise<string> {
  const { data } = await supabase.auth.getSession()
  const uid = data.session?.user?.id
  if (!uid) throw new Error('Not authenticated')
  return uid
}

export type QuizWithCount = Quiz & { questionCount: number }
export type QuizWithSubject = QuizWithCount & { subject_name: string | null }

export async function listAllQuizzes(): Promise<QuizWithSubject[]> {
  const uid = await getUid()
  const { data, error } = await supabase
    .from('quizzes')
    .select('*, quiz_questions(id), faculty_subjects(name)')
    .eq('user_id', uid)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []).map((q: Record<string, unknown>) => {
    const questions = (q.quiz_questions as { id: string }[] | null) ?? []
    const subject = q.faculty_subjects as { name: string } | null
    const { quiz_questions: _qqs, faculty_subjects: _fs, ...rest } = q
    return {
      ...(rest as Quiz),
      questionCount: questions.length,
      subject_name: subject?.name ?? null,
    }
  })
}

export async function listQuizzes(subjectId: string): Promise<QuizWithCount[]> {
  const uid = await getUid()
  const { data, error } = await supabase
    .from('quizzes')
    .select('*, quiz_questions(id)')
    .eq('subject_id', subjectId)
    .eq('user_id', uid)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []).map((q: Record<string, unknown>) => {
    const questions = (q.quiz_questions as { id: string }[] | null) ?? []
    const { quiz_questions: _qqs, ...rest } = q
    return { ...(rest as Quiz), questionCount: questions.length }
  })
}

export async function getQuiz(id: string): Promise<{ quiz: Quiz; questions: QuizQuestion[] }> {
  const uid = await getUid()
  const { data, error } = await supabase
    .from('quizzes')
    .select('*, quiz_questions(*)')
    .eq('id', id)
    .eq('user_id', uid)
    .single()
  if (error) throw error
  const { quiz_questions, ...rest } = data as Record<string, unknown>
  const questions = (quiz_questions as QuizQuestion[]).sort((a, b) => a.order_index - b.order_index)
  return { quiz: rest as Quiz, questions }
}

export async function createQuiz(
  subjectId: string | null,
  title: string,
  sourceNoteIds: string[],
  model: string,
  questions: Array<{
    order_index: number
    question: string
    type: 'multiple_choice' | 'true_false' | 'open'
    options: string[] | null
    answer: string
    explanation: string | null
  }>,
): Promise<Quiz> {
  const uid = await getUid()
  const { data: quiz, error: qErr } = await supabase
    .from('quizzes')
    .insert({ user_id: uid, subject_id: subjectId, title, source_note_ids: sourceNoteIds, model })
    .select()
    .single()
  if (qErr) throw qErr
  const rows = questions.map((q) => ({ user_id: uid, quiz_id: (quiz as Quiz).id, ...q }))
  const { error: questErr } = await supabase.from('quiz_questions').insert(rows)
  if (questErr) throw questErr
  return quiz as Quiz
}

export async function deleteQuiz(id: string): Promise<void> {
  const uid = await getUid()
  const { error } = await supabase.from('quizzes').delete().eq('id', id).eq('user_id', uid)
  if (error) throw error
}

export async function submitAttempts(
  quizId: string,
  attempts: Array<{ questionId: string; userAnswer: string | null; correct: boolean }>,
): Promise<void> {
  if (attempts.length === 0) return
  const uid = await getUid()
  const rows = attempts.map((a) => ({
    user_id: uid,
    quiz_id: quizId,
    question_id: a.questionId,
    user_answer: a.userAnswer,
    correct: a.correct,
  }))
  const { error } = await supabase.from('quiz_attempts').insert(rows)
  if (error) throw error
}
