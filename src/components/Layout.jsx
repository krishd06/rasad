import React, { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Cpu,
  AlertTriangle,
  FileText,
  Bot,
  Shield,
  Menu,
  X,
  LogOut,
  User,
  Radio,
  Sun,
  Moon,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'

// Badge styling and labels for each role
const ROLE_CONFIG = {
  commander: {
    label: 'Commander',
    color: 'bg-emerald-950 text-emerald-400 border-emerald-800/80',
    dot: 'bg-emerald-400',
  },
  logistics_officer: {
    label: 'Logistics Officer',
    color: 'bg-cyan-950 text-cyan-400 border-cyan-800/80',
    dot: 'bg-cyan-400',
  },
  post_commander: {
    label: 'Post Commander',
    color: 'bg-amber-950 text-amber-400 border-amber-800/80',
    dot: 'bg-amber-400',
  },
  viewer: {
    label: 'Viewer',
    color: 'bg-slate-800 text-slate-300 border-slate-700',
    dot: 'bg-slate-400',
  },
}

// All available pages and which roles can access them
const ALL_NAV_ITEMS = [
  {
    name: 'Overview',
    path: '/',
    icon: LayoutDashboard,
    roles: ['commander', 'logistics_officer', 'post_commander', 'viewer'],
  },
  {
    name: 'What-If Simulation',
    path: '/what-if',
    icon: Cpu,
    roles: ['commander', 'logistics_officer', 'post_commander'],
  },
  {
    name: 'Alerts & Incidents',
    path: '/alerts',
    icon: AlertTriangle,
    roles: ['commander', 'logistics_officer', 'post_commander', 'viewer'],
  },
  {
    name: 'Reports',
    path: '/reports',
    icon: FileText,
    roles: ['commander', 'logistics_officer', 'viewer'],
  },
  {
    name: 'Copilot AI',
    path: '/copilot',
    icon: Bot,
    roles: ['commander', 'logistics_officer'],
  },
]

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { role, profile, user, signOut } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()

  const roleMeta = ROLE_CONFIG[role] || ROLE_CONFIG.viewer

  // Filter navigation items based on the user's role
  const visibleNavItems = ALL_NAV_ITEMS.filter((item) =>
    item.roles.includes(role)
  )

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans transition-colors duration-300">
      {/* Top Banner with Embedded Theme Toggle */}
      <div className="w-full bg-amber-500/10 border-b border-amber-500/20 py-1 px-4 flex items-center justify-between">
        <div className="w-20 hidden sm:block"></div>
        <div className="text-[11px] font-mono font-bold tracking-widest text-amber-500 dark:text-amber-400 uppercase text-center flex-1">
          SYNTHETIC - UNCLASSIFIED
        </div>
        {/* Header Theme Switcher */}
        <button
          onClick={toggleTheme}
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
          className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-slate-900 border border-slate-800 text-slate-300 hover:text-emerald-400 hover:border-emerald-500/60 transition-all duration-300 cursor-pointer shadow-sm"
        >
          {theme === 'dark' ? (
            <>
              <Sun className="w-3 h-3 text-amber-400" />
              <span>LIGHT</span>
            </>
          ) : (
            <>
              <Moon className="w-3 h-3 text-indigo-400" />
              <span>DARK</span>
            </>
          )}
        </button>
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
          <div className="flex items-center gap-2">
            <button
              onClick={toggleTheme}
              className="p-1.5 rounded-lg bg-slate-800 text-slate-300"
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-indigo-400" />
              )}
            </button>
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-1.5 rounded-lg bg-slate-800 text-slate-300"
            >
              {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Left Sidebar */}
        <aside
          className={`fixed inset-y-0 left-0 z-40 w-64 bg-slate-900 border-r border-slate-800 transform md:relative md:translate-x-0 transition-all duration-300 ease-in-out flex flex-col ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-0 max-md:-translate-x-full'
          }`}
        >
          {/* Brand header */}
          <div className="p-5 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
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

            {/* Sidebar Quick Theme Toggle */}
            <button
              onClick={toggleTheme}
              title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-indigo-400" />
              )}
            </button>
          </div>

          {/* User profile & Role Badge */}
          <div className="p-4 border-b border-slate-800/80 bg-slate-950/40">
            <div className="flex items-center gap-2.5 mb-2">
              <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 shrink-0">
                <User className="w-4 h-4" />
              </div>
              <div className="overflow-hidden">
                <div className="text-xs font-semibold text-slate-200 truncate">
                  {profile?.full_name || user?.email || 'Authenticated Operator'}
                </div>
                {profile?.post_id && (
                  <div className="text-[10px] font-mono text-emerald-400">
                    Station: {profile.post_id}
                  </div>
                )}
              </div>
            </div>

            {/* Role Badge */}
            <div
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider border ${roleMeta.color}`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${roleMeta.dot}`}></span>
              <span>{roleMeta.label}</span>
            </div>
          </div>

          {/* Nav links (filtered by role) */}
          <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
            {visibleNavItems.map((item) => {
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

          {/* Sign Out Button & System Status */}
          <div className="p-4 border-t border-slate-800 bg-slate-950/40 space-y-3">
            <button
              onClick={handleSignOut}
              className="w-full py-2 px-3 bg-slate-800/80 hover:bg-red-950/50 hover:text-red-400 hover:border-red-800/50 border border-slate-700/60 rounded-lg text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center justify-center gap-2 transition-all duration-300 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>

            <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
              <span className="flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                <span>Uplink Status</span>
              </span>
              <span className="font-mono text-emerald-400 font-semibold">SECURE</span>
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
