import { supabase } from '@/lib/supabase'
import type {
  LibraryBook,
  LibraryModuleTag,
  BookCitation,
  BookCitationSourceKind,
  BookCitationWithBook,
} from './types'

async function getUid(): Promise<string> {
  const { data } = await supabase.auth.getSession()
  const uid = data.session?.user?.id
  if (!uid) throw new Error('Not authenticated')
  return uid
}

// ── Signed URLs ────────────────────────────────────────────────────────────

const signedUrlCache = new Map<string, { url: string; expiresAt: number }>()

export async function getSignedUrl(storagePath: string, ttl = 3600): Promise<string> {
  const cached = signedUrlCache.get(storagePath)
  if (cached && cached.expiresAt > Date.now() + 60_000) return cached.url

  const { data, error } = await supabase.storage.from('media').createSignedUrl(storagePath, ttl)
  if (error || !data?.signedUrl) throw new Error(`Failed to get signed URL: ${error?.message}`)

  signedUrlCache.set(storagePath, { url: data.signedUrl, expiresAt: Date.now() + ttl * 1000 })
  return data.signedUrl
}

// ── Books ──────────────────────────────────────────────────────────────────

export type BookPayload = Pick<
  LibraryBook,
  'title' | 'author' | 'storage_path' | 'page_count' | 'cover_path' | 'tags' | 'module_tags'
>

export async function listBooks(moduleTag?: LibraryModuleTag): Promise<LibraryBook[]> {
  let q = supabase.from('library_books').select('*').order('created_at', { ascending: false })
  if (moduleTag) q = q.contains('module_tags', [moduleTag])
  const { data, error } = await q
  if (error) throw error
  return data as LibraryBook[]
}

export async function getBook(id: string): Promise<LibraryBook> {
  const { data, error } = await supabase.from('library_books').select('*').eq('id', id).single()
  if (error) throw error
  return data as LibraryBook
}

export async function createBook(payload: BookPayload): Promise<LibraryBook> {
  const uid = await getUid()
  const { data, error } = await supabase
    .from('library_books')
    .insert({ ...payload, user_id: uid })
    .select()
    .single()
  if (error) throw error
  return data as LibraryBook
}

export async function updateBook(
  id: string,
  payload: Partial<Pick<LibraryBook, 'title' | 'author' | 'tags' | 'module_tags' | 'page_count' | 'cover_path'>>
): Promise<LibraryBook> {
  const { data, error } = await supabase
    .from('library_books')
    .update(payload)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data as LibraryBook
}

export async function deleteBook(id: string): Promise<void> {
  const { error } = await supabase.from('library_books').delete().eq('id', id)
  if (error) throw error
}

// ── Citations ──────────────────────────────────────────────────────────────

export async function listCitationsForNote(
  sourceKind: BookCitationSourceKind,
  sourceId: string
): Promise<BookCitationWithBook[]> {
  const { data, error } = await supabase
    .from('book_citations')
    .select('*, library_books(id, title, author, storage_path, cover_path, page_count)')
    .eq('source_kind', sourceKind)
    .eq('source_id', sourceId)
    .order('page', { ascending: true })
  if (error) throw error
  return data as BookCitationWithBook[]
}

export async function listNotesCitingBook(
  bookId: string
): Promise<BookCitation[]> {
  const { data, error } = await supabase
    .from('book_citations')
    .select('*')
    .eq('book_id', bookId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data as BookCitation[]
}

/**
 * Replace all citations for a note in one shot.
 * Called on every note save — derives citations from tiptap doc, no drift.
 */
export async function replaceCitationsForNote(
  sourceKind: BookCitationSourceKind,
  sourceId: string,
  citations: Array<{ book_id: string; page: number; note?: string }>
): Promise<void> {
  const uid = await getUid()

  const { error: delError } = await supabase
    .from('book_citations')
    .delete()
    .eq('source_kind', sourceKind)
    .eq('source_id', sourceId)
  if (delError) throw delError

  if (citations.length === 0) return

  const rows = citations.map((c) => ({
    user_id: uid,
    book_id: c.book_id,
    source_kind: sourceKind,
    source_id: sourceId,
    page: c.page,
    note: c.note ?? null,
  }))

  const { error: insError } = await supabase.from('book_citations').insert(rows)
  if (insError) throw insError
}

export async function citationCountPerBook(bookIds: string[]): Promise<Record<string, number>> {
  if (bookIds.length === 0) return {}
  const { data, error } = await supabase
    .from('book_citations')
    .select('book_id')
    .in('book_id', bookIds)
  if (error) throw error
  const counts: Record<string, number> = {}
  for (const row of data as { book_id: string }[]) {
    counts[row.book_id] = (counts[row.book_id] ?? 0) + 1
  }
  return counts
}
