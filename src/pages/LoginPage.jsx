import React, { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Shield, Lock, Mail, AlertCircle, Loader2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const { signIn, session } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  // Redirect if already logged in
  const from = location.state?.from?.pathname || '/'
  if (session) {
    navigate(from, { replace: true })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErrorMessage('')

    if (!email.trim() || !password) {
      setErrorMessage('Please enter both your command email and password.')
      return
    }

    setIsSubmitting(true)
    try {
      const { error } = await signIn(email, password)

      if (error) {
        // Map raw errors to friendly, tactical yet simple user messages
        if (
          error.message?.includes('Invalid login credentials') ||
          error.status === 400
        ) {
          setErrorMessage('Invalid credentials. Please double check your email and password.')
        } else if (error.message?.includes('Email not confirmed')) {
          setErrorMessage('Your account email has not been activated yet.')
        } else if (error.message?.includes('rate limit')) {
          setErrorMessage('Too many sign-in attempts. Please pause for a moment and try again.')
        } else {
          setErrorMessage('Unable to authorize session. Please verify your connection and try again.')
        }
      } else {
        navigate(from, { replace: true })
      }
    } catch {
      setErrorMessage('Unable to connect to the authorization server. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
      {/* Top Banner */}
      <div className="absolute top-0 inset-x-0 bg-amber-500/10 border-b border-amber-500/20 py-1 px-4 text-center">
        <span className="text-[11px] font-mono font-bold tracking-widest text-amber-400 uppercase">
          SYNTHETIC - UNCLASSIFIED
        </span>
      </div>

      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl transition-all duration-300 hover:border-slate-700">
        {/* Header Icon */}
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-emerald-950/80 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-lg shadow-emerald-950/40">
            <Shield className="w-8 h-8" />
          </div>
        </div>

        {/* Title */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold tracking-wider text-slate-100 uppercase">
            Rasad Command Center
          </h1>
          <p className="text-xs text-slate-400 mt-1 uppercase tracking-widest">
            Operator Authorization Terminal
          </p>
        </div>

        {/* Friendly Error Alert */}
        {errorMessage && (
          <div className="mb-5 p-3.5 bg-red-950/40 border border-red-800/60 rounded-xl flex items-start gap-3 text-red-300 text-xs animate-shake">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
            <p className="leading-relaxed">{errorMessage}</p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Operator Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="commander@rasad.demo"
                autoComplete="email"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition-all duration-300"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Passcode
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                autoComplete="current-password"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition-all duration-300"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full mt-2 flex items-center justify-center gap-2 py-3 px-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg shadow-lg shadow-emerald-950/40 transition-all duration-300 cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Authenticating...</span>
              </>
            ) : (
              <span>Sign In to Terminal</span>
            )}
          </button>
        </form>

        <div className="mt-6 pt-5 border-t border-slate-800/80 text-center">
          <p className="text-[11px] text-slate-500">
            Internal access restricted. Demo accounts configured in <span className="font-mono text-slate-400">demo-logins.txt</span>.
          </p>
        </div>
      </div>
    </div>
  )
}
