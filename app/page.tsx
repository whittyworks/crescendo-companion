import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col bg-cream text-navy">
      <header className="flex justify-end px-6 pt-8 sm:px-10">
        <Link
          href="/auth?mode=signin"
          className="font-sans text-xs tracking-[0.22em] uppercase text-navy/70 transition-colors hover:text-gold-dark"
        >
          Sign In
        </Link>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center sm:px-10">
        <div className="flex w-full max-w-2xl flex-col items-center gap-10">
          <p className="font-display text-[0.7rem] tracking-[0.42em] text-gold sm:text-xs">
            MY HOLY CRESCENDO
          </p>

          <h1 className="font-display text-4xl leading-[1.15] tracking-wide text-navy sm:text-5xl md:text-6xl">
            Crescendo Companion
          </h1>

          <p className="font-serif italic text-xl leading-relaxed text-navy/80 sm:text-2xl">
            A Catholic formation companion grounded in the My Holy Crescendo
            framework
          </p>

          <p className="max-w-xl font-sans text-base leading-relaxed text-navy/75 sm:text-lg">
            A quiet place to bring your questions, your seasons, and your
            longing for holiness. Crescendo Companion is here to walk alongside
            you in formation — gently, faithfully, and rooted in the heart of
            the Church.
          </p>

          <div className="pt-2">
            <Link
              href="/auth"
              className="inline-block bg-navy px-12 py-4 font-sans text-xs uppercase tracking-[0.3em] text-cream transition-colors hover:bg-navy/90"
            >
              Enter
            </Link>
          </div>
        </div>
      </main>

      <footer className="px-6 pb-10 pt-6 text-center sm:px-10">
        <p className="font-serif italic text-base text-gold sm:text-lg">
          Stella Maris, ora pro nobis
        </p>
      </footer>
    </div>
  );
}
