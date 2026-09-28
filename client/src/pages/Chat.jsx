import { useEffect, useRef, useState } from 'react'

const API = 'http://localhost:4000'

export default function Chat() {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Hi! Ask me anything.' },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function send(e) {
    e.preventDefault()
    if (!input.trim() || loading) return

    const userMessage = { role: 'user', content: input.trim() }
    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setLoading(true)

    try {
      const res = await fetch(`${API}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage.content }),
      })

      if (!res.ok) throw new Error(`Request failed: ${res.status}`)

      const data = await res.json()
      setMessages((prev) => [...prev, { role: 'assistant', content: data.reply }])
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: `Error: ${err.message}` },
      ])
    } finally {
      setLoading(false)
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
            {m.content}
          </div>
        ))}

        {loading && (
          <div className="bg-white border rounded-2xl px-4 py-2 mr-auto w-fit text-slate-400">
            Thinking…
          </div>
        )}

        <div ref={bottomRef} />
      </main>

      <form onSubmit={send} className="border-t bg-white p-4">
        <div className="max-w-2xl mx-auto flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask anything…"
            disabled={loading}
            className="flex-1 border rounded-lg px-3 py-2 outline-none focus:border-slate-400 disabled:bg-slate-100"
          />
          <button
            disabled={loading}
            className="bg-slate-900 text-white rounded-lg px-4 hover:bg-slate-700 disabled:opacity-50"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  )
}