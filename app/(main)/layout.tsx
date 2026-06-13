import Header from '@/app/components/ui/Header'

export default function MainLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="relative min-h-screen">
      <Header />
      <main className="relative z-10 max-w-6xl mx-auto px-5 py-10">
        {children}
      </main>
    </div>
  )
}
