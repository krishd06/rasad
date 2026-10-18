import React from 'react'
import {
  Activity,
  Radio,
  Server,
  AlertTriangle,
  Compass,
  ArrowUpRight,
} from 'lucide-react'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'

const mockTelemetry = [
  { time: '00:00', streamA: 42, streamB: 24 },
  { time: '04:00', streamA: 55, streamB: 38 },
  { time: '08:00', streamA: 82, streamB: 62 },
  { time: '12:00', streamA: 78, streamB: 71 },
  { time: '16:00', streamA: 95, streamB: 84 },
  { time: '20:00', streamA: 88, streamB: 67 },
  { time: '24:00', streamA: 64, streamB: 45 },
]

export default function OverviewPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-100 flex items-center gap-3">
            <span>Tactical Overview</span>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-950 text-emerald-400 border border-emerald-800/60 animate-pulse">
              LIVE SENSORS
            </span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Real-time sector status, grid telemetry, and geospatial node status.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg shadow-md transition-all duration-300 flex items-center gap-1.5 cursor-pointer">
            <span>Synchronize Feeds</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            title: 'Node Status',
            value: '48 / 48 Online',
            desc: '100% operational perimeter',
            icon: Server,
            color: 'text-emerald-400',
            bg: 'bg-emerald-950/40',
          },
          {
            title: 'Telemetry Bandwidth',
            value: '4.82 GB/s',
            desc: '+12% from base threshold',
            icon: Radio,
            color: 'text-cyan-400',
            bg: 'bg-cyan-950/40',
          },
          {
            title: 'Anomaly Index',
            value: '0.04 Low',
            desc: 'All sectors within baseline',
            icon: Activity,
            color: 'text-indigo-400',
            bg: 'bg-indigo-950/40',
          },
          {
            title: 'Unresolved Alerts',
            value: '3 Pending',
            desc: '1 critical priority queue',
            icon: AlertTriangle,
            color: 'text-amber-400',
            bg: 'bg-amber-950/40',
          },
        ].map((item, idx) => (
          <div
            key={idx}
            className="bg-slate-900 border border-slate-800 rounded-xl p-5 transition-all duration-300 hover:border-slate-700 hover:shadow-lg"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs uppercase tracking-wider text-slate-400 font-medium">
                {item.title}
              </span>
              <div className={`p-2 rounded-lg ${item.bg} ${item.color}`}>
                <item.icon className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-slate-100">{item.value}</div>
            <div className="text-xs text-slate-400 mt-1">{item.desc}</div>
          </div>
        ))}
      </div>

      {/* Charts & Map Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Real-time Telemetry Graph */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-5 transition-all duration-300 hover:border-slate-700">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-semibold text-slate-100">
                Network Signal Flux
              </h2>
              <p className="text-xs text-slate-400">Stream density across operational zones</p>
            </div>
            <span className="text-xs text-emerald-400 font-mono">STABLE // 60fps</span>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={mockTelemetry}>
                <defs>
                  <linearGradient id="streamAGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#059669" stopOpacity={0.6} />
                    <stop offset="95%" stopColor="#059669" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="streamBGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0284c7" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#0284c7" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="time" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#020617',
                    borderColor: '#334155',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="streamA"
                  stroke="#10b981"
                  fillOpacity={1}
                  fill="url(#streamAGrad)"
                />
                <Area
                  type="monotone"
                  dataKey="streamB"
                  stroke="#38bdf8"
                  fillOpacity={1}
                  fill="url(#streamBGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Tactical Map preview */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col transition-all duration-300 hover:border-slate-700">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-base font-semibold text-slate-100 flex items-center gap-2">
                <Compass className="w-4 h-4 text-emerald-400" />
                <span>Geospatial Radar</span>
              </h2>
              <p className="text-xs text-slate-400">Station coordinates</p>
            </div>
          </div>
          <div className="flex-1 w-full min-h-[220px] rounded-lg overflow-hidden border border-slate-800">
            <MapContainer
              center={[20.5937, 78.9629]}
              zoom={4}
              scrollWheelZoom={false}
              style={{ height: '100%', width: '100%', minHeight: '220px' }}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <Marker position={[20.5937, 78.9629]}>
                <Popup>Central Command Node [HQ]</Popup>
              </Marker>
            </MapContainer>
          </div>
        </div>
      </div>
    </div>
  )
}
