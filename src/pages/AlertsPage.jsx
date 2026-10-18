import React, { useState } from 'react'
import {
  AlertTriangle,
  ShieldAlert,
  Bell,
  CheckCircle,
  Filter,
  Clock,
} from 'lucide-react'

const alertsData = [
  {
    id: 'ALT-1092',
    level: 'CRITICAL',
    title: 'Perimeter Sensor Degradation - Sector 7',
    time: '2 mins ago',
    source: 'Telemetry Node #74',
    status: 'ACTIVE',
  },
  {
    id: 'ALT-1091',
    level: 'WARNING',
    title: 'Bandwidth Spike Over High-Security Trunk',
    time: '18 mins ago',
    source: 'Gateway-Edge-02',
    status: 'INVESTIGATING',
  },
  {
    id: 'ALT-1088',
    level: 'INFO',
    title: 'Routine Backup Synchronization Finished',
    time: '1 hour ago',
    source: 'Cloud Vault 1',
    status: 'RESOLVED',
  },
  {
    id: 'ALT-1084',
    level: 'WARNING',
    title: 'Auxiliary Power Relay Latency Discrepancy',
    time: '3 hours ago',
    source: 'Power Substation B',
    status: 'ACTIVE',
  },
]

export default function AlertsPage() {
  const [filter, setFilter] = useState('ALL')

  const filteredAlerts = alertsData.filter((a) => {
    if (filter === 'ALL') return true
    return a.level === filter
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-100 flex items-center gap-3">
            <span>Alerts & Incident Log</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full font-medium bg-red-950 text-red-400 border border-red-800/60">
              PRIORITY QUEUE
            </span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Real-time feed of system anomalies, perimeter breaches, and hardware notifications.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {['ALL', 'CRITICAL', 'WARNING', 'INFO'].map((type) => (
            <button
              key={type}
              onClick={() => setFilter(type)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-300 cursor-pointer ${
                filter === type
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {filteredAlerts.map((alert) => {
          const isCritical = alert.level === 'CRITICAL'
          const isWarning = alert.level === 'WARNING'

          return (
            <div
              key={alert.id}
              className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-all duration-300 hover:border-slate-700 hover:shadow-md"
            >
              <div className="flex items-start gap-3.5">
                <div
                  className={`p-2.5 rounded-lg mt-0.5 ${
                    isCritical
                      ? 'bg-red-950/60 text-red-400 border border-red-800/40'
                      : isWarning
                      ? 'bg-amber-950/60 text-amber-400 border border-amber-800/40'
                      : 'bg-blue-950/60 text-blue-400 border border-blue-800/40'
                  }`}
                >
                  {isCritical ? (
                    <ShieldAlert className="w-5 h-5" />
                  ) : isWarning ? (
                    <AlertTriangle className="w-5 h-5" />
                  ) : (
                    <Bell className="w-5 h-5" />
                  )}
                </div>

                <div>
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono text-xs text-slate-400">
                      {alert.id}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                        isCritical
                          ? 'bg-red-950 text-red-400 border border-red-800/50'
                          : isWarning
                          ? 'bg-amber-950 text-amber-400 border border-amber-800/50'
                          : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      {alert.level}
                    </span>
                  </div>
                  <h3 className="text-base font-semibold text-slate-100 mt-1">
                    {alert.title}
                  </h3>
                  <div className="flex items-center gap-4 text-xs text-slate-400 mt-1.5">
                    <span>Source: {alert.source}</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {alert.time}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                <button className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg transition-all duration-300 cursor-pointer">
                  Acknowledge
                </button>
                <button className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium rounded-lg transition-all duration-300 cursor-pointer">
                  Dispatch Action
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
