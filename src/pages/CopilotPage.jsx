import React, { useState, useEffect, useRef } from 'react'
import {
  Bot,
  Send,
  Sparkles,
  Terminal,
  Shield,
  RefreshCw,
  HelpCircle,
  AlertTriangle,
  Loader2,
  Clock,
  User,
  ArrowRight,
  Flame,
  Mountain,
} from 'lucide-react'
import { supabase } from '../supabaseClient'
import { useAuth } from '../context/AuthContext'

export default function CopilotPage() {
  const { session, user } = useAuth()

  const [messages, setMessages] = useState([
    {
      id: 'init-msg',
      role: 'assistant',
      content:
        'Tactical AI Copilot online. Operational feeds and supply telemetry verified. What query or scenario analysis would you like to run?',
      time: new Date().toLocaleTimeString(),
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [systemContext, setSystemContext] = useState(null)

  const messagesEndRef = useRef(null)

  // Scroll to latest message
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Gather current system data summary (stock, days left, active alerts, passes)
  const gatherSystemSummary = async () => {
    try {
      const [postsRes, forecastsRes, graphRes] = await Promise.all([
        fetch('/data/posts.json').then((r) => r.json()),
        fetch('/data/forecasts.json').then((r) => r.json()),
        fetch('/data/graph.json').then((r) => r.json()),
      ])

      const { data: stockRows } = await supabase.from('stock').select('*')
      const { data: alertsRows } = await supabase
        .from('alerts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10)

      const stockMap = {}
      if (stockRows) {
        stockRows.forEach((r) => {
          if (!stockMap[r.post_id]) stockMap[r.post_id] = {}
          stockMap[r.post_id][r.item] = Number(r.qty)
        })
      }

      // Calculate concise snapshot for each post
      const postSummaries = postsRes.map((p) => {
        const postStock = stockMap[p.id] || p.current_stock || {}
        const postForecast = forecastsRes[p.id] || {}

        const daysPerSupply = {}
        let minDays = Infinity
        let limitingItem = 'food'

        Object.keys(p.current_stock || {}).forEach((item) => {
          const qty = postStock[item] ?? p.current_stock[item] ?? 0
          const dailyUse =
            postForecast[item]?.next_14_days?.[0]?.expected || 1
          const daysLeft = Math.round((qty / Math.max(0.1, dailyUse)) * 10) / 10
          daysPerSupply[item] = { qty, dailyUse, daysLeft }

          if (daysLeft < minDays) {
            minDays = daysLeft
            limitingItem = item
          }
        })

        return {
          id: p.id,
          name: p.name,
          altitude_m: p.altitude_m,
          soldiers: p.soldiers,
          lowestDaysLeft: minDays,
          limitingItem,
          daysPerSupply,
        }
      })

      const summary = {
        posts: postSummaries,
        mountainPasses: graphRes.passes.map((pass) => ({
          id: pass.id,
          name: pass.name,
          altitude: pass.altitude_m,
          risk: pass.risk_level,
          snowClosureMonths: pass.snow_closure_months,
        })),
        recentAlerts: (alertsRows || []).map((a) => ({
          post_id: a.post_id,
          severity: a.severity,
          message: a.message,
        })),
      }

      setSystemContext(summary)
      return summary
    } catch (err) {
      console.error('Failed to gather system summary:', err)
      return null
    }
  }

  useEffect(() => {
    gatherSystemSummary()
  }, [])

  // Send question to backend API
  const handleSendQuestion = async (queryText) => {
    const textToSend = queryText || input
    if (!textToSend.trim() || loading) return

    const now = new Date().toLocaleTimeString()
    const userMsg = {
      id: String(Date.now()),
      role: 'user',
      content: textToSend,
      time: now,
    }

    setMessages((prev) => [...prev, userMsg])
    if (!queryText) setInput('')
    setLoading(true)

    try {
      // Ensure we have the latest system snapshot
      let currentContext = systemContext
      if (!currentContext) {
        currentContext = await gatherSystemSummary()
      }

      // Get valid Supabase session access token
      const token = session?.access_token || ''

      const response = await fetch('/api/copilot', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          question: textToSend,
          systemContext: currentContext,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        setMessages((prev) => [
          ...prev,
          {
            id: String(Date.now() + 1),
            role: 'assistant',
            content:
              result.error ||
              'Unable to process tactical request. Please check session credentials.',
            time: new Date().toLocaleTimeString(),
            isError: true,
          },
        ])
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: String(Date.now() + 1),
            role: 'assistant',
            content: result.answer,
            time: new Date().toLocaleTimeString(),
          },
        ])
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: String(Date.now() + 1),
          role: 'assistant',
          content:
            'Operational communication interrupted. Please confirm backend serverless service availability.',
          time: new Date().toLocaleTimeString(),
          isError: true,
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  const handleResetChat = () => {
    setMessages([
      {
        id: 'reset-msg',
        role: 'assistant',
        content:
          'Tactical Copilot conversation reset. All sensor summaries re-synchronized. Ready for orders.',
        time: new Date().toLocaleTimeString(),
      },
    ])
  }

  return (
    <div className="flex flex-col h-[calc(100vh-6.8rem)] space-y-4">
      {/* 1. Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-800 gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-100 flex items-center gap-3">
            <span>Tactical Intelligence Copilot</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full font-mono font-bold bg-emerald-950 text-emerald-400 border border-emerald-800/60 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              <span>GEMINI 2.5 NEURAL ENGINE</span>
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Read-only advisory assistant grounded in live sector inventory, 14-day forecasts, and pass telemetry.
          </p>
        </div>

        <button
          onClick={handleResetChat}
          className="p-2 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200 transition-all duration-300 cursor-pointer self-start sm:self-auto"
          title="Reset conversation"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* 2. Quick-Action Preset Buttons */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[11px] font-mono text-slate-500 uppercase tracking-wider flex items-center gap-1">
          <Terminal className="w-3 h-3 text-emerald-400" />
          <span>Quick Prompts:</span>
        </span>

        <button
          onClick={() =>
            handleSendQuestion('Which posts will run out of fuel in 7 days?')
          }
          disabled={loading}
          className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-emerald-500/60 text-slate-300 hover:text-emerald-400 text-xs font-medium transition-all duration-300 flex items-center gap-1.5 cursor-pointer shadow-sm disabled:opacity-50"
        >
          <Flame className="w-3.5 h-3.5 text-amber-400" />
          <span>Which posts will run out of fuel in 7 days?</span>
        </button>

        <button
          onClick={() =>
            handleSendQuestion('What happens if a pass closes for 5 days?')
          }
          disabled={loading}
          className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-emerald-500/60 text-slate-300 hover:text-emerald-400 text-xs font-medium transition-all duration-300 flex items-center gap-1.5 cursor-pointer shadow-sm disabled:opacity-50"
        >
          <Mountain className="w-3.5 h-3.5 text-cyan-400" />
          <span>What happens if a pass closes for 5 days?</span>
        </button>
      </div>

      {/* 3. Messages Window */}
      <div className="flex-1 bg-slate-900 border border-slate-800 rounded-xl p-4 overflow-y-auto space-y-4 shadow-xl">
        {messages.map((m) => {
          const isUser = m.role === 'user'

          return (
            <div
              key={m.id}
              className={`flex items-start gap-3 ${
                isUser ? 'justify-end' : 'justify-start'
              }`}
            >
              {!isUser && (
                <div className="w-8 h-8 rounded-lg bg-emerald-950/80 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0 shadow-md mt-0.5">
                  <Bot className="w-4 h-4" />
                </div>
              )}

              <div
                className={`max-w-2xl rounded-xl p-4 text-xs leading-relaxed transition-all duration-300 ${
                  isUser
                    ? 'bg-emerald-600 text-white shadow-lg'
                    : m.isError
                    ? 'bg-red-950/40 border border-red-800/60 text-red-200'
                    : 'bg-slate-950 border border-slate-800/90 text-slate-200 shadow-sm'
                }`}
              >
                <div className="flex items-center justify-between gap-4 text-[10px] opacity-60 mb-1.5 font-mono">
                  <span>{isUser ? user?.email || 'Commander' : 'Tactical AI'}</span>
                  <span>{m.time}</span>
                </div>

                <div className="whitespace-pre-wrap">{m.content}</div>
              </div>

              {isUser && (
                <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 shrink-0 shadow-md mt-0.5">
                  <User className="w-4 h-4" />
                </div>
              )}
            </div>
          )
        })}

        {loading && (
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-950/80 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0 shadow-md">
              <Bot className="w-4 h-4" />
            </div>
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 flex items-center gap-2 text-xs text-slate-400">
              <Loader2 className="w-4 h-4 text-emerald-400 animate-spin" />
              <span>Analyzing live telemetry and calculating projection...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 4. Chat Input Form */}
      <form
        onSubmit={(e) => {
          e.preventDefault()
          handleSendQuestion()
        }}
        className="flex gap-2"
      >
        <div className="relative flex-1">
          <Terminal className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={loading}
            placeholder="Instruct tactical copilot (e.g., 'Summarize critical stock for Post P03 and P07')..."
            className="w-full pl-10 pr-4 py-3 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-all duration-300"
          />
        </div>

        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="px-5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl flex items-center justify-center transition-all duration-300 cursor-pointer shadow-md"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </button>
      </form>
    </div>
  )
}
