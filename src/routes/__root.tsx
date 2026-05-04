import { createRootRoute, Outlet, redirect, useRouterState } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'
import { AppSidebar, MobileNav } from '@/components/app-sidebar'
import { supabase } from '@/lib/supabase'
import { Toaster } from '@/components/ui/sonner'
import { GlobalSearch } from '@/components/global-search'

const PUBLIC_PATHS = ['/login', '/auth/callback']

export const Route = createRootRoute({
  beforeLoad: async ({ location }) => {
    if (PUBLIC_PATHS.some((p) => location.pathname.startsWith(p))) return
    const { data } = await supabase.auth.getSession()
    if (!data.session) {
      throw redirect({ to: '/login' })
    }
  },
  component: RootComponent,
})

function RootComponent() {
  'use no memo'
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p))

  if (isPublic) {
    return (
      <>
        <Outlet />
        <Toaster />
      </>
    )
  }

  return (
    <main className="min-h-screen flex bg-background">
      <AppSidebar />
      <div className="flex-1 min-w-0 flex flex-col">
        <MobileNav />
        <Outlet />
      </div>
      <GlobalSearch />
      <TanStackRouterDevtools />
      <Toaster />
    </main>
  )
}
