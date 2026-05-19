import Link from 'next/link'

export default function NoAccessPage() {
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

      <main className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center sm:px-10">
        <div className="flex w-full max-w-2xl flex-col items-center gap-10">
          <p className="font-display text-[0.7rem] tracking-[0.42em] text-gold sm:text-xs">
            MY HOLY CRESCENDO
          </p>

          <h1 className="font-display text-3xl leading-[1.2] tracking-wide text-navy sm:text-4xl md:text-5xl">
            Access to Crescendo Companion
          </h1>

          <p className="font-serif text-xl italic leading-relaxed text-navy/80 sm:text-2xl">
            A companion for women walking the My Holy Crescendo path
          </p>

          <p className="max-w-xl font-sans text-base leading-relaxed text-navy/75 sm:text-lg">
            Crescendo Companion is currently available to women enrolled in
            A Symphony of Grace and other My Holy Crescendo programs. Visit
            myholycrescendo.com to learn more.
          </p>

          <div className="pt-2">
            <a
              href="https://myholycrescendo.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block bg-navy px-12 py-4 font-sans text-xs uppercase tracking-[0.3em] text-cream transition-colors hover:bg-navy/90"
            >
              Visit My Holy Crescendo
            </a>
          </div>

        </div>
      </main>

      <footer className="px-6 pb-10 pt-6 text-center sm:px-10">
        <p className="font-serif text-base italic text-gold sm:text-lg">
          Stella Maris, ora pro nobis
        </p>
      </footer>
    </div>
  )
}
