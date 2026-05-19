function required(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${name}. Add it to .env.local and restart the dev server.`
    )
  }
  return value
}

export const env = {
  get SUPABASE_URL() {
    return required('NEXT_PUBLIC_SUPABASE_URL')
  },
  get SUPABASE_ANON_KEY() {
    return required('NEXT_PUBLIC_SUPABASE_ANON_KEY')
  },
  get SUPABASE_SERVICE_ROLE_KEY() {
    return required('SUPABASE_SERVICE_ROLE_KEY')
  },
  get ANTHROPIC_API_KEY() {
    return required('ANTHROPIC_API_KEY')
  },
}
