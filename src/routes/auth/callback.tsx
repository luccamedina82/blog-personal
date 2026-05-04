import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Loader2 } from 'lucide-react'

export const Route = createFileRoute('/auth/callback')({
  component: AuthCallback,
})

function AuthCallback() {
  'use no memo'
  const navigate = useNavigate()

  useEffect(() => {
    async function handleCallback() {
      const { data } = await supabase.auth.getSession()
      if (data.session) {
        navigate({ to: '/', replace: true })
        return
      }
      const code = new URLSearchParams(window.location.search).get('code')
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        navigate({ to: error ? '/login' : '/', replace: true })
      } else {
        navigate({ to: '/login', replace: true })
      }
    }
    handleCallback()
  }, [navigate])

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex items-center gap-3 text-muted-foreground">
        <Loader2 className="size-5 animate-spin" />
        <span className="text-sm">Signing you in…</span>
      </div>
    </div>
  )
}
