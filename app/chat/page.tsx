// app/chat/page.tsx
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { signOut } from '../auth/actions'
import { ChatShell, type ChatMessage, type Conversation } from './chat-shell'

export const dynamic = 'force-dynamic'

export default async function ChatPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth?mode=signin')

  const { data: access } = await supabase
    .from('user_access')
    .select('has_companion_access')
    .eq('user_id', user.id)
    .maybeSingle()
  if (!access?.has_companion_access) redirect('/no-access')

  // Load all conversations for sidebar
  const { data: conversations } = await supabase
    .from('conversations')
    .select('id, title, updated_at')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })
    .limit(50)

  // Load messages for most recent conversation
  const mostRecent = conversations?.[0] ?? null
  let initialMessages: ChatMessage[] = []
  if (mostRecent?.id) {
    const { data: messages } = await supabase
      .from('messages')
      .select('id, role, content, created_at')
      .eq('conversation_id', mostRecent.id)
      .order('created_at', { ascending: true })
    initialMessages = (messages ?? []).map((m) => ({
      id: m.id,
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }))
  }

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-cream text-navy">
      <header className="flex shrink-0 items-center justify-between border-b border-navy/10 px-6 py-5 sm:px-10">
        <h1 className="font-display text-lg tracking-[0.18em] text-navy sm:text-xl">
          Crescendo Companion
        </h1>
        <form action={signOut}>
          <button
            type="submit"
            className="font-sans text-xs uppercase tracking-[0.22em] text-navy/70 transition-colors hover:text-gold-dark"
          >
            Sign Out
          </button>
        </form>
      </header>

      <ChatShell
        initialConversationId={mostRecent?.id ?? null}
        initialMessages={initialMessages}
        initialConversations={(conversations ?? []) as Conversation[]}
      />
    </div>
  )
}
