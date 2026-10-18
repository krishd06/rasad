import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Lock, ShieldCheck, Mail, Key } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const navigate = useNavigate()

  const handleSubmit = (e) => {
    e.preventDefault()
    // Simulated command center access authentication
    navigate('/')
  }

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-2.5rem)] p-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-xl p-8 shadow-2xl transition-all duration-300 hover:border-slate-700">
        <div className="flex justify-center mb-6">
          <div className="w-14 h-14 rounded-full bg-emerald-950/60 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
            <ShieldCheck className="w-8 h-8" />
          </div>
        </div>

        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold tracking-wider text-slate-100 uppercase">
            System Authorization
          </h2>
          <p className="text-xs text-slate-400 mt-1 uppercase tracking-widest">
            Tactical Operations Portal
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Operator Identification
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
              <input
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="operator@command.local"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition-all duration-300"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Security Clearance Key
            </label>
            <div className="relative">
              <Key className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition-all duration-300"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full mt-4 flex items-center justify-center gap-2 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-lg shadow-lg shadow-emerald-950/40 transition-all duration-300 cursor-pointer"
          >
            <Lock className="w-4 h-4" />
            <span>Authenticate Session</span>
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-slate-800/80 text-center">
          <Link
            to="/"
            className="text-xs text-slate-500 hover:text-emerald-400 transition-all duration-300"
          >
            Bypass to Tactical Overview (Demo Mode) →
          </Link>
        </div>
      </div>
    </div>
  )
}
