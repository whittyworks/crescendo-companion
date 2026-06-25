'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export type AuthState = { error?: string; message?: string }

function friendlyAuthError(message: string): string {
  const lower = message.toLowerCase()
  if (lower.includes('invalid login credentials')) {
    return 'That email and password do not match. Please try again.'
  }
  if (lower.includes('email not confirmed')) {
    return 'Please confirm your email before signing in. Check your inbox for the confirmation link.'
  }
  if (
    lower.includes('user already registered') ||
    lower.includes('already been registered')
  ) {
    return 'An account with that email already exists. Try signing in instead.'
  }
  if (lower.includes('password should be at least')) {
    return 'Your password must be at least 6 characters.'
  }
  if (lower.includes('rate limit')) {
    return 'Too many attempts. Please wait a moment and try again.'
  }
  if (lower.includes('unable to validate email')) {
    return 'That email address does not look valid.'
  }
  return message
}

async function destinationForUser(
  userId: string,
): Promise<'/chat' | '/no-access'> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('user_access')
    .select('has_companion_access')
    .eq('user_id', userId)
    .maybeSingle()
  return data?.has_companion_access ? '/chat' : '/no-access'
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/')
}

export async function requestPasswordReset(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = String(formData.get('email') ?? '').trim()
  if (!email) return { error: 'Please enter your email.' }

  const supabase = await createClient()
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback?next=/auth/reset-password`,
  })

  if (error) return { error: friendlyAuthError(error.message) }
  return { message: 'Check your email for a reset link.' }
}

export async function submitAuth(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const mode = String(formData.get('mode') ?? 'signin')
  const email = String(formData.get('email') ?? '').trim()
  const password = String(formData.get('password') ?? '')

  if (!email || !password) {
    return { error: 'Please enter your email and password.' }
  }

  let destination: '/chat' | '/no-access'

  if (mode === 'signup') {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) {
      console.error('[signup] supabase.auth.signUp error:', error)
      return { error: friendlyAuthError(error.message) }
    }

    const userId = data.user?.id
    if (!userId) {
      console.error('[signup] signUp returned no userId')
      return {
        error:
          'Account created, but we could not read your user id back from Supabase. Please contact support.',
      }
    }

    try {
      const admin = createAdminClient()
      const { data: insertData, error: insertError } = await admin
        .from('user_access')
        .upsert(
          { user_id: userId, has_companion_access: false },
          { onConflict: 'user_id' },
        )
        .select()
      if (insertError) {
        console.error('[signup] user_access upsert failed:', insertError)
        return {
          error: `Your account was created, but we could not set up your access record (${insertError.code ?? 'unknown'}: ${insertError.message}). Please contact support.`,
        }
      }
      if (!insertData || insertData.length === 0) {
        console.error('[signup] user_access upsert returned no rows — likely a silent RLS or role issue')
        return {
          error:
            'Your account was created, but the access record did not persist. Please contact support.',
        }
      }
    } catch (e) {
      console.error('[signup] unexpected error during admin upsert:', e)
      return {
        error:
          'Your account was created, but setting up your access record threw an unexpected error. Please contact support.',
      }
    }

    if (!data.session) {
      return {
        message:
          'Almost there — check your email to confirm your account, then come back and sign in.',
      }
    }

    destination = '/no-access'
  } else {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    if (error) return { error: friendlyAuthError(error.message) }
    destination = await destinationForUser(data.user.id)
  }

  redirect(destination)
}
