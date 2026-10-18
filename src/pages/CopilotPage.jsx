import React, { useState } from 'react'
import { Bot, Send, Sparkles, Terminal, Shield, RefreshCw } from 'lucide-react'

export default function CopilotPage() {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content:
        'Tactical AI Copilot initialized. All operational feeds synchronized. How may I assist your command analysis today?',
      time: '20:15:02',
    },
  ])
  const [input, setInput] = useState('')

  const handleSend = (e) => {
    e.preventDefault()
    if (!input.trim()) return

    const now = new Date().toLocaleTimeString()
    const userMsg = { role: 'user', content: input, time: now }
    const assistantMsg = {
      role: 'assistant',
      content: `Received query regarding: "${input}". Analyzing operational telemetry models across all active sectors. Simulation results normal.`,
      time: now,
    }

    setMessages((prev) => [...prev, userMsg, assistantMsg])
    setInput('')
  }

  return (
    <div className="space-y-4 flex flex-col h-[calc(100vh-8.5rem)]">
      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-100 flex items-center gap-3">
            <span>Tactical Copilot</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full font-medium bg-emerald-950 text-emerald-400 border border-emerald-800/60 flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              NEURAL AGENT
            </span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Operational intelligence assistant with command queries and natural language telemetry lookup.
          </p>
        </div>

        <button
          onClick={() =>
            setMessages([
              {
                role: 'assistant',
                content: 'Chat session reset. Ready for new instructions.',
                time: new Date().toLocaleTimeString(),
              },
            ])
          }
          className="p-2 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200 transition-all duration-300 cursor-pointer"
          title="Reset conversation"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Message area */}
      <div className="flex-1 bg-slate-900 border border-slate-800 rounded-xl p-4 overflow-y-auto space-y-4">
        {messages.map((m, idx) => (
          <div
            key={idx}
            className={`flex items-start gap-3 ${
              m.role === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            {m.role === 'assistant' && (
              <div className="w-8 h-8 rounded-lg bg-emerald-950/80 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                <Bot className="w-4 h-4" />
              </div>
            )}

            <div
              className={`max-w-xl rounded-xl p-3.5 text-sm transition-all duration-300 ${
                m.role === 'user'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'bg-slate-950 border border-slate-800 text-slate-200 shadow-sm'
              }`}
            >
              <div className="text-xs opacity-60 mb-1 font-mono">{m.time}</div>
              <p className="leading-relaxed">{m.content}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Input area */}
      <form onSubmit={handleSend} className="flex gap-2">
        <div className="relative flex-1">
          <Terminal className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Instruct tactical copilot (e.g., 'Summarize power reserves in Sector 3')..."
            className="w-full pl-10 pr-4 py-3 bg-slate-900 border border-slate-800 rounded-xl text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-all duration-300"
          />
        </div>
        <button
          type="submit"
          className="px-5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl flex items-center justify-center transition-all duration-300 cursor-pointer shadow-md"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  )
}
