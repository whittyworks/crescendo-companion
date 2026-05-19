import 'server-only'
import Anthropic from '@anthropic-ai/sdk'
import { env } from '@/lib/env'

let cached: Anthropic | null = null

export function getAnthropic(): Anthropic {
  if (!cached) cached = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY })
  return cached
}
