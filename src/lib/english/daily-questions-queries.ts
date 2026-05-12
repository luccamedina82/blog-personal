import { supabase } from '@/lib/supabase'
import type {
  DailyQuestion,
  DailyQuestionAnswer,
  DailyQuestionTone,
  DailyQuestionWithAnswer,
  ReviewResultPayload,
} from './daily-questions'

async function getUid(): Promise<string> {
  const { data } = await supabase.auth.getSession()
  const uid = data.session?.user?.id
  if (!uid) throw new Error('Not authenticated')
  return uid
}

export async function createDailyQuestion(
  question: string,
  tone: DailyQuestionTone,
  model: string,
): Promise<DailyQuestion> {
  const uid = await getUid()
  const { data, error } = await supabase
    .from('daily_questions')
    .insert({ user_id: uid, question, tone, model })
    .select()
    .single()
  if (error) throw error
  return data as DailyQuestion
}

export async function submitDailyAnswer(
  questionId: string,
  answerText: string,
  review: ReviewResultPayload,
): Promise<DailyQuestionAnswer> {
  const uid = await getUid()
  const normalizedScores = (review.scores ?? []).map((s) => ({
    metric: String(s.metric ?? ''),
    value: Math.max(0, Math.min(100, Math.round(Number(s.value) || 0))),
    feedback: String(s.feedback ?? ''),
  }))
  const payload = {
    user_id: uid,
    question_id: questionId,
    answer_text: answerText,
    scores: normalizedScores,
    overall: Math.max(0, Math.min(100, Math.round(Number(review.overall) || 0))),
    corrected_text: review.corrected_text ?? null,
    suggestions: Array.isArray(review.suggestions) ? review.suggestions.map(String) : [],
  }
  const { data, error } = await supabase
    .from('daily_question_answers')
    .insert(payload)
    .select()
    .single()
  if (error) {
    console.error('[daily] insert error:', error, 'payload:', payload)
    throw error
  }
  return data as DailyQuestionAnswer
}

export async function listDailyQuestions(
  limit = 30,
  offset = 0,
): Promise<DailyQuestionWithAnswer[]> {
  const uid = await getUid()
  const { data: questions, error: qErr } = await supabase
    .from('daily_questions')
    .select('*')
    .eq('user_id', uid)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)
  if (qErr) throw qErr
  const list = (questions ?? []) as DailyQuestion[]
  if (list.length === 0) return []

  const questionIds = list.map((q) => q.id)
  const { data: answers, error: aErr } = await supabase
    .from('daily_question_answers')
    .select('*')
    .in('question_id', questionIds)
  if (aErr) throw aErr

  const answerMap = new Map<string, DailyQuestionAnswer>()
  for (const a of (answers ?? []) as DailyQuestionAnswer[]) {
    answerMap.set(a.question_id, a)
  }
  return list.map((q) => ({ ...q, answer: answerMap.get(q.id) ?? null }))
}

export async function deleteDailyQuestion(id: string): Promise<void> {
  const uid = await getUid()
  const { error } = await supabase
    .from('daily_questions')
    .delete()
    .eq('id', id)
    .eq('user_id', uid)
  if (error) throw error
}
