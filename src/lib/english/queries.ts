import { supabase } from '@/lib/supabase'
import type { Deck, Card, VocabEntry, EvaluatorRun, ShadowingSession, ShadowingCategory, Book, BookAnnotation } from './types'

async function getUid(): Promise<string> {
  const { data } = await supabase.auth.getSession()
  const uid = data.session?.user?.id
  if (!uid) throw new Error('Not authenticated')
  return uid
}

// ── Decks ──────────────────────────────────────────────────────────────────

export type DeckWithCount = Deck & { card_count: number }

export async function listDecksWithCardCount(): Promise<DeckWithCount[]> {
  const { data, error } = await supabase
    .from('decks')
    .select('*, cards(count)')
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []).map((d: any) => ({
    id: d.id,
    user_id: d.user_id,
    name: d.name,
    category: d.category as Deck['category'],
    description: d.description,
    created_at: d.created_at,
    card_count: Array.isArray(d.cards) && d.cards.length > 0 ? (d.cards[0].count ?? 0) : 0,
  }))
}

export async function listDecks(): Promise<Deck[]> {
  const { data, error } = await supabase
    .from('decks')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function createDeck(payload: Pick<Deck, 'name' | 'category' | 'description'>): Promise<Deck> {
  const user_id = await getUid()
  const { data, error } = await supabase.from('decks').insert({ ...payload, user_id }).select().single()
  if (error) throw error
  return data
}

export async function deleteDeck(id: string): Promise<void> {
  const { error } = await supabase.from('decks').delete().eq('id', id)
  if (error) throw error
}

// ── Cards ──────────────────────────────────────────────────────────────────

export async function listCards(deckId: string): Promise<Card[]> {
  const { data, error } = await supabase
    .from('cards')
    .select('*')
    .eq('deck_id', deckId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function listDueCards(deckId: string): Promise<Card[]> {
  const { data, error } = await supabase
    .from('cards')
    .select('*')
    .eq('deck_id', deckId)
    .lte('due', new Date().toISOString())
    .order('due', { ascending: true })
  if (error) throw error
  return data
}

export async function createCard(
  payload: Pick<Card, 'deck_id' | 'front' | 'back' | 'tags' | 'source_kind' | 'source_ref'>,
): Promise<Card> {
  const user_id = await getUid()
  const { data, error } = await supabase.from('cards').insert({ ...payload, user_id }).select().single()
  if (error) throw error
  return data
}

export async function updateCard(id: string, payload: Partial<Card>): Promise<void> {
  const { error } = await supabase.from('cards').update(payload).eq('id', id)
  if (error) throw error
}

export async function deleteCard(id: string): Promise<void> {
  const { error } = await supabase.from('cards').delete().eq('id', id)
  if (error) throw error
}

// ── Vocab ──────────────────────────────────────────────────────────────────

export async function listVocab(): Promise<VocabEntry[]> {
  const { data, error } = await supabase
    .from('vocab_entries')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function createVocab(
  payload: Pick<VocabEntry, 'kind' | 'term' | 'meaning' | 'example' | 'tags'>,
): Promise<VocabEntry> {
  const user_id = await getUid()
  const { data, error } = await supabase.from('vocab_entries').insert({ ...payload, user_id }).select().single()
  if (error) throw error
  return data
}

export async function updateVocab(id: string, payload: Partial<VocabEntry>): Promise<void> {
  const { error } = await supabase.from('vocab_entries').update(payload).eq('id', id)
  if (error) throw error
}

export async function deleteVocab(id: string): Promise<void> {
  const { error } = await supabase.from('vocab_entries').delete().eq('id', id)
  if (error) throw error
}

// ── Evaluator ──────────────────────────────────────────────────────────────

export async function listEvaluatorRuns(): Promise<EvaluatorRun[]> {
  const { data, error } = await supabase
    .from('evaluator_runs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50)
  if (error) throw error
  return data
}

export async function createEvaluatorRun(
  payload: Pick<EvaluatorRun, 'source' | 'source_ref' | 'input_text' | 'scores'>,
): Promise<EvaluatorRun> {
  const user_id = await getUid()
  const { data, error } = await supabase.from('evaluator_runs').insert({ ...payload, user_id }).select().single()
  if (error) throw error
  return data
}

export async function clearEvaluatorHistory(): Promise<void> {
  const { error } = await supabase.from('evaluator_runs').delete().neq('id', '')
  if (error) throw error
}

// ── Shadowing ──────────────────────────────────────────────────────────────

export async function listShadowingSessions(): Promise<ShadowingSession[]> {
  const { data, error } = await supabase
    .from('shadowing_sessions')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function createShadowingSession(
  payload: Pick<ShadowingSession, 'title' | 'storage_path' | 'kind' | 'duration_seconds'> & { category_id?: string | null },
): Promise<ShadowingSession> {
  const user_id = await getUid()
  const { data, error } = await supabase.from('shadowing_sessions').insert({ ...payload, user_id }).select().single()
  if (error) throw error
  return data
}

// ── Shadowing Categories ───────────────────────────────────────────────────

export async function listShadowingCategories(): Promise<ShadowingCategory[]> {
  const { data, error } = await supabase
    .from('shadowing_categories')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function createShadowingCategory(
  payload: Pick<ShadowingCategory, 'name' | 'description'>,
): Promise<ShadowingCategory> {
  const user_id = await getUid()
  const { data, error } = await supabase
    .from('shadowing_categories')
    .insert({ ...payload, user_id })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateShadowingCategory(
  id: string,
  payload: Partial<Pick<ShadowingCategory, 'name' | 'description'>>,
): Promise<void> {
  const { error } = await supabase.from('shadowing_categories').update(payload).eq('id', id)
  if (error) throw error
}

export async function deleteShadowingCategory(id: string): Promise<void> {
  const { error } = await supabase.from('shadowing_categories').delete().eq('id', id)
  if (error) throw error
}

export async function updateShadowingSession(id: string, payload: Partial<ShadowingSession>): Promise<void> {
  const { error } = await supabase.from('shadowing_sessions').update(payload).eq('id', id)
  if (error) throw error
}

export async function deleteShadowingSession(id: string): Promise<void> {
  const { error } = await supabase.from('shadowing_sessions').delete().eq('id', id)
  if (error) throw error
}

// ── Books ──────────────────────────────────────────────────────────────────

export async function listBooks(): Promise<Book[]> {
  const { data, error } = await supabase
    .from('books')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function createBook(
  payload: Pick<Book, 'title' | 'author' | 'rating' | 'summary' | 'tags'>,
): Promise<Book> {
  const user_id = await getUid()
  const { data, error } = await supabase.from('books').insert({ ...payload, user_id }).select().single()
  if (error) throw error
  return data
}

export async function updateBook(id: string, payload: Partial<Book>): Promise<void> {
  const { error } = await supabase.from('books').update(payload).eq('id', id)
  if (error) throw error
}

export async function deleteBook(id: string): Promise<void> {
  const { error } = await supabase.from('books').delete().eq('id', id)
  if (error) throw error
}

export async function listBookAnnotations(bookId: string): Promise<BookAnnotation[]> {
  const { data, error } = await supabase
    .from('book_annotations')
    .select('*')
    .eq('book_id', bookId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return data
}

// ── DevLab + Journal (for Evaluator SourcePicker) ─────────────────────────

export async function listDevLabPostsForEvaluator() {
  const { data, error } = await supabase
    .from('devlab_posts')
    .select('id, title, excerpt')
    .order('created_at', { ascending: false })
    .limit(50)
  if (error) throw error
  return data as Array<{ id: string; title: string; excerpt: string | null }>
}

export async function listJournalPostsForEvaluator() {
  const { data, error } = await supabase
    .from('journal_posts')
    .select('id, title, content, created_at')
    .eq('type', 'text')
    .not('content', 'is', null)
    .order('created_at', { ascending: false })
    .limit(50)
  if (error) throw error
  return data as Array<{ id: string; title: string | null; content: string; created_at: string }>
}

// ── Storage ────────────────────────────────────────────────────────────────

export async function uploadShadowingFile(file: File): Promise<string> {
  const uid = await getUid()
  const ext = file.name.split('.').pop() ?? 'mp3'
  const id = crypto.randomUUID()
  const path = `${uid}/shadowing/${id}.${ext}`
  const { error } = await supabase.storage.from('media').upload(path, file)
  if (error) throw error
  return path
}

export async function getSignedUrl(storagePath: string): Promise<string> {
  const { data, error } = await supabase.storage.from('media').createSignedUrl(storagePath, 3600)
  if (error || !data?.signedUrl) throw error ?? new Error('No signed URL')
  return data.signedUrl
}

export async function deleteShadowingSessionFull(id: string, storagePath: string): Promise<void> {
  await supabase.storage.from('media').remove([storagePath]).catch(() => {})
  const { error } = await supabase.from('shadowing_sessions').delete().eq('id', id)
  if (error) throw error
}

export async function createBookAnnotation(
  payload: Pick<BookAnnotation, 'book_id' | 'kind' | 'content' | 'page'>,
): Promise<BookAnnotation> {
  const user_id = await getUid()
  const { data, error } = await supabase.from('book_annotations').insert({ ...payload, user_id }).select().single()
  if (error) throw error
  return data
}

export async function deleteBookAnnotation(id: string): Promise<void> {
  const { error } = await supabase.from('book_annotations').delete().eq('id', id)
  if (error) throw error
}
