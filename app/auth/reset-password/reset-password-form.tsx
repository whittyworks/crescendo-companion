// app/auth/reset-password/reset-password-form.tsx
'use client'

import { useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'

export function ResetPasswordForm() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }

    setStatus('loading')

    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const { error: updateError } = await supabase.auth.updateUser({ password })
    if (updateError) {
      setError(updateError.message)
      setStatus('error')
      return
    }

    setStatus('success')
  }

  if (status === 'success') {
    return (
      <div className="w-full max-w-md text-center">
        <p className="font-display text-[0.7rem] tracking-[0.42em] text-gold">
          PASSWORD UPDATED
        </p>
        <p className="mt-6 font-serif text-xl italic leading-relaxed text-navy/80">
          Your password has been changed.
        </p>
        <a
          href="/auth?mode=signin"
          className="mt-8 inline-block bg-navy px-12 py-4 font-sans text-xs uppercase tracking-[0.3em] text-cream transition-colors hover:bg-navy/90"
        >
          Sign In
        </a>
      </div>
    )
  }

  return (
    <div className="w-full max-w-md">
      <div className="mb-10 text-center">
        <p className="font-display text-[0.7rem] tracking-[0.42em] text-gold">
          RESET PASSWORD
        </p>
        <h1 className="mt-6 font-display text-3xl leading-tight tracking-wide text-navy sm:text-4xl">
          Choose a new password
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <label
            htmlFor="password"
            className="block font-sans text-[0.7rem] uppercase tracking-[0.22em] text-navy/70"
          >
            New Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            disabled={status === 'loading'}
            className="w-full border border-navy/20 bg-white/40 px-4 py-3 font-sans text-base text-navy outline-none transition-colors placeholder:text-navy/30 focus:border-gold disabled:opacity-60"
          />
        </div>

        <div className="space-y-2">
          <label
            htmlFor="confirm"
            className="block font-sans text-[0.7rem] uppercase tracking-[0.22em] text-navy/70"
          >
            Confirm Password
          </label>
          <input
            id="confirm"
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            minLength={6}
            disabled={status === 'loading'}
            className="w-full border border-navy/20 bg-white/40 px-4 py-3 font-sans text-base text-navy outline-none transition-colors placeholder:text-navy/30 focus:border-gold disabled:opacity-60"
          />
        </div>

        {error && (
          <p role="alert" className="font-sans text-sm leading-relaxed text-red-800">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={status === 'loading'}
          className="w-full bg-navy px-12 py-4 font-sans text-xs uppercase tracking-[0.3em] text-cream transition-colors hover:bg-navy/90 disabled:cursor-not-allowed disabled:bg-navy/50"
        >
          {status === 'loading' ? 'Updating…' : 'Update Password'}
        </button>
      </form>
    </div>
  )
}
