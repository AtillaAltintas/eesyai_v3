'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

type Message = { role: 'user' | 'assistant'; content: string };
type Chat    = { id: string; title: string; messages: Message[] };

const DEFAULT_CHAT: Chat = { id: '1', title: 'New Chat', messages: [] };
const STORAGE_KEY = 'eesyai_chats_v3';

export default function Home() {
  const router = useRouter();

  // ────────────────────────────────
  // Redirect to /login if there's no token
  useEffect(() => {
    if (typeof window !== 'undefined' && !localStorage.getItem('token')) {
      router.replace('/login');
    }
  }, [router]);

  // ────────────────────────────────
  // Chat state
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  useEffect(() => {
    if (!menuOpenId) return;
    const handleClickOutside = (e: MouseEvent) => {
      const container = document.getElementById(
        `menu-container-${menuOpenId}`
      );
      if (container && !container.contains(e.target as Node)) {
        setMenuOpenId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [menuOpenId]);

  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true) }, []);

  const [chats, setChats] = useState<Chat[]>([DEFAULT_CHAT]);
  const [activeChatId, setActiveChatId] = useState(chats[0].id);

  // Load/persist chats
  useEffect(() => {
    if (!mounted) return;
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as Chat[];
        if (parsed.length) {
          setChats(parsed);
          setActiveChatId(parsed[0].id);
        }
      } catch {}
    }
  }, [mounted]);

  useEffect(() => {
    if (!mounted) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(chats));
  }, [chats, mounted]);

  const [input, setInput]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  const activeChat = chats.find(c => c.id === activeChatId) || chats[0];

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeChat.messages.length, loading]);

  // ────────────────────────────────
  // Send message (streaming)
  const sendMessage = async () => {
    if (!input.trim()) return;
    const userInput = input;
    setInput('');

    // append user + placeholder
    setChats(prev =>
      prev.map(c =>
        c.id === activeChatId
          ? {
              ...c,
              title:
                c.messages.length === 0
                  ? userInput.slice(0, 30) + (userInput.length > 30 ? '…' : '')
                  : c.title,
              messages: [
                ...c.messages,
                { role: 'user', content: userInput },
                { role: 'assistant', content: '' }
              ],
            }
          : c
      )
    );

    setLoading(true);
    let aiContent = '';

    try {
      const history = activeChat.messages;
      const res = await fetch('http://localhost:8000/api/ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ message: userInput, history }),
      });

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();

      if (reader) {
        let done = false;
        while (!done) {
          const { value, done: isDone } = await reader.read();
          done = isDone;
          const chunk = decoder.decode(value);
          aiContent += chunk;

          // update last assistant message
          setChats(prev =>
            prev.map(c =>
              c.id === activeChatId
                ? {
                    ...c,
                    messages: c.messages.map((m, i, arr) =>
                      i === arr.length - 1 && m.role === 'assistant'
                        ? { ...m, content: aiContent }
                        : m
                    ),
                  }
                : c
            )
          );
        }
      }
    } catch {
      // on error replace placeholder
      setChats(prev =>
        prev.map(c =>
          c.id === activeChatId
            ? {
                ...c,
                messages: [
                  ...c.messages.slice(0, -1),
                  { role: 'assistant', content: '⚠️ Error during streaming.' }
                ],
              }
            : c
        )
      );
    }

    setLoading(false);
  };

  // ────────────────────────────────
  // Chat controls
  const createNewChat = () => {
    const newChat: Chat = {
      id: Date.now().toString(),
      title: 'New Chat',
      messages: []
    };
    setChats(prev => [newChat, ...prev]);
    setActiveChatId(newChat.id);
  };

  const resetAllChats = () => {
    localStorage.removeItem(STORAGE_KEY);
    setChats([DEFAULT_CHAT]);
    setActiveChatId(DEFAULT_CHAT.id);
  };

  const handleResetAll = () => {
    if (
      window.confirm('Are you sure you want to delete *all* chats?')
    ) {
      resetAllChats();
    }
  };

  const deleteChat = (id: string) => {
    setChats(prev => {
      const next = prev.filter(c => c.id !== id);
      if (id === activeChatId) {
        setActiveChatId(next[0]?.id ?? DEFAULT_CHAT.id);
      }
      return next.length ? next : [DEFAULT_CHAT];
    });
  };

  const copyChat = (id: string) => {
    const chat = chats.find(c => c.id === id);
    if (!chat) return;
    const text = chat.messages
      .map(m => `${m.role === 'user' ? 'You' : 'AI'}: ${m.content}`)
      .join('\n');
    navigator.clipboard.writeText(text);
    alert('Chat copied to clipboard!');
  };

  const handleCopy = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  // ────────────────────────────────
  // Logout action
  const handleLogout = () => {
    localStorage.removeItem('token');
    router.replace('/login');
  };

  return (
    <div className="flex h-screen bg-neutral-100">
      {/* Sidebar */}
      <aside className="flex flex-col h-screen bg-neutral-200 border-r border-neutral-300 w-72">
        <button
          onClick={createNewChat}
          className="m-4 mb-2 px-4 py-3 rounded-xl bg-gray-300 hover:bg-gray-400 font-semibold shadow transition-colors duration-150"
        >
          + Start a New Chat
        </button>

        <div className="flex-1 overflow-y-auto px-2">
          {chats.map(chat => (
            <div
              key={chat.id}
              id={`menu-container-${chat.id}`}
              className="flex items-center mb-2 relative"
            >
              <button
                onClick={() => setActiveChatId(chat.id)}
                className={`flex-1 text-left px-4 py-3 rounded-lg truncate transition-all duration-150 ${
                  chat.id === activeChatId
                    ? 'bg-neutral-700 text-white border-l-4 border-blue-500'
                    : 'bg-neutral-300 hover:bg-neutral-400 text-black'
                }`}
                style={{
                  fontWeight: chat.id === activeChatId ? 600 : 400
                }}
              >
                {chat.title}
              </button>
              <button
                onClick={() =>
                  setMenuOpenId(prev =>
                    prev === chat.id ? null : chat.id
                  )
                }
                className="px-2 py-1 bg-gray-300 text-black rounded hover:bg-gray-400"
                title="Options"
              >
                ⋮
              </button>
              {menuOpenId === chat.id && (
                <ul className="absolute right-0 mt-1 w-36 bg-white border border-gray-400 shadow-lg z-10">
                  <li
                    className="px-1 py-1 hover:bg-gray-300 text-gray-600 cursor-pointer"
                    onClick={() => {
                      deleteChat(chat.id);
                      setMenuOpenId(null);
                    }}
                  >
                    Delete Chat
                  </li>
                  <li
                    className="px-1 py-1 hover:bg-gray-300 text-gray-600 cursor-pointer"
                    onClick={() => {
                      copyChat(chat.id);
                      setMenuOpenId(null);
                    }}
                  >
                    Copy Chat
                  </li>
                </ul>
              )}
            </div>
          ))}
        </div>

        <div className="p-4">
          <button
            onClick={handleResetAll}
            className="w-full px-4 py-2 text-sm rounded bg-red-300 hover:bg-red-400 text-black"
          >
            Clear History
          </button>
        </div>
      </aside>

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col">
        {/* Header with Logout */}
        <div className="flex justify-between items-center px-6 py-4 bg-white shadow">
          <h1 className="text-3xl font-bold">🤖 EESYAI</h1>
          <button
            onClick={handleLogout}
            className="text-red-500 hover:text-red-700"
          >
            Logout
          </button>
        </div>

        <div className="flex-1 overflow-auto px-4 py-6 space-y-4">
          {activeChat.messages.map((msg, i) => (
            <div
              key={i}
              className={`p-3 rounded-md whitespace-pre-wrap break-words flex justify-between items-start ${
                msg.role === 'user'
                  ? 'bg-blue-100 text-black'
                  : 'bg-gray-100 text-black'
              }`}
            >
              <div>
                <strong>
                  {msg.role === 'user' ? 'You' : 'AI'}:
                </strong>{' '}
                {msg.content}
              </div>
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

          {loading && (
            <div className="text-gray-500 italic">AI is typing...</div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="flex gap-2 p-4">
          <input
            className="flex-1 border-2 rounded-lg px-3 py-2 border-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-400 bg-white text-black shadow"
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Ask something..."
            onKeyDown={e => e.key === 'Enter' && sendMessage()}
            disabled={loading}
          />
          <button
            className="bg-black text-white px-4 py-2 rounded-lg"
            onClick={sendMessage}
            disabled={loading}
          >
            {loading ? '...' : 'Send'}
          </button>
        </div>
      </main>
    </div>
  );
}

