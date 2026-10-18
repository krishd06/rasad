import React, { useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  Cpu,
  AlertTriangle,
  FileText,
  Bot,
  LogIn,
  Shield,
  Menu,
  X,
  Radio,
} from 'lucide-react'

const navItems = [
  { name: 'Overview', path: '/', icon: LayoutDashboard },
  { name: 'What-If Simulation', path: '/what-if', icon: Cpu },
  { name: 'Alerts & Incidents', path: '/alerts', icon: AlertTriangle },
  { name: 'Reports', path: '/reports', icon: FileText },
  { name: 'Copilot AI', path: '/copilot', icon: Bot },
  { name: 'Authentication', path: '/login', icon: LogIn },
]

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const location = useLocation()

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Small Banner */}
      <div className="w-full bg-amber-500/10 border-b border-amber-500/20 py-1 px-4 text-center">
        <span className="text-[11px] font-mono font-bold tracking-widest text-amber-400 uppercase">
          SYNTHETIC - UNCLASSIFIED
        </span>
      </div>

      <div className="flex-1 flex flex-col md:flex-row">
        {/* Mobile top bar */}
        <div className="md:hidden flex items-center justify-between p-4 bg-slate-900 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-emerald-500" />
            <span className="font-bold text-sm tracking-wider uppercase text-slate-100">
              Command HQ
            </span>
          </div>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1.5 rounded-lg bg-slate-800 text-slate-300"
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Left Sidebar */}
        <aside
          className={`fixed inset-y-0 left-0 z-40 w-64 bg-slate-900 border-r border-slate-800 transform md:relative md:translate-x-0 transition-transform duration-300 ease-in-out flex flex-col ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-0 max-md:-translate-x-full'
          }`}
        >
          {/* Brand header */}
          <div className="p-5 border-b border-slate-800 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-950 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-md">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-sm tracking-wider uppercase text-slate-100 flex items-center gap-1.5">
                <span>Rasad HQ</span>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              </div>
              <div className="text-[10px] text-slate-500 font-mono tracking-widest uppercase">
                Tactical Terminal
              </div>
            </div>
          </div>

          {/* Nav links */}
          <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
            {navItems.map((item) => {
              const Icon = item.icon
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all duration-300 ${
                      isActive
                        ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-950/50'
                        : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
                    }`
                  }
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.name}</span>
                </NavLink>
              )
            })}
          </nav>

          {/* System status footer */}
          <div className="p-4 border-t border-slate-800 bg-slate-950/40">
            <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
              <span className="flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                <span>Uplink Status</span>
              </span>
              <span className="font-mono text-emerald-400 font-semibold">SECURE</span>
            </div>
            <div className="text-[10px] text-slate-500 font-mono">
              DEFCON 4 • 99.98% NODE INTEGRITY
            </div>
          </div>
        </aside>

        {/* Backdrop for mobile */}
        {sidebarOpen && (
          <div
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs z-30 md:hidden"
          ></div>
        )}

        {/* Main Content Area */}
        <main className="flex-1 p-4 md:p-8 overflow-y-auto max-w-7xl mx-auto w-full">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
