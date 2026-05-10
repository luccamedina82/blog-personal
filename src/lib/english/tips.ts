import { supabase } from '@/lib/supabase'

export type StoredTip = {
  id: string
  user_id: string
  tip_date: string
  kind: 'word' | 'phrase' | 'idiom' | 'connector'
  term: string
  meaning: string
  example: string
  register: 'casual' | 'neutral' | 'formal'
  source: string | null
  created_at: string
}

export async function getTodayTip(): Promise<StoredTip | null> {
  const today = new Date().toISOString().slice(0, 10)
  const { data } = await supabase
    .from('daily_tips')
    .select('*')
    .eq('tip_date', today)
    .maybeSingle()
  return (data as StoredTip | null)
}

export async function saveTip(
  tip: Omit<StoredTip, 'id' | 'user_id' | 'tip_date' | 'created_at'>,
): Promise<StoredTip> {
  const today = new Date().toISOString().slice(0, 10)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const { data, error } = await supabase
    .from('daily_tips')
    .insert({ ...tip, tip_date: today, user_id: user.id })
    .select()
    .single()
  if (error) throw error
  return data as StoredTip
}

export async function listTipHistory(limit = 14): Promise<StoredTip[]> {
  const { data, error } = await supabase
    .from('daily_tips')
    .select('*')
    .order('tip_date', { ascending: false })
    .limit(limit)
  if (error) throw error
  return (data ?? []) as StoredTip[]
}
