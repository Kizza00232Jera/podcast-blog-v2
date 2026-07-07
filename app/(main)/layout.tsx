import { auth } from '@clerk/nextjs/server'
import Header from '@/app/components/ui/Header'
import BottomNav from '@/app/components/ui/BottomNav'

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { userId } = await auth()
  return (
    <div className="relative min-h-screen">
      <Header />
      {/* Extra bottom padding on mobile so the bottom nav never covers content. */}
      <main className="relative z-10 max-w-6xl mx-auto px-5 py-10 pb-28 sm:pb-10">
        {children}
      </main>
      {userId && <BottomNav />}
    </div>
  )
}
