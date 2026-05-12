import { supabase } from '@/lib/supabase'
import type { DevLabAnnotation, DevLabAnnotationKind, DevLabAnnotationStatus } from './types'

async function getUid(): Promise<string> {
  const { data } = await supabase.auth.getSession()
  const uid = data.session?.user?.id
  if (!uid) throw new Error('Not authenticated')
  return uid
}

export async function listAnnotations(
  postId: string,
  includeDismissed = false,
): Promise<DevLabAnnotation[]> {
  const uid = await getUid()
  let query = supabase
    .from('devlab_annotations')
    .select('*')
    .eq('post_id', postId)
    .eq('user_id', uid)
    .order('created_at', { ascending: false })
  if (!includeDismissed) query = query.neq('status', 'dismissed')
  const { data, error } = await query
  if (error) throw error
  return (data ?? []) as DevLabAnnotation[]
}

export async function bulkCreateAnnotations(
  postId: string,
  rows: Array<{
    block_id: string
    original_text: string
    suggestion: string
    rationale: string | null
    kind: DevLabAnnotationKind
  }>,
): Promise<DevLabAnnotation[]> {
  if (rows.length === 0) return []
  const uid = await getUid()
  const payload = rows.map((r) => ({
    user_id: uid,
    post_id: postId,
    block_id: r.block_id,
    original_text: r.original_text,
    suggestion: r.suggestion,
    rationale: r.rationale,
    kind: r.kind,
    status: 'pending' as DevLabAnnotationStatus,
  }))
  const { data, error } = await supabase
    .from('devlab_annotations')
    .insert(payload)
    .select()
  if (error) throw error
  return (data ?? []) as DevLabAnnotation[]
}

export async function updateAnnotationStatus(
  id: string,
  status: DevLabAnnotationStatus,
): Promise<void> {
  const uid = await getUid()
  const { error } = await supabase
    .from('devlab_annotations')
    .update({ status })
    .eq('id', id)
    .eq('user_id', uid)
  if (error) throw error
}

export async function deleteAnnotation(id: string): Promise<void> {
  const uid = await getUid()
  const { error } = await supabase
    .from('devlab_annotations')
    .delete()
    .eq('id', id)
    .eq('user_id', uid)
  if (error) throw error
}
