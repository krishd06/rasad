import React, { useState } from 'react'
import { Sliders, Play, RotateCcw, Cpu, Zap, Layers } from 'lucide-react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts'

export default function WhatIfPage() {
  const [loadFactor, setLoadFactor] = useState(65)
  const [redundancy, setRedundancy] = useState(2)

  const simulationData = [
    { metric: 'Zone Alpha', baseline: 60, projected: Math.round(loadFactor * 0.95) },
    { metric: 'Zone Bravo', baseline: 45, projected: Math.round(loadFactor * 0.75 + redundancy * 5) },
    { metric: 'Zone Charlie', baseline: 80, projected: Math.round(loadFactor * 1.1) },
    { metric: 'Zone Delta', baseline: 55, projected: Math.round(loadFactor * 0.85) },
  ]

  return (
    <div className="space-y-6">
      <div className="pb-2 border-b border-slate-800">
        <h1 className="text-2xl font-bold tracking-tight text-slate-100 flex items-center gap-3">
          <span>What-If Scenario Simulator</span>
          <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800/60">
            PROJECTION ENGINE
          </span>
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Adjust variable parameters to model disruption risks, stress thresholds, and load spikes.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Simulation Controls */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-5 transition-all duration-300 hover:border-slate-700">
          <div className="flex items-center gap-2 text-slate-100 font-semibold text-base border-b border-slate-800 pb-3">
            <Sliders className="w-5 h-5 text-emerald-400" />
            <span>Simulation Parameters</span>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-xs font-medium">
              <span className="text-slate-300">Simulated Grid Strain</span>
              <span className="text-emerald-400 font-mono">{loadFactor}%</span>
            </div>
            <input
              type="range"
              min="10"
              max="150"
              value={loadFactor}
              onChange={(e) => setLoadFactor(Number(e.target.value))}
              className="w-full accent-emerald-500 bg-slate-800 rounded-lg cursor-pointer"
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-xs font-medium">
              <span className="text-slate-300">Failover Redundancy Level</span>
              <span className="text-emerald-400 font-mono">N+{redundancy}</span>
            </div>
            <input
              type="range"
              min="0"
              max="4"
              value={redundancy}
              onChange={(e) => setRedundancy(Number(e.target.value))}
              className="w-full accent-emerald-500 bg-slate-800 rounded-lg cursor-pointer"
            />
          </div>

          <div className="pt-2 flex gap-2">
            <button
              onClick={() => {
                setLoadFactor(65)
                setRedundancy(2)
              }}
              className="flex-1 py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-lg flex items-center justify-center gap-1.5 transition-all duration-300 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
            <button className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium rounded-lg flex items-center justify-center gap-1.5 transition-all duration-300 shadow-md cursor-pointer">
              <Play className="w-3.5 h-3.5" />
              <span>Run Monte Carlo</span>
            </button>
          </div>
        </div>

        {/* Projection Outputs */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-5 transition-all duration-300 hover:border-slate-700">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-semibold text-slate-100">
                Projected Impact vs Baseline
              </h2>
              <p className="text-xs text-slate-400">
                Zone resilience projection at {loadFactor}% strain
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1.5 text-slate-400">
                <span className="w-3 h-3 rounded bg-slate-700 inline-block"></span>
                <span>Baseline</span>
              </div>
              <div className="flex items-center gap-1.5 text-emerald-400">
                <span className="w-3 h-3 rounded bg-emerald-500 inline-block"></span>
                <span>Projected</span>
              </div>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={simulationData}>
                <XAxis dataKey="metric" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#020617',
                    borderColor: '#334155',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="baseline" fill="#334155" radius={[4, 4, 0, 0]} />
                <Bar dataKey="projected" fill="#059669" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  )
}
