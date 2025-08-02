'use client'

import { useState } from 'react'

type Message = { role: string; content: string }
type Chat = { id: string; title: string; messages: Message[] }

export default function Home() {
  // Multi-chat state
  const [chats, setChats] = useState<Chat[]>([
    { id: '1', title: 'New Chat', messages: [] }
  ])
  const [activeChatId, setActiveChatId] = useState('1')
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)

  // Copy state
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null)

  const activeChat = chats.find((c) => c.id === activeChatId)!

  // Send message (streaming as before)
  const sendMessage = async () => {
  if (!input.trim()) return

  // 1. If this is the first message in the chat, set title to it
  setChats(prev =>
    prev.map(chat =>
      chat.id === activeChatId
        ? {
            ...chat,
            title:
              chat.messages.length === 0
                ? input.slice(0, 30) + (input.length > 30 ? '…' : '')
                : chat.title,
            messages: [
              ...chat.messages,
              { role: 'user', content: input },
              { role: 'assistant', content: '' }
            ]
          }
        : chat
    )
  )
  setLoading(true)
  setInput('')

  try {
    const history = chats.find((c) => c.id === activeChatId)!.messages

    // streaming chat
    const res = await fetch('/api/ai', {
       method: "POST",
       headers: {
         "Content-Type": "application/json",
         Authorization: `Bearer ${localStorage.getItem("token")}`,
       },
       body: JSON.stringify({ message: userInput, history }),
     });

    const reader = res.body?.getReader()
    const decoder = new TextDecoder()
    let aiContent = ''

    if (reader) {
      let done = false
      while (!done) {
        const { value, done: isDone } = await reader.read()
        done = isDone
        const chunk = decoder.decode(value)
        aiContent += chunk
        setChats(prev =>
          prev.map(chat =>
            chat.id === activeChatId
              ? {
                  ...chat,
                  messages: chat.messages.map((m, i, arr) =>
                    i === arr.length - 1 && m.role === 'assistant'
                      ? { ...m, content: aiContent }
                      : m
                  ),
                }
              : chat
          )
        )
      }
    }
  } catch (err) {
    setChats(prev =>
      prev.map(chat =>
        chat.id === activeChatId
          ? {
              ...chat,
              messages: [
                ...chat.messages.slice(0, -1),
                { role: 'assistant', content: '⚠️ Error during streaming.' }
              ]
            }
          : chat
      )
    )
  }

  setLoading(false)
}


  // Create new chat
  const createNewChat = () => {
    const newId = Date.now().toString()
    setChats(prev => [
      ...prev,
      { id: newId, title: 'New Chat', messages: [] }
    ])
    setActiveChatId(newId)
  }

  // Switch chat
  const switchChat = (id: string) => setActiveChatId(id)

  // Copy answer
  const handleCopy = (content: string, idx: number) => {
    navigator.clipboard.writeText(content)
    setCopiedIdx(idx)
    setTimeout(() => setCopiedIdx(null), 1200)
  }

  return (
  <div className="flex h-screen bg-neutral-100">
    {/* Sidebar */}
    <div className="flex flex-col h-screen bg-neutral-200 border-r border-neutral-300 w-72">
      <button
        className="m-4 mb-2 px-4 py-3 rounded-xl font-semibold bg-gray-300 hover:bg-gray-400 shadow transition-colors duration-150"
        onClick={createNewChat}
      >
        + New Chat
      </button>
      <div className="flex-1 overflow-y-auto">
        {chats.map(chat => (
          <button
            key={chat.id}
            onClick={() => setActiveChatId(chat.id)}
            className={
              "w-full text-left px-4 py-3 rounded-lg mb-2 truncate transition-all duration-150 " +
              (chat.id === activeChatId
                ? "bg-neutral-700 text-white border-l-4 border-blue-500 shadow"
                : "bg-neutral-300 hover:bg-neutral-400 text-black")
            }
            style={{
              fontWeight: chat.id === activeChatId ? 600 : 400,
            }}
          >
            {chat.title}
          </button>
        ))}
      </div>
    </div>

    {/* Main chat area */}
    <main className="flex-1 flex flex-col">
      <h1 className="text-3xl font-bold mb-6 text-center mt-10">🤖 EESYAI</h1>
      <div className="space-y-4 mb-6 flex-1 overflow-auto px-4">
        {activeChat.messages.map((msg, i) => (
          <div
            key={i}
            className={`p-3 rounded-md whitespace-pre-wrap break-words flex justify-between items-center ${
              msg.role === 'user' ? 'bg-blue-100 text-black' : 'bg-gray-100 text-black'
            }`}
          >
            <div>
              <strong>{msg.role === 'user' ? 'You' : 'AI'}:</strong> {msg.content}
            </div>
            {/* Copy button for AI messages */}
            {msg.role === 'assistant' && msg.content && (
              <button
                onClick={() => handleCopy(msg.content, i)}
                className="ml-3 px-2 py-1 rounded bg-gray-300 hover:bg-gray-400 text-xs"
                title="Copy answer"
              >
                {copiedIdx === i ? '✅' : 'Copy'}
              </button>
            )}
          </div>
        ))}
        {loading && <div className="text-gray-500 italic">AI is typing...</div>}
      </div>

      {/* Input */}
      <div className="flex gap-2 p-4">
        <input
          className="
    flex-1 border-2 rounded-lg px-3 py-2 
    border-gray-400
    focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-400
    bg-white text-black
    dark:bg-neutral-900 dark:text-white
    dark:border-cyan-400
    dark:focus:border-yellow-400 dark:focus:ring-yellow-300
    shadow
    transition-all
  "
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
  </div>
)
}
