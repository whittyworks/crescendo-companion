'use client'

import { useActionState, useState } from 'react'
import { submitAuth, requestPasswordReset, type AuthState } from './actions'

const initialState: AuthState = {}

export function AuthForm({
  initialMode,
}: {
  initialMode: 'signin' | 'signup'
}) {
  const [mode, setMode] = useState<'signin' | 'signup'>(initialMode)
  const [forgotPassword, setForgotPassword] = useState(false)
  const [resetEmail, setResetEmail] = useState('')
  const [resetStatus, setResetStatus] = useState<'idle' | 'loading' | 'sent'>('idle')
  const [state, formAction, isPending] = useActionState<AuthState, FormData>(
    submitAuth,
    initialState,
  )

  const isSignIn = mode === 'signin'

  async function handleForgotPassword(e: React.FormEvent) {
    e.preventDefault()
    setResetStatus('loading')
    const fd = new FormData()
    fd.append('email', resetEmail)
    await requestPasswordReset({} as AuthState, fd)
    setResetStatus('sent')
  }

  if (forgotPassword) {
    return (
      <div className="w-full max-w-md">
        <div className="mb-10 text-center">
          <p className="font-display text-[0.7rem] tracking-[0.42em] text-gold">
            FORGOT PASSWORD
          </p>
          <h1 className="mt-6 font-display text-3xl leading-tight tracking-wide text-navy sm:text-4xl">
            Reset your password
          </h1>
        </div>

        {resetStatus === 'sent' ? (
          <div className="text-center">
            <p className="font-serif text-base italic leading-relaxed text-navy/80">
              Check your email for a reset link.
            </p>
            <button
              type="button"
              onClick={() => { setForgotPassword(false); setResetStatus('idle') }}
              className="mt-6 font-sans text-sm text-gold-dark underline-offset-4 hover:underline"
            >
              Back to sign in
            </button>
          </div>
        ) : (
          <form onSubmit={handleForgotPassword} className="space-y-6">
            <div className="space-y-2">
              <label
                htmlFor="reset-email"
                className="block font-sans text-[0.7rem] uppercase tracking-[0.22em] text-navy/70"
              >
                Email
              </label>
              <input
                id="reset-email"
                type="email"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                required
                disabled={resetStatus === 'loading'}
                className="w-full border border-navy/20 bg-white/40 px-4 py-3 font-sans text-base text-navy outline-none transition-colors placeholder:text-navy/30 focus:border-gold disabled:opacity-60"
              />
            </div>
            <button
              type="submit"
              disabled={resetStatus === 'loading'}
              className="w-full bg-navy px-12 py-4 font-sans text-xs uppercase tracking-[0.3em] text-cream transition-colors hover:bg-navy/90 disabled:cursor-not-allowed disabled:bg-navy/50"
            >
              {resetStatus === 'loading' ? 'Sending…' : 'Send Reset Link'}
            </button>
            <div className="text-center">
              <button
                type="button"
                onClick={() => setForgotPassword(false)}
                className="font-sans text-sm text-navy/70 underline-offset-4 hover:underline"
              >
                Back to sign in
              </button>
            </div>
          </form>
        )}
      </div>
    )
  }

  return (
    <div className="w-full max-w-md">
      <div className="mb-10 text-center">
        <p className="font-display text-[0.7rem] tracking-[0.42em] text-gold sm:text-xs">
          {isSignIn ? 'WELCOME BACK' : 'WELCOME'}
        </p>
        <h1 className="mt-6 font-display text-3xl leading-tight tracking-wide text-navy sm:text-4xl">
          {isSignIn ? 'Sign in to your companion' : 'Begin your formation'}
        </h1>
      </div>

      <form action={formAction} className="space-y-6">
        <input type="hidden" name="mode" value={mode} />

        <div className="space-y-2">
          <label
            htmlFor="email"
            className="block font-sans text-[0.7rem] uppercase tracking-[0.22em] text-navy/70"
          >
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            disabled={isPending}
            className="w-full border border-navy/20 bg-white/40 px-4 py-3 font-sans text-base text-navy outline-none transition-colors placeholder:text-navy/30 focus:border-gold disabled:opacity-60"
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label
              htmlFor="password"
              className="block font-sans text-[0.7rem] uppercase tracking-[0.22em] text-navy/70"
            >
              Password
            </label>
            {isSignIn && (
              <button
                type="button"
                onClick={() => setForgotPassword(true)}
                className="font-sans text-xs text-navy/50 underline-offset-4 hover:text-gold-dark hover:underline"
              >
                Forgot password?
              </button>
            )}
          </div>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete={isSignIn ? 'current-password' : 'new-password'}
            required
            minLength={6}
            disabled={isPending}
            className="w-full border border-navy/20 bg-white/40 px-4 py-3 font-sans text-base text-navy outline-none transition-colors placeholder:text-navy/30 focus:border-gold disabled:opacity-60"
          />
          {!isSignIn && (
            <p className="font-sans text-xs text-navy/55">
              At least 6 characters.
            </p>
          )}
        </div>

        {state.error && (
          <p role="alert" className="font-sans text-sm leading-relaxed text-red-800">
            {state.error}
          </p>
        )}
        {state.message && (
          <p role="status" className="font-serif text-base italic leading-relaxed text-navy/80">
            {state.message}
          </p>
        )}

        <button
          type="submit"
          disabled={isPending}
          className="w-full bg-navy px-12 py-4 font-sans text-xs uppercase tracking-[0.3em] text-cream transition-colors hover:bg-navy/90 disabled:cursor-not-allowed disabled:bg-navy/50"
        >
          {isPending
            ? isSignIn ? 'Signing in…' : 'Creating account…'
            : isSignIn ? 'Sign In' : 'Create Account'}
        </button>
      </form>

      <div className="mt-8 text-center font-sans text-sm text-navy/70">
        {isSignIn ? (
          <>
            New here?{' '}
            <button
              type="button"
              onClick={() => setMode('signup')}
              className="text-gold-dark underline-offset-4 transition-colors hover:underline"
            >
              Create an account
            </button>
          </>
        ) : (
          <>
            Already have an account?{' '}
            <button
              type="button"
              onClick={() => setMode('signin')}
              className="text-gold-dark underline-offset-4 transition-colors hover:underline"
            >
              Sign in
            </button>
          </>
        )}
      </div>
    </div>
  )
}
