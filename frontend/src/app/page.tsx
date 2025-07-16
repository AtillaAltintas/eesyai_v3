'use client'

import { useState } from 'react'

export default function Home() {
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)

  const sendMessage = async () => {
    if (!input.trim()) return

    // Add user message to chat
    setMessages(prev => [...prev, { role: 'user', content: input }])
    setLoading(true)

    try {
      const res = await fetch('http://localhost:8000/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: input }),
      })

      const data = await res.json()
      console.log("Raw backend response:", data)

      const cleaned = data.reply
        ?.replace(/\u001b\[0m/g, '')       // remove ANSI color reset
        ?.replace(/<\|im_end\|>/g, '')     // remove end marker
        ?.trim()

      console.log("AI cleaned reply:", cleaned)

      if (cleaned) {
        setMessages(prev => [...prev, { role: 'assistant', content: cleaned }])
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: '⚠️ Empty response from server.' }])
      }
    } catch (err) {
      console.error("Fetch error:", err)
      setMessages(prev => [...prev, { role: 'assistant', content: '⚠️ Error contacting the server.' }])
    }

    setInput('')
    setLoading(false)
  }

  return (
    <main className="max-w-2xl mx-auto mt-10 px-4">
      <h1 className="text-3xl font-bold mb-6 text-center">🤖 EESYAI</h1>

      <div className="space-y-4 mb-6">
        {messages.map((msg, i) => (
          <div
  key={i}
  className={`p-3 rounded-md whitespace-pre-wrap ${
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

