'use client'

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react'

export type ChatMessage = {
  id: string
  role: 'user' | 'assistant'
  content: string
}

type Props = {
  initialConversationId: string | null
  initialMessages: ChatMessage[]
}

export function ChatShell({ initialConversationId, initialMessages }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages)
  const [conversationId, setConversationId] = useState<string | null>(
    initialConversationId,
  )
  const [input, setInput] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const scrollRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useLayoutEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages, isSending])

  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    // ~6 lines at text-base + leading-relaxed + py-3, then the textarea
    // scrolls internally instead of pushing the footer taller.
    el.style.height = `${Math.min(el.scrollHeight, 180)}px`
  }, [input])

  async function send() {
    const text = input.trim()
    if (!text || isSending) return

    const userMessage: ChatMessage = {
      id: `local-${Date.now()}`,
      role: 'user',
      content: text,
    }
    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setError(null)
    setIsSending(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          conversationId,
        }),
      })

      if (!res.ok) {
        let detail = `Something went wrong (${res.status}). Please try again.`
        try {
          const errBody = (await res.json()) as { error?: string }
          if (errBody?.error) detail = errBody.error
        } catch {
          // non-JSON response — keep the generic message
        }
        throw new Error(detail)
      }

      const payload = (await res.json()) as {
        conversationId: string
        assistant: { id: string; content: string }
      }

      setConversationId(payload.conversationId)
      setMessages((prev) => [
        ...prev,
        {
          id: payload.assistant.id,
          role: 'assistant',
          content: payload.assistant.content,
        },
      ])
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : 'Something went wrong sending your message. Please try again.',
      )
    } finally {
      setIsSending(false)
    }
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  const showEmptyState = messages.length === 0

  return (
    <>
      <main
        ref={scrollRef}
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-10 sm:px-10"
      >
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-8">
          {showEmptyState ? (
            <div className="flex flex-col items-center gap-6 py-20 text-center">
              <p className="font-display text-[0.7rem] tracking-[0.42em] text-gold">
                A QUIET BEGINNING
              </p>
              <p className="max-w-md font-serif text-2xl italic leading-relaxed text-navy/80">
                Bring your questions, your seasons, and your longing for
                holiness.
              </p>
            </div>
          ) : (
            messages.map((m) => <Bubble key={m.id} message={m} />)
          )}

          {isSending && (
            <p className="font-serif text-base italic text-navy/55">
              Companion is thinking…
            </p>
          )}
        </div>
      </main>

      <footer className="shrink-0 border-t border-navy/10 bg-cream px-6 py-5 shadow-[0_-8px_24px_-12px_rgba(22,50,69,0.08)] sm:px-10">
        <div className="mx-auto w-full max-w-2xl">
          {error && (
            <p
              role="alert"
              className="mb-3 font-sans text-sm leading-relaxed text-red-800"
            >
              {error}
            </p>
          )}

          <div className="flex items-end gap-3">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Write to your companion…"
              rows={1}
              disabled={isSending}
              className="min-h-[3rem] flex-1 resize-none overflow-y-auto border border-navy/20 bg-white/40 px-4 py-3 font-sans text-base leading-relaxed text-navy outline-none transition-colors placeholder:text-navy/40 focus:border-gold disabled:opacity-60"
            />
            <button
              type="button"
              onClick={send}
              disabled={isSending || !input.trim()}
              className="bg-navy px-6 py-3 font-sans text-xs uppercase tracking-[0.3em] text-cream transition-colors hover:bg-navy/90 disabled:cursor-not-allowed disabled:bg-navy/40"
            >
              Send
            </button>
          </div>

          <p className="mt-3 font-serif text-sm italic leading-relaxed text-navy/60">
            Crescendo Companion is a formation tool, not a substitute for the
            sacraments, a priest, or a spiritual director.
          </p>
        </div>
      </footer>
    </>
  )
}

function Bubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user'
  return (
    <div className={isUser ? 'flex justify-end' : 'flex justify-start'}>
      <div
        className={
          isUser
            ? 'max-w-[85%] bg-navy px-5 py-3 font-sans text-base leading-relaxed text-cream sm:max-w-[75%]'
            : 'max-w-[90%] border-l-2 border-gold pl-5 font-serif text-lg leading-relaxed text-navy/90'
        }
      >
        {message.content.split('\n').map((line, i) => (
          <p key={i} className={i > 0 ? 'mt-3' : ''}>
            {line || ' '}
          </p>
        ))}
      </div>
    </div>
  )
}
