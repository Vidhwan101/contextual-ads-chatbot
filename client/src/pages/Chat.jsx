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
  const scrollContainerRef = useRef(null)
  const isUserScrolledUpRef = useRef(false)
  const loadedConversations = useRef(new Set())

  useEffect(() => {
    fetch(`${API}/api/conversations?sessionId=${sessionId}`)
      .then((r) => r.json())
      .then(setConversations)
      .catch((e) => console.error(e))
  }, [sessionId])

  // Only auto-scroll if user is near the bottom
  useEffect(() => {
  if (isUserScrolledUpRef.current) return
  const container = scrollContainerRef.current
  if (!container) return
  container.scrollTop = container.scrollHeight
  }, [messages])

// Track whether user has manually scrolled up
function handleScroll(e) {
  const el = e.currentTarget
  const distanceFromBottom =
    el.scrollHeight - el.scrollTop - el.clientHeight
  // If they're more than 80px from the bottom, they're reading history
  isUserScrolledUpRef.current = distanceFromBottom > 80
}

  useEffect(() => {
  if (!activeId) {
    setMessages([])
    return
  }
  // Already loaded this conversation in this session — don't refetch
  if (loadedConversations.current.has(activeId)) {
    return
  }
  loadedConversations.current.add(activeId)
  setLoadingMessages(true)
  fetch(`${API}/api/conversations/${activeId}`)
    .then((r) => r.json())
    .then((data) => {
      const transformed = (data.messages || []).map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        ads: (m.ads || []).map((p) => ({
          id: p.ad.id,
          messageAdId: p.id,
          advertiser: p.ad.advertiser,
          title: p.ad.title,
          body: p.ad.body,
          url: p.ad.url,
          clicked: p.clicked,
        })),
      }))
      setMessages(transformed)
    })
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
  // Mark as loaded so the effect doesn't overwrite local state we're building
  loadedConversations.current.add(conv.id)
  setActiveId(conv.id)
  return conv.id
  }

  async function deleteConversation(id, e) {
    e.stopPropagation()
    await fetch(`${API}/api/conversations/${id}`, { method: 'DELETE' })
    setConversations((prev) => prev.filter((c) => c.id !== id))
    if (activeId === id) setActiveId(null)
  }

  function trackAdClick(messageAdId) {
    // sendBeacon survives page navigation
    navigator.sendBeacon(`${API}/api/ads/${messageAdId}/click`)
  }

  async function send(e) {
    e.preventDefault()
    if (!input.trim() || streaming) return

    const userMessage = input.trim()
    setInput('')
    setStreaming(true)

    let convId = activeId
    if (!convId) {
      convId = await newConversation()
    }

    setMessages((prev) => [
      ...prev,
      { role: 'user', content: userMessage },
      { role: 'assistant', content: '', ads: [] },
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
  
  if (payload === '[DONE]') {
    console.log('[SSE] DONE')
    continue
  }

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

  if (Array.isArray(data.ads)) {
    setMessages((prev) => {
      const copy = [...prev]
      const last = copy[copy.length - 1]
      copy[copy.length - 1] = { ...last, ads: data.ads }
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
  // Refresh conversation list to pick up auto-generated title
  fetch(`${API}/api/conversations?sessionId=${sessionId}`)
    .then((r) => r.json())
    .then(setConversations)
    .catch(() => {})
}
  }

  return (
    <div className="h-screen bg-slate-50 flex overflow-hidden">
      <aside className="w-64 bg-white border-r flex flex-col overflow-hidden">
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
              <span className="truncate flex-1">{c.title || 'Untitled'}</span>
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

      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <header className="bg-white border-b px-4 py-3">
          <div className="font-semibold">AI Chatbot</div>
        </header>

        <main
            ref={scrollContainerRef}
            onScroll={handleScroll}
            className="flex-1 overflow-y-auto p-4"
          >
          <div className="max-w-2xl mx-auto space-y-4">
            {loadingMessages && (
              <p className="text-sm text-slate-400 text-center">Loading…</p>
            )}

            {!activeId && messages.length === 0 && !loadingMessages && (
              <p className="text-slate-400 text-center mt-12">
                Start a new conversation below.
              </p>
            )}

            {messages.map((m, i) => (
              <div key={i} className="space-y-2">
                <div
                  className={
                    m.role === 'user'
                      ? 'bg-slate-900 text-white rounded-2xl px-4 py-2 ml-auto max-w-[80%] w-fit'
                      : 'bg-white border rounded-2xl px-4 py-2 mr-auto max-w-[85%] whitespace-pre-wrap'
                  }
                >
                  {m.content || (
                    <span className="text-slate-400 animate-pulse">▍</span>
                  )}
                </div>

                {m.role === 'assistant' && m.ads?.length > 0 && (
                  <div className="space-y-2 pt-1">
                    <div className="flex items-center gap-2 text-xs text-slate-400 uppercase tracking-wide">
                      <span>Sponsored</span>
                      <div className="flex-1 h-px bg-slate-200" />
                    </div>
                    {m.ads.map((ad) => (
                      <a
                        key={ad.id}
                        href={ad.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => trackAdClick(ad.messageAdId)}
                        className="block bg-white border rounded-xl p-3 hover:border-slate-400 hover:shadow-sm transition-all"
                      >
                        <div className="text-xs text-slate-500 mb-1">
                          {ad.advertiser}
                        </div>
                        <div className="font-medium text-sm text-slate-900">
                          {ad.title}
                        </div>
                        <div className="text-sm text-slate-600 mt-1">
                          {ad.body}
                        </div>
                      </a>
                    ))}
                  </div>
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