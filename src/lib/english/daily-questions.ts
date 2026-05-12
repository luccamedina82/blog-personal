export type DailyQuestionTone = 'casual' | 'formal' | 'technical'

export type DailyQuestion = {
  id: string
  user_id: string
  question: string
  tone: DailyQuestionTone
  model: string
  created_at: string
}

export type DailyQuestionScore = { metric: string; value: number; feedback: string }

export type DailyQuestionAnswer = {
  id: string
  user_id: string
  question_id: string
  answer_text: string
  scores: DailyQuestionScore[] | null
  overall: number | null
  corrected_text: string | null
  suggestions: string[]
  created_at: string
}

export type DailyQuestionWithAnswer = DailyQuestion & { answer: DailyQuestionAnswer | null }

export type ReviewResultPayload = {
  scores: DailyQuestionScore[]
  overall: number
  suggestions: string[]
  corrected_text: string
}
