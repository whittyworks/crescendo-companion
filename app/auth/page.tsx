import Link from 'next/link'
import { AuthForm } from './auth-form'

export default async function AuthPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string }>
}) {
  const { mode } = await searchParams
  const initialMode: 'signin' | 'signup' = mode === 'signup' ? 'signup' : 'signin'

  return (
    <div className="flex flex-1 flex-col bg-cream text-navy">
      <header className="flex justify-start px-6 pt-8 sm:px-10">
        <Link
          href="/"
          className="font-sans text-xs uppercase tracking-[0.22em] text-navy/70 transition-colors hover:text-gold-dark"
        >
          ← Home
        </Link>
      </header>

      <main className="flex flex-1 items-center justify-center px-6 py-12 sm:px-10">
        <AuthForm initialMode={initialMode} />
      </main>

      <footer className="px-6 pb-10 pt-6 text-center sm:px-10">
        <p className="font-serif text-base italic text-gold sm:text-lg">
          Stella Maris, ora pro nobis
        </p>
      </footer>
    </div>
  )
}
