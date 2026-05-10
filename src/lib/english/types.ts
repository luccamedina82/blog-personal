export type Deck = {
  id: string
  user_id: string
  name: string
  category: 'vocab' | 'phrasal' | 'idioms' | 'book-quotes' | 'tech-notes'
  description: string | null
  created_at: string
}

export type Card = {
  id: string
  user_id: string
  deck_id: string
  front: string
  back: string
  tags: string[]
  ease: number
  interval_days: number
  due: string
  reviews: number
  source_kind: 'evaluator' | 'devlab' | 'bitacora' | 'book' | null
  source_ref: string | null
  created_at: string
}

export type VocabEntry = {
  id: string
  user_id: string
  kind: 'word' | 'phrase' | 'connector'
  term: string
  meaning: string
  example: string | null
  tags: string[]
  created_at: string
}

export type EvaluatorRun = {
  id: string
  user_id: string
  source: 'paste' | 'devlab' | 'bitacora'
  source_ref: string | null
  input_text: string
  scores: Array<{ metric: string; value: number; feedback?: string }>
  suggestions: string[]
  corrected_text: string | null
  created_at: string
}

export type ShadowingCategory = {
  id: string
  user_id: string
  name: string
  description: string | null
  created_at: string
}

export type ShadowingSession = {
  id: string
  user_id: string
  title: string
  storage_path: string
  kind: 'audio' | 'video'
  duration_seconds: number | null
  transcript: Array<{ start: number; end: number; text: string }>
  notes: string
  quality: 'mastered' | 'review' | 'needs-work' | null
  category_id: string | null
  created_at: string
}

export type Book = {
  id: string
  user_id: string
  title: string
  author: string | null
  rating: number | null
  summary: string | null
  tags: string[]
  created_at: string
}

export type BookAnnotation = {
  id: string
  user_id: string
  book_id: string
  kind: 'quote' | 'note' | 'highlight'
  content: string
  page: number | null
  created_at: string
}

export type DailyTip = {
  id: string
  kind: 'word' | 'phrase' | 'idiom' | 'connector'
  term: string
  meaning: string
  example: string
  register: 'casual' | 'neutral' | 'formal'
  source?: string
}
