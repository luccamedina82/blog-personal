import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { Loader2, Mail, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

export const Route = createFileRoute('/login')({
  component: LoginPage,
})

function LoginPage() {
  'use no memo'
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setLoading(true)
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    setLoading(false)
    if (error) {
      toast.error(error.message)
    } else {
      setSent(true)
    }
  }

  if (sent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="w-full max-w-sm">
          <div className="rounded-xl border border-border/70 bg-card/50 p-6 backdrop-blur-sm text-center">
            <div className="mb-4 mx-auto size-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Mail className="size-5 text-primary" />
            </div>
            <h2 className="text-base font-medium text-foreground mb-1">Check your email</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Magic link sent to{' '}
              <span className="text-foreground font-mono">{email}</span>
            </p>
            <button
              type="button"
              onClick={() => setSent(false)}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Use a different email
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-2">
          <div className="size-9 rounded-lg bg-foreground/95 flex items-center justify-center">
            <span className="text-background text-sm font-semibold tracking-tight">G</span>
          </div>
          <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
            Personal workspace
          </p>
        </div>
        <div className="rounded-xl border border-border/70 bg-card/50 p-6 backdrop-blur-sm">
          <h1 className="text-lg font-semibold tracking-tight text-foreground mb-1">Sign in</h1>
          <p className="text-sm text-muted-foreground mb-6">
            Enter your email — we'll send a magic link.
          </p>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
                className="w-full rounded-md border border-border/70 bg-background/60 pl-10 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary/40 transition-colors"
              />
            </div>
            <Button
              type="submit"
              disabled={loading || !email.trim()}
              className="w-full"
            >
              {loading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <>
                  Send magic link
                  <ArrowRight className="size-4" />
                </>
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
