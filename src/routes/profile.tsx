import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth'
import { getProfile, updateProfile, type Profile } from '@/lib/profile'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { GithubLogo, LinkedinLogo, TwitterLogo, User } from '@phosphor-icons/react'

export const Route = createFileRoute('/profile')({
  component: ProfilePage,
})

function ProfilePage() {
  const { user } = useAuth()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [form, setForm] = useState({
    display_name: '',
    github_url: '',
    twitter_url: '',
    linkedin_url: '',
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    getProfile(user.id).then((p) => {
      if (!p) return
      setProfile(p)
      setForm({
        display_name: p.display_name ?? '',
        github_url: p.github_url ?? '',
        twitter_url: p.twitter_url ?? '',
        linkedin_url: p.linkedin_url ?? '',
      })
    })
  }, [user])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return
    setSaving(true)
    setSaved(false)
    setError(null)
    const { error } = await updateProfile(user.id, {
      display_name: form.display_name || null,
      github_url: form.github_url || null,
      twitter_url: form.twitter_url || null,
      linkedin_url: form.linkedin_url || null,
    })
    setSaving(false)
    if (error) {
      setError(error)
    } else {
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    }
  }

  return (
    <div className="max-w-lg mx-auto py-12 px-4">
      <div className="flex items-center gap-3 mb-8">
        <div className="size-8 rounded-full bg-secondary flex items-center justify-center">
          <User className="size-4 text-muted-foreground" />
        </div>
        <div>
          <h1 className="text-lg font-semibold">Profile</h1>
          <p className="text-xs text-muted-foreground">{profile?.email}</p>
        </div>
      </div>

      <form onSubmit={handleSave} className="flex flex-col gap-5">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="display_name">Display name</Label>
          <Input
            id="display_name"
            placeholder="Your name"
            value={form.display_name}
            onChange={(e) => setForm((f) => ({ ...f, display_name: e.target.value }))}
          />
          <p className="text-[11px] text-muted-foreground">Shown in the sidebar.</p>
        </div>

        <div className="border-t border-border/60 pt-5">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-4">
            Social links
          </p>

          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="github_url" className="flex items-center gap-1.5">
                <GithubLogo className="size-3.5" /> GitHub
              </Label>
              <Input
                id="github_url"
                placeholder="https://github.com/username"
                value={form.github_url}
                onChange={(e) => setForm((f) => ({ ...f, github_url: e.target.value }))}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="twitter_url" className="flex items-center gap-1.5">
                <TwitterLogo className="size-3.5" /> Twitter / X
              </Label>
              <Input
                id="twitter_url"
                placeholder="https://twitter.com/username"
                value={form.twitter_url}
                onChange={(e) => setForm((f) => ({ ...f, twitter_url: e.target.value }))}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="linkedin_url" className="flex items-center gap-1.5">
                <LinkedinLogo className="size-3.5" /> LinkedIn
              </Label>
              <Input
                id="linkedin_url"
                placeholder="https://linkedin.com/in/username"
                value={form.linkedin_url}
                onChange={(e) => setForm((f) => ({ ...f, linkedin_url: e.target.value }))}
              />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 pt-1">
          <Button type="submit" disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
          {saved && <span className="text-xs text-primary">Saved</span>}
          {error && <span className="text-xs text-destructive">{error}</span>}
        </div>
      </form>
    </div>
  )
}
