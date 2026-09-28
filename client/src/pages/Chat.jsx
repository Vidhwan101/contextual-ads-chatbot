import { useEffect, useRef, useState } from 'react'

const API = 'http://localhost:4000'

export default function Chat() {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Hi! Ask me anything.' },
  ])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function send(e) {
    e.preventDefault()
    if (!input.trim() || streaming) return

    const userMessage = input.trim()
    setInput('')
    setStreaming(true)

    // Add user message + empty assistant placeholder
    setMessages((prev) => [
      ...prev,
      { role: 'user', content: userMessage },
      { role: 'assistant', content: '' },
    ])

    try {
      const res = await fetch(`${API}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage }),
      })

      if (!res.ok || !res.body) {
        throw new Error(`Request failed: ${res.status}`)
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { value, done } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })

        // SSE events are separated by \n\n
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
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-white border-b px-4 py-3">
        <div className="max-w-2xl mx-auto font-semibold">AI Chatbot</div>
      </header>

      <main className="flex-1 max-w-2xl w-full mx-auto p-4 space-y-3 overflow-y-auto">
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
  )
}