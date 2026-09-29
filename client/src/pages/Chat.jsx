import { useEffect, useRef, useState } from 'react'

const API = 'http://localhost:4000'

function getSessionId() {
  let id = localStorage.getItem('sessionId')
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem('sessionId', id)
  }
  return id
}

export default function Chat() {
  const [sessionId] = useState(getSessionId)
  const [conversations, setConversations] = useState([])
  const [activeId, setActiveId] = useState(null)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const bottomRef = useRef(null)

  // Load conversation list on mount
  useEffect(() => {
    fetch(`${API}/api/conversations?sessionId=${sessionId}`)
      .then((r) => r.json())
      .then(setConversations)
      .catch((e) => console.error(e))
  }, [sessionId])

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Load messages when active conversation changes
  useEffect(() => {
    if (!activeId) {
      setMessages([])
      return
    }
    setLoadingMessages(true)
    fetch(`${API}/api/conversations/${activeId}`)
      .then((r) => r.json())
      .then((data) => setMessages(data.messages || []))
      .catch((e) => console.error(e))
      .finally(() => setLoadingMessages(false))
  }, [activeId])

  async function newConversation() {
    const res = await fetch(`${API}/api/conversations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId }),
    })
    const conv = await res.json()
    setConversations((prev) => [conv, ...prev])
    setActiveId(conv.id)
    return conv.id
  }

  async function deleteConversation(id, e) {
    e.stopPropagation()
    await fetch(`${API}/api/conversations/${id}`, { method: 'DELETE' })
    setConversations((prev) => prev.filter((c) => c.id !== id))
    if (activeId === id) setActiveId(null)
  }

  async function send(e) {
    e.preventDefault()
    if (!input.trim() || streaming) return

    const userMessage = input.trim()
    setInput('')
    setStreaming(true)

    // Create conversation if none active
    let convId = activeId
    if (!convId) {
      convId = await newConversation()
    }

    setMessages((prev) => [
      ...prev,
      { role: 'user', content: userMessage },
      { role: 'assistant', content: '' },
    ])

    try {
      const res = await fetch(`${API}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage, conversationId: convId }),
      })

      if (!res.ok || !res.body) throw new Error(`Request failed: ${res.status}`)

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })

        const parts = buffer.split('\n\n')
        buffer = parts.pop() ?? ''

        for (const part of parts) {
          if (!part.startsWith('data: ')) continue
          const payload = part.slice(6)
          if (payload === '[DONE]') continue

          const data = JSON.parse(payload)
          if (data.error) throw new Error(data.error)

          if (data.text) {
            setMessages((prev) => {
              const copy = [...prev]
              const last = copy[copy.length - 1]
              copy[copy.length - 1] = {
                ...last,
                content: last.content + data.text,
              }
              return copy
            })
          }
        }
      }
    } catch (err) {
      setMessages((prev) => {
        const copy = [...prev]
        const last = copy[copy.length - 1]
        copy[copy.length - 1] = {
          ...last,
          content: last.content || `Error: ${err.message}`,
        }
        return copy
      })
    } finally {
      setStreaming(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r flex flex-col">
        <div className="p-3 border-b">
          <button
            onClick={() => setActiveId(null)}
            className="w-full bg-slate-900 text-white rounded-lg py-2 text-sm hover:bg-slate-700"
          >
            + New chat
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {conversations.length === 0 && (
            <p className="text-xs text-slate-400 px-2 py-3">No chats yet.</p>
          )}
          {conversations.map((c) => (
            <div
              key={c.id}
              onClick={() => setActiveId(c.id)}
              className={
                'group flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer text-sm ' +
                (activeId === c.id
                  ? 'bg-slate-100 text-slate-900'
                  : 'text-slate-600 hover:bg-slate-50')
              }
            >
              <span className="truncate flex-1">
                {c.title || 'Untitled'}
              </span>
              <button
                onClick={(e) => deleteConversation(c.id, e)}
                className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-600 text-xs"
                title="Delete"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col">
        <header className="bg-white border-b px-4 py-3">
          <div className="font-semibold">AI Chatbot</div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 space-y-3">
          <div className="max-w-2xl mx-auto space-y-3">
            {loadingMessages && (
              <p className="text-sm text-slate-400 text-center">Loading…</p>
            )}

            {!activeId && messages.length === 0 && !loadingMessages && (
              <p className="text-slate-400 text-center mt-12">
                Start a new conversation below.
              </p>
            )}

            {messages.map((m, i) => (
              <div
                key={i}
                className={
                  m.role === 'user'
                    ? 'bg-slate-900 text-white rounded-2xl px-4 py-2 ml-auto max-w-[80%] w-fit'
                    : 'bg-white border rounded-2xl px-4 py-2 mr-auto max-w-[80%] w-fit whitespace-pre-wrap'
                }
              >
                {m.content || (
                  <span className="text-slate-400 animate-pulse">▍</span>
                )}
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
        </main>

        <form onSubmit={send} className="border-t bg-white p-4">
          <div className="max-w-2xl mx-auto flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask anything…"
              disabled={streaming}
              className="flex-1 border rounded-lg px-3 py-2 outline-none focus:border-slate-400 disabled:bg-slate-100"
            />
            <button
              disabled={streaming}
              className="bg-slate-900 text-white rounded-lg px-4 hover:bg-slate-700 disabled:opacity-50"
            >
              Send
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}