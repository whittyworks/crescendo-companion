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

export type Conversation = {
  id: string
  title: string | null
  updated_at: string
}

type Props = {
  initialConversationId: string | null
  initialMessages: ChatMessage[]
  initialConversations: Conversation[]
}

export function ChatShell({ initialConversationId, initialMessages, initialConversations }: Props) {
  const [conversations, setConversations] = useState<Conversation[]>(initialConversations)
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages)
  const [conversationId, setConversationId] = useState<string | null>(initialConversationId)
  const [input, setInput] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [streamingContent, setStreamingContent] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  const scrollRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useLayoutEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages, isSending, streamingContent])

  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 180)}px`
  }, [input])

  async function loadConversation(id: string) {
    if (id === conversationId) { setSidebarOpen(false); return }
    const res = await fetch(`/api/conversations/${id}`)
    if (!res.ok) return
    const data = await res.json() as { messages: ChatMessage[] }
    setMessages(data.messages)
    setConversationId(id)
    setStreamingContent('')
    setError(null)
    setSidebarOpen(false)
  }

  async function startNewConversation() {
    setMessages([])
    setConversationId(null)
    setStreamingContent('')
    setError(null)
    setSidebarOpen(false)
  }

  async function deleteConversation(id: string) {
    const res = await fetch(`/api/conversations/${id}`, { method: 'DELETE' })
    if (!res.ok) return
    setConversations((prev) => prev.filter((c) => c.id !== id))
    if (conversationId === id) {
      setMessages([])
      setConversationId(null)
    }
    setDeleteConfirm(null)
  }

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
    setStreamingContent('')

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, conversationId }),
      })

      if (!res.ok) {
        let detail = `Something went wrong (${res.status}). Please try again.`
        try {
          const errBody = (await res.json()) as { error?: string }
          if (errBody?.error) detail = errBody.error
        } catch { /* non-JSON */ }
        throw new Error(detail)
      }

      const reader = res.body?.getReader()
      if (!reader) throw new Error('No response stream available.')

      const decoder = new TextDecoder()
      let accumulated = ''
      let finalMessageId = ''
      let newConversationId = conversationId

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const raw = line.slice(6).trim()
          if (!raw) continue

          let event: Record<string, unknown>
          try { event = JSON.parse(raw) } catch { continue }

          if (event.type === 'init') {
            newConversationId = event.conversationId as string
            setConversationId(newConversationId)
          } else if (event.type === 'delta') {
            accumulated += event.text as string
            setStreamingContent(accumulated)
          } else if (event.type === 'done') {
            finalMessageId = event.messageId as string
            // Refresh conversation list to pick up new title/updated_at
            fetch('/api/conversations')
              .then((r) => r.json())
              .then((data: { conversations: Conversation[] }) => {
                setConversations(data.conversations)
              })
              .catch(() => {})
          } else if (event.type === 'error') {
            throw new Error(event.error as string)
          }
        }
      }

      setMessages((prev) => [
        ...prev,
        {
          id: finalMessageId || `assistant-${Date.now()}`,
          role: 'assistant',
          content: accumulated,
        },
      ])
      setStreamingContent('')
    } catch (e) {
      setError(
        e instanceof Error ? e.message : 'Something went wrong. Please try again.',
      )
      setStreamingContent('')
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

  const showEmptyState = messages.length === 0 && !isSending

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Sidebar overlay on mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-navy/30 sm:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-30 flex w-72 flex-col border-r border-navy/10 bg-cream shadow-lg
          transition-transform duration-200
          sm:relative sm:inset-auto sm:z-auto sm:shadow-none sm:translate-x-0
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full sm:translate-x-0'}
        `}
      >
        <div className="flex items-center justify-between border-b border-navy/10 px-5 py-5">
          <p className="font-display text-[0.65rem] tracking-[0.35em] text-navy/50 uppercase">
            Conversations
          </p>
          <button
            type="button"
            onClick={startNewConversation}
            className="font-sans text-[0.65rem] uppercase tracking-[0.25em] text-gold hover:text-gold/70 transition-colors"
          >
            + New
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-2">
          {conversations.length === 0 ? (
            <p className="px-5 py-4 font-serif text-sm italic text-navy/40">
              No conversations yet.
            </p>
          ) : (
            conversations.map((c) => (
              <div
                key={c.id}
                className={`group relative flex items-start gap-2 px-5 py-3 transition-colors cursor-pointer
                  ${c.id === conversationId ? 'bg-navy/5' : 'hover:bg-navy/5'}`}
              >
                <button
                  type="button"
                  onClick={() => loadConversation(c.id)}
                  className="flex-1 text-left"
                >
                  <p className={`font-sans text-sm leading-snug truncate
                    ${c.id === conversationId ? 'text-navy font-medium' : 'text-navy/70'}`}>
                    {c.title || 'Untitled conversation'}
                  </p>
                  <p className="mt-0.5 font-sans text-xs text-navy/40">
                    {new Date(c.updated_at).toLocaleDateString('en-US', {
                      month: 'short', day: 'numeric'
                    })}
                  </p>
                </button>

                {deleteConfirm === c.id ? (
                  <div className="flex items-center gap-2 shrink-0 pt-0.5">
                    <button
                      type="button"
                      onClick={() => deleteConversation(c.id)}
                      className="font-sans text-xs text-red-700 hover:text-red-900"
                    >
                      Delete
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteConfirm(null)}
                      className="font-sans text-xs text-navy/40 hover:text-navy"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setDeleteConfirm(c.id) }}
                    className="shrink-0 pt-0.5 opacity-0 group-hover:opacity-100 transition-opacity font-sans text-xs text-navy/30 hover:text-red-700"
                    aria-label="Delete conversation"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </aside>

      {/* Main chat area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile sidebar toggle */}
        <div className="flex shrink-0 items-center border-b border-navy/10 px-4 py-3 sm:hidden">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="font-sans text-xs uppercase tracking-[0.2em] text-navy/60 hover:text-navy"
          >
            ☰ Conversations
          </button>
        </div>

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
                  Bring your questions, your seasons, and your longing for holiness.
                </p>
              </div>
            ) : (
              messages.map((m) => <Bubble key={m.id} message={m} />)
            )}

            {isSending && streamingContent && (
              <Bubble message={{ id: 'streaming', role: 'assistant', content: streamingContent }} />
            )}

            {isSending && !streamingContent && (
              <p className="font-serif text-base italic text-navy/55">
                Companion is thinking…
              </p>
            )}
          </div>
        </main>

        <footer className="shrink-0 border-t border-navy/10 bg-cream px-6 py-5 shadow-[0_-8px_24px_-12px_rgba(22,50,69,0.08)] sm:px-10">
          <div className="mx-auto w-full max-w-2xl">
            {error && (
              <p role="alert" className="mb-3 font-sans text-sm leading-relaxed text-red-800">
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
              Crescendo Companion is a formation tool, not a substitute for the sacraments, a priest, or a spiritual director.
            </p>
          </div>
        </footer>
      </div>
    </div>
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
            {line || ' '}
          </p>
        ))}
      </div>
    </div>
  )
}
