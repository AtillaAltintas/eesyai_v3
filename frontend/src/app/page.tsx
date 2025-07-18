'use client'

import { useState } from 'react'

export default function Home() {
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)

  const sendMessage = async () => {
  if (!input.trim()) return

  setMessages(prev => [...prev, { role: 'user', content: input }])
  setLoading(true)

  const controller = new AbortController()
  const newMsg = { role: 'assistant', content: '' }
  setMessages(prev => [...prev, newMsg])

  try {
    const history = messages.filter(msg => msg.role === 'user' || msg.role === 'assistant')

    const res = await fetch('http://localhost:8001/api/ai', {
	  method: 'POST',
	  headers: { 'Content-Type': 'application/json' },
	  body: JSON.stringify({ message: input, history }),
	})

    const reader = res.body?.getReader()
    const decoder = new TextDecoder()

    if (reader) {
      let done = false
      while (!done) {
        const { value, done: isDone } = await reader.read()
        done = isDone
        const chunk = decoder.decode(value)

        setMessages(prev => {
          const last = prev[prev.length - 1]
          if (last.role !== 'assistant') return prev
          const updated = { ...last, content: last.content + chunk }
          return [...prev.slice(0, -1), updated]
        })
      }
    }
  } catch (err) {
    setMessages(prev => [...prev, { role: 'assistant', content: '⚠️ Error during streaming.' }])
  }

  setInput('')
  setLoading(false)
}


  return (
    <main className="max-w-2xl mx-auto mt-10 px-4">
      <h1 className="text-3xl font-bold mb-6 text-center">🤖 EESYAI</h1>
      
      {loading && <div className="text-gray-500 italic">AI is typing...</div>}
      
      <div className="space-y-4 mb-6">
        {messages.map((msg, i) => (
          <div
  key={i}
  className={`p-3 rounded-md whitespace-pre-wrap break-words ${
    msg.role === 'user' ? 'bg-blue-100 text-black' : 'bg-gray-100 text-black'
  }`}
>

            <strong>{msg.role === 'user' ? 'You' : 'AI'}:</strong> {msg.content}
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <input
          className="flex-1 border rounded px-3 py-2"
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask something..."
          onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
          disabled={loading}
        />
        <button
          className="bg-black text-white px-4 py-2 rounded"
          onClick={sendMessage}
          disabled={loading}
        >
          {loading ? '...' : 'Send'}
        </button>
      </div>
    </main>
  )
}

