import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { Loader2, ShieldAlert } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export default function ProtectedRoute({ children, allowedRoles }) {
  const { session, role, loading } = useAuth()
  const location = useLocation()

  // 1. Loading spinner while verifying session and profile role
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-10 h-10 text-emerald-500 animate-spin" />
          <p className="text-xs uppercase font-mono tracking-widest text-slate-400">
            Verifying Security Credentials...
          </p>
        </div>
      </div>
    )
  }

  // 2. Redirect to login if unauthenticated
  if (!session) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // 3. Role check if specific roles are required
  if (allowedRoles && !allowedRoles.includes(role)) {
    return (
      <div className="p-8 max-w-xl mx-auto mt-12 bg-slate-900 border border-red-900/40 rounded-xl text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-red-950/60 border border-red-700/40 text-red-400 mx-auto flex items-center justify-center">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-slate-100 uppercase tracking-wide">
          Access Restricted
        </h2>
        <p className="text-xs text-slate-400 leading-relaxed">
          Your current security clearance ({role.toUpperCase()}) does not permit access to this module.
        </p>
      </div>
    )
  }

  return children
}
