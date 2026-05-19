import Anthropic from '@anthropic-ai/sdk'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAnthropic } from '@/lib/anthropic'
import { SYSTEM_PROMPT } from '@/lib/system-prompt'

const MODEL = 'claude-opus-4-7'
const MAX_TOKENS = 16000
const HISTORY_LIMIT = 20

function errorJson(message: string, status: number) {
  return NextResponse.json({ error: message }, { status })
}

export async function POST(req: Request) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return errorJson('Not signed in.', 401)

  const { data: access } = await supabase
    .from('user_access')
    .select('has_companion_access')
    .eq('user_id', user.id)
    .maybeSingle()
  if (!access?.has_companion_access) {
    return errorJson('You do not have access to Crescendo Companion.', 403)
  }

  let body: { message?: unknown; conversationId?: unknown }
  try {
    body = await req.json()
  } catch {
    return errorJson('Invalid request body.', 400)
  }

  const message =
    typeof body.message === 'string' ? body.message.trim() : ''
  if (!message) return errorJson('Message is empty.', 400)

  const requestedConversationId =
    typeof body.conversationId === 'string' && body.conversationId
      ? body.conversationId
      : null

  let conversationId = requestedConversationId
  if (!conversationId) {
    const { data: newConv, error: convError } = await supabase
      .from('conversations')
      .insert({ user_id: user.id })
      .select('id')
      .single()
    if (convError || !newConv) {
      console.error('[api/chat] failed to create conversation:', convError)
      return errorJson('Could not start a new conversation.', 500)
    }
    conversationId = newConv.id
  }

  const { error: userInsertError } = await supabase
    .from('messages')
    .insert({
      conversation_id: conversationId,
      role: 'user',
      content: message,
    })
  if (userInsertError) {
    console.error('[api/chat] failed to save user message:', userInsertError)
    return errorJson('Could not save your message.', 500)
  }

  const { data: history, error: historyError } = await supabase
    .from('messages')
    .select('role, content, created_at')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false })
    .limit(HISTORY_LIMIT)
  if (historyError) {
    console.error('[api/chat] failed to load history:', historyError)
    return errorJson('Could not load conversation history.', 500)
  }

  const chronological = (history ?? []).slice().reverse()
  const anthropicMessages: Anthropic.MessageParam[] = chronological.map(
    (m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }),
  )

  let assistantText: string
  try {
    const anthropic = getAnthropic()
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: [
        {
          type: 'text',
          text: SYSTEM_PROMPT,
          cache_control: { type: 'ephemeral' },
        },
      ],
      messages: anthropicMessages,
    })
    assistantText = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('')
      .trim()
    if (!assistantText) {
      console.error(
        '[api/chat] anthropic returned no text content. stop_reason:',
        response.stop_reason,
      )
      return errorJson(
        'The companion was unable to respond just now. Please try again.',
        502,
      )
    }
  } catch (e) {
    console.error('[api/chat] anthropic call failed:', e)
    if (e instanceof Anthropic.RateLimitError) {
      return errorJson('Too many requests right now. Please wait a moment and try again.', 429)
    }
    if (e instanceof Anthropic.APIError) {
      return errorJson(
        'The companion is unavailable right now. Please try again in a moment.',
        502,
      )
    }
    return errorJson('Something went wrong. Please try again.', 500)
  }

  const { data: savedAssistant, error: assistantInsertError } = await supabase
    .from('messages')
    .insert({
      conversation_id: conversationId,
      role: 'assistant',
      content: assistantText,
    })
    .select('id')
    .single()
  if (assistantInsertError || !savedAssistant) {
    console.error(
      '[api/chat] failed to save assistant message:',
      assistantInsertError,
    )
    return errorJson('Could not save the companion response.', 500)
  }

  await supabase
    .from('conversations')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', conversationId)

  return NextResponse.json({
    conversationId,
    assistant: {
      id: savedAssistant.id,
      content: assistantText,
    },
  })
}
