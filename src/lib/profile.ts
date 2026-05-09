import { supabase } from './supabase'

export type Profile = {
  id: string
  email: string
  display_name: string | null
  github_url: string | null
  twitter_url: string | null
  linkedin_url: string | null
  created_at: string
}

export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()
  if (error) return null
  return data as Profile
}

export async function updateProfile(
  userId: string,
  patch: Partial<Pick<Profile, 'display_name' | 'github_url' | 'twitter_url' | 'linkedin_url'>>,
): Promise<{ error: string | null }> {
  const { error } = await supabase.from('profiles').update(patch).eq('id', userId)
  return { error: error?.message ?? null }
}
