import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { getAnthropic } from '@/lib/anthropic'
import { SYSTEM_PROMPT } from '@/lib/system-prompt'

const MODEL = 'claude-opus-4-7'
const MAX_TOKENS = 16000
const HISTORY_LIMIT = 20

export const maxDuration = 60

export async function POST(req: Request) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return new Response(JSON.stringify({ error: 'Not signed in.' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const { data: access } = await supabase
    .from('user_access')
    .select('has_companion_access')
    .eq('user_id', user.id)
    .maybeSingle()
  if (!access?.has_companion_access) {
    return new Response(
      JSON.stringify({ error: 'You do not have access to Crescendo Companion.' }),
      { status: 403, headers: { 'Content-Type': 'application/json' } }
    )
  }

  let body: { message?: unknown; conversationId?: unknown }
  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid request body.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const message =
    typeof body.message === 'string' ? body.message.trim() : ''
  if (!message) {
    return new Response(JSON.stringify({ error: 'Message is empty.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

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
      return new Response(
        JSON.stringify({ error: 'Could not start a new conversation.' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
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
    return new Response(
      JSON.stringify({ error: 'Could not save your message.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }

  const { data: history, error: historyError } = await supabase
    .from('messages')
    .select('role, content, created_at')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false })
    .limit(HISTORY_LIMIT)
  if (historyError) {
    console.error('[api/chat] failed to load history:', historyError)
    return new Response(
      JSON.stringify({ error: 'Could not load conversation history.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }

  const chronological = (history ?? []).slice().reverse()
  const anthropicMessages: Anthropic.MessageParam[] = chronological.map(
    (m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }),
  )

  // Create a streaming response
  const encoder = new TextEncoder()
  const stream = new TransformStream()
  const writer = stream.writable.getWriter()

  // Run the Anthropic stream in the background
  ;(async () => {
    let assistantText = ''
    try {
      const anthropic = getAnthropic()
      const anthropicStream = await anthropic.messages.create({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        stream: true,
        system: [
          {
            type: 'text',
            text: SYSTEM_PROMPT,
            cache_control: { type: 'ephemeral' },
          },
        ],
        messages: anthropicMessages,
      })

      // First chunk: send conversationId so the client can track it
      await writer.write(
        encoder.encode(
          `data: ${JSON.stringify({ type: 'init', conversationId })}\n\n`
        )
      )

      for await (const event of anthropicStream) {
        if (
          event.type === 'content_block_delta' &&
          event.delta.type === 'text_delta'
        ) {
          const chunk = event.delta.text
          assistantText += chunk
          await writer.write(
            encoder.encode(
              `data: ${JSON.stringify({ type: 'delta', text: chunk })}\n\n`
            )
          )
        }
      }

      // Save the completed response to Supabase
      const { data: savedAssistant, error: assistantInsertError } =
        await supabase
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
          assistantInsertError
        )
        await writer.write(
          encoder.encode(
            `data: ${JSON.stringify({ type: 'error', error: 'Could not save the companion response.' })}\n\n`
          )
        )
      } else {
        await supabase
          .from('conversations')
          .update({ updated_at: new Date().toISOString() })
          .eq('id', conversationId)

        await writer.write(
          encoder.encode(
            `data: ${JSON.stringify({ type: 'done', messageId: savedAssistant.id })}\n\n`
          )
        )
      }
    } catch (e) {
      console.error('[api/chat] stream error:', e)
      let errorMsg = 'Something went wrong. Please try again.'
      if (e instanceof Anthropic.RateLimitError) {
        errorMsg = 'Too many requests right now. Please wait a moment and try again.'
      } else if (e instanceof Anthropic.APIError) {
        errorMsg = 'The companion is unavailable right now. Please try again in a moment.'
      }
      await writer.write(
        encoder.encode(
          `data: ${JSON.stringify({ type: 'error', error: errorMsg })}\n\n`
        )
      )
    } finally {
      await writer.close()
    }
  })()

  return new Response(stream.readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}