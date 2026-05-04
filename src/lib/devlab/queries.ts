import { supabase } from '@/lib/supabase'
import type { DevLabCategory, DevLabPost, DevLabBlock } from './types'

type CategoryPayload = Pick<DevLabCategory, 'slug' | 'label' | 'description' | 'icon'>
type PostPayload = {
  category_id: string | null
  title: string
  excerpt: string | null
  blocks: DevLabBlock[]
  tags: string[]
  pinned: boolean
  reading_time: string | null
}

function normalizePost(row: Record<string, unknown>): DevLabPost {
  return { ...(row as DevLabPost), blocks: (row.blocks as DevLabBlock[]) ?? [] }
}

// ── Categories ──────────────────────────────────────────────────────────────

export async function listDevLabCategories(): Promise<DevLabCategory[]> {
  const { data, error } = await supabase
    .from('devlab_categories')
    .select('*')
    .order('label')
  if (error) throw error
  return data
}

export async function createDevLabCategory(payload: CategoryPayload): Promise<DevLabCategory> {
  const { data, error } = await supabase
    .from('devlab_categories')
    .insert(payload)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateDevLabCategory(
  id: string,
  payload: Partial<CategoryPayload>,
): Promise<void> {
  const { error } = await supabase.from('devlab_categories').update(payload).eq('id', id)
  if (error) throw error
}

export async function deleteDevLabCategory(id: string): Promise<void> {
  const { error } = await supabase.from('devlab_categories').delete().eq('id', id)
  if (error) throw error
}

// ── Posts ────────────────────────────────────────────────────────────────────

export async function listDevLabPosts(categoryId?: string): Promise<DevLabPost[]> {
  let query = supabase
    .from('devlab_posts')
    .select('*')
    .order('created_at', { ascending: false })
  if (categoryId) query = query.eq('category_id', categoryId)
  const { data, error } = await query
  if (error) throw error
  return data.map(normalizePost)
}

export async function createDevLabPost(payload: PostPayload): Promise<DevLabPost> {
  const { data, error } = await supabase
    .from('devlab_posts')
    .insert(payload)
    .select()
    .single()
  if (error) throw error
  return normalizePost(data)
}

export async function updateDevLabPost(
  id: string,
  payload: Partial<PostPayload>,
): Promise<void> {
  const { error } = await supabase.from('devlab_posts').update(payload).eq('id', id)
  if (error) throw error
}

export async function deleteDevLabPost(id: string): Promise<void> {
  const { error } = await supabase.from('devlab_posts').delete().eq('id', id)
  if (error) throw error
}
