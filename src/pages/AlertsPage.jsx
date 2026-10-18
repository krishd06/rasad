import React, { useEffect, useState, useRef } from 'react'
import {
  AlertTriangle,
  ShieldAlert,
  Bell,
  Play,
  Square,
  RotateCcw,
  Loader2,
  Clock,
  Radio,
  Flame,
  CheckCircle2,
  Info,
  Layers,
  ChevronDown,
} from 'lucide-react'
import { supabase } from '../supabaseClient'
import { useAuth } from '../context/AuthContext'

export default function AlertsPage() {
  const { role, user } = useAuth()

  const [alerts, setAlerts] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('ALL')
  const [isSimulating, setIsSimulating] = useState(false)
  const [simMessage, setSimMessage] = useState('')
  const [resetting, setResetting] = useState(false)

  // Simulation timer reference
  const simTimerRef = useRef(null)

  // Permissions:
  // - Commander & Logistics Officer can run simulation
  // - Commander only can reset demo data
  const canSimulate = role === 'commander' || role === 'logistics_officer'
  const canReset = role === 'commander'

  // 1. Fetch initial alerts
  const fetchAlerts = async () => {
    try {
      const { data, error } = await supabase
        .from('alerts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50)

      if (!error && data) {
        setAlerts(data)
      }
    } catch (err) {
      console.error('Failed to fetch alerts:', err)
    } finally {
      setLoading(false)
    }
  }

  // 2. Set up Supabase Realtime subscription for alerts table
  useEffect(() => {
    fetchAlerts()

    const channel = supabase
      .channel('alerts-live-feed')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'alerts' },
        (payload) => {
          setAlerts((prev) => [payload.new, ...prev.filter((a) => a.id !== payload.new.id)])
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'alerts' },
        (payload) => {
          setAlerts((prev) => prev.filter((a) => a.id !== payload.old.id))
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  // 3. Live Simulation Logic:
  // Every 3 seconds, picks 2 random stock rows, lowers their quantity
  // (with occasional 35% sudden fuel drops)
  const triggerSimulationTick = async () => {
    try {
      // Get current stock rows
      const { data: stockList, error } = await supabase
        .from('stock')
        .select('*')

      if (error || !stockList || stockList.length === 0) return

      // Pick 2 random rows to simulate burn
      const randomIndices = [
        Math.floor(Math.random() * stockList.length),
        Math.floor(Math.random() * stockList.length),
      ]

      for (const idx of randomIndices) {
        const itemRow = stockList[idx]
        const currentQty = Number(itemRow.qty)
        if (currentQty <= 0) continue

        // Chance of sudden fuel leak/spike (25% chance if fuel)
        const isSuddenDrop = itemRow.item === 'fuel' && Math.random() < 0.25

        let reduction = 0
        if (isSuddenDrop) {
          reduction = Math.round(currentQty * 0.45) // 45% sudden drop
        } else {
          // Standard routine daily draw
          reduction = Math.round(Math.max(10, currentQty * (0.05 + Math.random() * 0.08)))
        }

        const newQty = Math.max(0, currentQty - reduction)

        // 1. Update Supabase stock table
        await supabase
          .from('stock')
          .update({ qty: newQty, updated_at: new Date().toISOString() })
          .eq('id', itemRow.id)

        // Estimate baseline daily burn for days left estimate
        const estimatedDailyBurn = Math.max(15, reduction * 1.2)
        const daysLeft = newQty / estimatedDailyBurn

        // 2. Condition to generate alert:
        // Either sudden drop occurred OR days left fell below 3 days
        if (isSuddenDrop || daysLeft < 3) {
          const severity = isSuddenDrop ? 'CRITICAL' : daysLeft < 1.5 ? 'CRITICAL' : 'WARNING'
          const alertMsg = isSuddenDrop
            ? `SUDDEN FUEL PRESSURE DROP at Post ${itemRow.post_id}: Immediate drain of ${reduction}L detected.`
            : `SUPPLY WARNING: Post ${itemRow.post_id} ${itemRow.item} critically low (${newQty} left, ~${daysLeft.toFixed(1)} days endurance).`

          // Insert into alerts table
          const { error: alertInsertErr } = await supabase.from('alerts').insert({
            post_id: itemRow.post_id,
            item: itemRow.item,
            severity,
            message: alertMsg,
            created_at: new Date().toISOString(),
          })

          // Insert into audit_log table
          await supabase.from('audit_log').insert({
            actor: user?.id || null,
            action: isSuddenDrop ? 'SUDDEN_SUPPLY_LOSS' : 'RESERVE_DEPLETION_ALERT',
            details: `Post ${itemRow.post_id} ${itemRow.item} stock updated to ${newQty}. Alert logged with severity ${severity}.`,
            created_at: new Date().toISOString(),
          })

          setSimMessage(`Alert fired for ${itemRow.post_id} (${itemRow.item})!`)
        }
      }
    } catch (err) {
      console.error('Simulation tick error:', err)
    }
  }

  // Start / Stop Simulation Loop
  const toggleSimulation = () => {
    if (!canSimulate) return

    if (isSimulating) {
      clearInterval(simTimerRef.current)
      simTimerRef.current = null
      setIsSimulating(false)
      setSimMessage('Live simulation paused.')
    } else {
      setIsSimulating(true)
      setSimMessage('Live simulation running (burn tick every 3s)...')
      // Immediate first tick, then interval
      triggerSimulationTick()
      simTimerRef.current = setInterval(triggerSimulationTick, 3000)
    }
  }

  // Cleanup simulation interval on unmount
  useEffect(() => {
    return () => {
      if (simTimerRef.current) {
        clearInterval(simTimerRef.current)
      }
    }
  }, [])

  // 4. Reset Demo Data (Commander Only)
  // Restores stock table values directly from public/data/posts.json
  const handleResetData = async () => {
    if (!canReset) return
    setResetting(true)
    setSimMessage('Restoring baseline stock levels...')

    try {
      const postsRes = await fetch('/data/posts.json').then((r) => r.json())
      const stockInserts = []

      postsRes.forEach((p) => {
        Object.entries(p.current_stock || {}).forEach(([item, qty]) => {
          stockInserts.push({
            post_id: p.id,
            item,
            qty,
            updated_at: new Date().toISOString(),
          })
        })
      })

      // Update existing rows
      for (const entry of stockInserts) {
        await supabase
          .from('stock')
          .update({ qty: entry.qty, updated_at: entry.updated_at })
          .eq('post_id', entry.post_id)
          .eq('item', entry.item)
      }

      // Record audit log for reset
      await supabase.from('audit_log').insert({
        actor: user?.id || null,
        action: 'RESET_DEMO_DATA',
        details: 'Commander restored all stock reserves to baseline from posts.json.',
        created_at: new Date().toISOString(),
      })

      setSimMessage('Demo stock successfully reset to full baseline!')
    } catch (err) {
      console.error('Failed to reset demo stock:', err)
      setSimMessage('Failed to reset stock. Check permissions.')
    } finally {
      setResetting(false)
    }
  }

  // Filter alerts by severity
  const filteredAlerts = alerts.filter((a) => {
    if (filter === 'ALL') return true
    return a.severity?.toUpperCase() === filter
  })

  // Summary counts
  const criticalCount = alerts.filter((a) => a.severity?.toUpperCase() === 'CRITICAL').length
  const warningCount = alerts.filter((a) => a.severity?.toUpperCase() === 'WARNING').length

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between pb-3 border-b border-slate-800 gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-100 flex items-center gap-3">
            <span>Incident Command & Realtime Alerts</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full font-mono font-bold bg-emerald-950 text-emerald-400 border border-emerald-800/60 flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5 animate-pulse text-emerald-400" />
              <span>SUPABASE REALTIME ACTIVE</span>
            </span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Realtime operational alerts, sudden fuel drop sensors, and simulated supply burn.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Simulation Button (Commander & Logistics Officer) */}
          {canSimulate ? (
            <button
              onClick={toggleSimulation}
              className={`px-4 py-2 text-xs font-semibold rounded-lg shadow-md transition-all duration-300 flex items-center gap-2 cursor-pointer ${
                isSimulating
                  ? 'bg-red-600 hover:bg-red-500 text-white animate-pulse'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white'
              }`}
            >
              {isSimulating ? (
                <>
                  <Square className="w-3.5 h-3.5" />
                  <span>Stop Simulation</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5" />
                  <span>Run Live Simulation (3s)</span>
                </>
              )}
            </button>
          ) : (
            <div className="text-[11px] text-slate-500 italic bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg">
              Simulation controls restricted to Officers
            </div>
          )}

          {/* Reset Demo Data (Commander Only) */}
          {canReset && (
            <button
              onClick={handleResetData}
              disabled={resetting}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 transition-all duration-300 flex items-center gap-2 cursor-pointer shadow-sm"
            >
              {resetting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <RotateCcw className="w-3.5 h-3.5" />
              )}
              <span>Reset Demo Data</span>
            </button>
          )}
        </div>
      </div>

      {/* Status banner when simulation is running */}
      {simMessage && (
        <div className="p-3 rounded-xl bg-slate-900 border border-emerald-500/40 text-emerald-400 text-xs flex items-center justify-between animate-fadeIn">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 animate-pulse" />
            <span>{simMessage}</span>
          </div>
          {isSimulating && (
            <span className="font-mono text-[10px] text-slate-400">Next tick in 3s...</span>
          )}
        </div>
      )}

      {/* Metric summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
          <div>
            <span className="text-xs uppercase tracking-wider text-slate-400 font-medium">
              Total Alerts Logged
            </span>
            <div className="text-2xl font-bold text-slate-100 mt-1">
              {alerts.length}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">Live broadcast queue</div>
          </div>
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-slate-300">
            <Bell className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
          <div>
            <span className="text-xs uppercase tracking-wider text-slate-400 font-medium">
              Critical Incidents
            </span>
            <div className="text-2xl font-bold text-red-400 mt-1">
              {criticalCount}
            </div>
            <div className="text-[11px] text-red-400/80 mt-0.5">Under 3 days / Sudden Drops</div>
          </div>
          <div className="p-3 rounded-xl bg-red-950/60 border border-red-800/40 text-red-400">
            <ShieldAlert className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
          <div>
            <span className="text-xs uppercase tracking-wider text-slate-400 font-medium">
              Warnings & Advisories
            </span>
            <div className="text-2xl font-bold text-amber-400 mt-1">
              {warningCount}
            </div>
            <div className="text-[11px] text-amber-400/80 mt-0.5">Approaching minimum threshold</div>
          </div>
          <div className="p-3 rounded-xl bg-amber-950/60 border border-amber-800/40 text-amber-400">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center justify-between pb-2">
        <div className="flex items-center gap-2">
          {['ALL', 'CRITICAL', 'WARNING', 'INFO'].map((type) => (
            <button
              key={type}
              onClick={() => setFilter(type)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all duration-300 cursor-pointer ${
                filter === type
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              {type}
            </button>
          ))}
        </div>

        <span className="text-xs text-slate-500 font-mono">
          Showing {filteredAlerts.length} entries
        </span>
      </div>

      {/* Alerts Feed List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
        </div>
      ) : filteredAlerts.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center space-y-2">
          <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
          <h3 className="text-sm font-semibold text-slate-200">No active incidents matching filter</h3>
          <p className="text-xs text-slate-500">
            Run the live simulation above to generate real-time stock depletion events.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredAlerts.map((a) => {
            const isCrit = a.severity?.toUpperCase() === 'CRITICAL'
            const isWarn = a.severity?.toUpperCase() === 'WARNING'
            const isFuel = a.item === 'fuel'

            return (
              <div
                key={a.id}
                className="bg-slate-900 border border-slate-800 rounded-xl p-4.5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-all duration-300 hover:border-slate-700 shadow-md"
              >
                <div className="flex items-start gap-3.5">
                  <div
                    className={`p-2.5 rounded-xl mt-0.5 shrink-0 border ${
                      isCrit
                        ? 'bg-red-950/80 text-red-400 border-red-800/60'
                        : isWarn
                        ? 'bg-amber-950/80 text-amber-400 border-amber-800/60'
                        : 'bg-slate-950 text-slate-400 border-slate-800'
                    }`}
                  >
                    {isFuel && isCrit ? (
                      <Flame className="w-5 h-5 text-red-400 animate-pulse" />
                    ) : isCrit ? (
                      <ShieldAlert className="w-5 h-5" />
                    ) : isWarn ? (
                      <AlertTriangle className="w-5 h-5" />
                    ) : (
                      <Info className="w-5 h-5" />
                    )}
                  </div>

                  <div>
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="font-mono text-xs font-bold text-slate-300 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                        Post {a.post_id}
                      </span>
                      <span
                        className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${
                          isCrit
                            ? 'bg-red-950 text-red-400 border-red-800'
                            : isWarn
                            ? 'bg-amber-950 text-amber-400 border-amber-800'
                            : 'bg-slate-800 text-slate-300 border-slate-700'
                        }`}
                      >
                        {a.severity}
                      </span>
                      {a.item && (
                        <span className="text-[10px] font-mono capitalize text-slate-400">
                          Resource: {a.item}
                        </span>
                      )}
                    </div>

                    <p className="text-sm font-semibold text-slate-100 mt-1.5 leading-snug">
                      {a.message}
                    </p>

                    <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{new Date(a.created_at).toLocaleTimeString()}</span>
                      <span>•</span>
                      <span>{new Date(a.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full md:w-auto justify-end shrink-0">
                  <button className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-lg transition-all duration-300 cursor-pointer">
                    Acknowledge
                  </button>
                  <button className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium rounded-lg transition-all duration-300 cursor-pointer">
                    Dispatch
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
