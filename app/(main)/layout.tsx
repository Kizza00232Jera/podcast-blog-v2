import { createClient } from '@/app/lib/supabase/server'
import { redirect } from 'next/navigation'
import Header from '@/app/components/ui/Header'

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <div>
      <Header user={user} />
      <main>{children}</main>
    </div>
  )
}
