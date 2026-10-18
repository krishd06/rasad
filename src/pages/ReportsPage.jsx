import React, { useEffect, useState, useMemo } from 'react'
import {
  FileText,
  Download,
  Printer,
  ShieldAlert,
  Clock,
  TrendingUp,
  Award,
  CheckCircle2,
  Calendar,
  Layers,
  Loader2,
  Utensils,
  Flame,
  Crosshair,
  Pill,
  Wrench,
} from 'lucide-react'
import { supabase } from '../supabaseClient'

const SUPPLY_TYPES = ['food', 'fuel', 'ammunition', 'medicine', 'spare_parts']

const SUPPLY_ICONS = {
  food: Utensils,
  fuel: Flame,
  ammunition: Crosshair,
  medicine: Pill,
  spare_parts: Wrench,
}

const SUPPLY_LABELS = {
  food: 'Food Rations',
  fuel: 'Fuel Reserves',
  ammunition: 'Ammunition',
  medicine: 'Medical Supplies',
  spare_parts: 'Spare Components',
}

export default function ReportsPage() {
  const [posts, setPosts] = useState([])
  const [forecasts, setForecasts] = useState(null)
  const [metrics, setMetrics] = useState(null)
  const [dbStock, setDbStock] = useState({})
  const [loading, setLoading] = useState(true)

  // Success toast state
  const [toastMessage, setToastMessage] = useState('')

  const showToast = (msg) => {
    setToastMessage(msg)
    setTimeout(() => {
      setToastMessage('')
    }, 3500)
  }

  useEffect(() => {
    async function loadReportData() {
      setLoading(true)
      try {
        const [postsRes, forecastsRes, metricsRes] = await Promise.all([
          fetch('/data/posts.json').then((r) => r.json()),
          fetch('/data/forecasts.json').then((r) => r.json()),
          fetch('/data/metrics.json').then((r) => r.json()),
        ])

        setPosts(postsRes)
        setForecasts(forecastsRes)
        setMetrics(metricsRes)

        // Query live Supabase stock
        const { data: stockRows } = await supabase.from('stock').select('*')
        if (stockRows && stockRows.length > 0) {
          const map = {}
          stockRows.forEach((r) => {
            if (!map[r.post_id]) map[r.post_id] = {}
            map[r.post_id][r.item] = Number(r.qty)
          })
          setDbStock(map)
        }
      } catch (err) {
        console.error('Failed to load report data:', err)
      } finally {
        setLoading(false)
      }
    }
    loadReportData()
  }, [])

  // 1. Calculate detailed Post analytics
  const reportRows = useMemo(() => {
    if (!posts.length || !forecasts) return []

    return posts.map((post) => {
      const pid = post.id
      const postStock = dbStock[pid] || post.current_stock || {}
      const postForecast = forecasts[pid] || {}

      let lowestDays = Infinity
      let limitingResource = 'food'
      const itemBreakdown = {}
      let total14DayExpected = 0

      SUPPLY_TYPES.forEach((item) => {
        const currentQty = postStock[item] ?? post.current_stock?.[item] ?? 0
        const dailyExpected = postForecast[item]?.next_14_days?.[0]?.expected || 1
        const daysLeft = currentQty / Math.max(0.1, dailyExpected)

        // Sum of next 14 days expected usage
        const sum14 = (postForecast[item]?.next_14_days || []).reduce(
          (acc, d) => acc + d.expected,
          0
        )
        total14DayExpected += sum14

        itemBreakdown[item] = {
          stock: currentQty,
          daysLeft: Math.round(daysLeft * 10) / 10,
          demand14: Math.round(sum14),
        }

        if (daysLeft < lowestDays) {
          lowestDays = daysLeft
          limitingResource = item
        }
      })

      return {
        id: post.id,
        name: post.name,
        altitude: post.altitude_m,
        soldiers: post.soldiers,
        lowestDays: Math.round(lowestDays * 10) / 10,
        limitingResource,
        itemBreakdown,
        total14DayExpected: Math.round(total14DayExpected),
        isAtRisk: lowestDays <= 7,
        isCritical: lowestDays < 3,
      }
    })
  }, [posts, forecasts, dbStock])

  // 2. High-level aggregates
  const postsAtRiskCount = useMemo(
    () => reportRows.filter((r) => r.isAtRisk).length,
    [reportRows]
  )

  // Lowest days left across each supply type individually
  const lowestDaysPerSupply = useMemo(() => {
    const result = {}
    SUPPLY_TYPES.forEach((type) => {
      const allDays = reportRows.map((r) => r.itemBreakdown[type]?.daysLeft || 99)
      result[type] = allDays.length ? Math.min(...allDays) : 0
    })
    return result
  }, [reportRows])

  // Total 14-day expected demand across all posts & all items
  const grandTotal14DayDemand = useMemo(() => {
    return reportRows.reduce((acc, r) => acc + r.total14DayExpected, 0)
  }, [reportRows])

  // 3. Export to CSV handler
  const handleExportCSV = () => {
    if (!reportRows.length) return

    const headers = [
      'Post ID',
      'Post Name',
      'Altitude (m)',
      'Soldiers',
      'Lowest Days Left',
      'Limiting Supply',
      'Food Stock',
      'Food Days Left',
      'Fuel Stock',
      'Fuel Days Left',
      'Ammo Stock',
      'Ammo Days Left',
      'Med Stock',
      'Med Days Left',
      'Spares Stock',
      'Spares Days Left',
      'Total 14-Day Demand',
    ]

    const csvLines = [headers.join(',')]

    reportRows.forEach((r) => {
      const line = [
        r.id,
        `"${r.name}"`,
        r.altitude,
        r.soldiers,
        r.lowestDays,
        r.limitingResource,
        r.itemBreakdown.food.stock,
        r.itemBreakdown.food.daysLeft,
        r.itemBreakdown.fuel.stock,
        r.itemBreakdown.fuel.daysLeft,
        r.itemBreakdown.ammunition.stock,
        r.itemBreakdown.ammunition.daysLeft,
        r.itemBreakdown.medicine.stock,
        r.itemBreakdown.medicine.daysLeft,
        r.itemBreakdown.spare_parts.stock,
        r.itemBreakdown.spare_parts.daysLeft,
        r.total14DayExpected,
      ]
      csvLines.push(line.join(','))
    })

    const blob = new Blob([csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `RASAD_Supply_Report_${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    showToast('CSV Report successfully downloaded to your device!')
  }

  // 4. Print handler
  const handlePrint = () => {
    window.print()
    showToast('Printer dialog launched!')
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] space-y-4">
        <Loader2 className="w-10 h-10 text-emerald-500 animate-spin" />
        <p className="text-xs uppercase font-mono tracking-widest text-slate-400">
          Compiling Tactical Supply Intelligence Briefing...
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6 print:m-0 print:p-0">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 p-3.5 rounded-xl bg-slate-900 border border-emerald-500/80 shadow-2xl flex items-center gap-2.5 text-xs text-emerald-300 animate-bounce print:hidden">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-800 gap-4 print:border-b-2 print:border-black">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-mono font-bold tracking-widest uppercase px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-400 print:text-black print:border-black">
              CLASSIFICATION: SYNTHETIC - UNCLASSIFIED
            </span>
            <span className="text-[10px] font-mono text-slate-500 print:text-black">
              DOC REF: RASAD-INTEL-{new Date().getFullYear()}
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-100 print:text-black">
            Tactical Logistics Assessment & 14-Day Demand Summary
          </h1>
          <p className="text-xs text-slate-400 mt-1 print:text-black">
            Aggregated operational reserves, limiting resource horizons, and machine learning projection benchmarks.
          </p>
        </div>

        {/* Buttons (Hidden when printing) */}
        <div className="flex items-center gap-2.5 print:hidden">
          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700/80 text-xs font-semibold rounded-lg shadow-sm transition-all duration-300 flex items-center gap-2 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={handlePrint}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg shadow-md transition-all duration-300 flex items-center gap-2 cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {/* 4 Summary Highlight Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 print:grid-cols-4 print:gap-2">
        {/* Posts at Risk */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between print:bg-white print:border-black print:text-black">
          <div className="flex items-center justify-between text-xs text-slate-400 uppercase font-medium">
            <span>Posts at Risk</span>
            <ShieldAlert className="w-4 h-4 text-amber-400 print:text-black" />
          </div>
          <div className="text-3xl font-extrabold text-slate-100 mt-2 font-mono print:text-black">
            {postsAtRiskCount} <span className="text-xs text-slate-500 font-normal">/ {posts.length}</span>
          </div>
          <div className="text-[11px] text-amber-400 mt-1 print:text-black">
            Reserves below 7-day buffer
          </div>
        </div>

        {/* Total 14-Day Demand */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between print:bg-white print:border-black print:text-black">
          <div className="flex items-center justify-between text-xs text-slate-400 uppercase font-medium">
            <span>14-Day Total Demand</span>
            <TrendingUp className="w-4 h-4 text-cyan-400 print:text-black" />
          </div>
          <div className="text-3xl font-extrabold text-slate-100 mt-2 font-mono print:text-black">
            {grandTotal14DayDemand.toLocaleString()}{' '}
            <span className="text-xs text-slate-500 font-normal">units</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1 print:text-black">
            Expected consumption across grid
          </div>
        </div>

        {/* Lowest Days Left overall */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between print:bg-white print:border-black print:text-black">
          <div className="flex items-center justify-between text-xs text-slate-400 uppercase font-medium">
            <span>Critical Burnout</span>
            <Clock className="w-4 h-4 text-red-400 print:text-black" />
          </div>
          <div className="text-3xl font-extrabold text-red-400 mt-2 font-mono print:text-black">
            {Math.min(...Object.values(lowestDaysPerSupply))} <span className="text-xs text-slate-500 font-normal">Days</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1 print:text-black">
            Most urgent sector threshold
          </div>
        </div>

        {/* Model Accuracy */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between print:bg-white print:border-black print:text-black">
          <div className="flex items-center justify-between text-xs text-slate-400 uppercase font-medium">
            <span>Model Benchmark</span>
            <Award className="w-4 h-4 text-emerald-400 print:text-black" />
          </div>
          <div className="text-3xl font-extrabold text-emerald-400 mt-2 font-mono print:text-black">
            +{metrics?.improvement_percentage || '21.5'}%
          </div>
          <div className="text-[11px] text-slate-400 mt-1 print:text-black">
            Over naive last-week baseline
          </div>
        </div>
      </div>

      {/* Lowest Days Left Per Supply Breakdown Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4.5 print:bg-white print:border-black print:text-black">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-3 print:text-black">
          Lowest Days of Supply Left by Category
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {SUPPLY_TYPES.map((type) => {
            const Icon = SUPPLY_ICONS[type]
            const minDays = lowestDaysPerSupply[type]

            let colorBadge = 'text-emerald-400 border-emerald-800/80 bg-emerald-950/60'
            if (minDays < 3) {
              colorBadge = 'text-red-400 border-red-800/80 bg-red-950/60'
            } else if (minDays <= 7) {
              colorBadge = 'text-amber-400 border-amber-800/80 bg-amber-950/60'
            }

            return (
              <div
                key={type}
                className="p-3 rounded-lg bg-slate-950 border border-slate-800 print:border-black print:bg-white flex flex-col justify-between"
              >
                <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1 print:text-black">
                  <Icon className="w-3.5 h-3.5 text-slate-400 print:text-black" />
                  <span className="capitalize">{type.replace('_', ' ')}</span>
                </div>
                <div className="flex items-baseline justify-between mt-2">
                  <span className="text-xl font-bold font-mono text-slate-100 print:text-black">
                    {minDays}d
                  </span>
                  <span
                    className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${colorBadge} print:text-black print:border-black`}
                  >
                    {minDays < 3 ? 'CRITICAL' : minDays <= 7 ? 'WARNING' : 'STABLE'}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Main Detailed Supply Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl print:bg-white print:border-black print:text-black">
        <div className="p-4 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between print:bg-white print:border-black">
          <div>
            <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider print:text-black">
              Forward Posts Logistics Breakdown
            </h3>
            <p className="text-xs text-slate-400 print:text-black">
              Sector station inventory, burnout horizon, and expected 14-day requirements.
            </p>
          </div>
          <span className="text-xs font-mono text-slate-400 print:text-black">
            Total Posts: {reportRows.length}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider text-[10px] border-b border-slate-800 print:bg-gray-100 print:text-black print:border-black">
              <tr>
                <th className="py-3 px-3.5">Post ID</th>
                <th className="py-3 px-3.5">Station Name</th>
                <th className="py-3 px-3.5">Alt / Garrison</th>
                <th className="py-3 px-3.5">Limiting Supply</th>
                <th className="py-3 px-3.5">Min Endurance</th>
                <th className="py-3 px-3.5">Food (d)</th>
                <th className="py-3 px-3.5">Fuel (d)</th>
                <th className="py-3 px-3.5">Ammo (d)</th>
                <th className="py-3 px-3.5">Med (d)</th>
                <th className="py-3 px-3.5">Spares (d)</th>
                <th className="py-3 px-3.5 text-right">14-Day Demand</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 print:divide-gray-300">
              {reportRows.map((r) => {
                const isCrit = r.isCritical
                const isWarn = r.isAtRisk && !r.isCritical

                return (
                  <tr
                    key={r.id}
                    className="hover:bg-slate-800/40 transition-colors print:hover:bg-transparent"
                  >
                    <td className="py-3 px-3.5 font-mono font-bold text-slate-200 print:text-black">
                      {r.id}
                    </td>

                    <td className="py-3 px-3.5 font-semibold text-slate-200 print:text-black">
                      {r.name}
                    </td>

                    <td className="py-3 px-3.5 text-slate-400 print:text-black font-mono">
                      {r.altitude}m • {r.soldiers}p
                    </td>

                    <td className="py-3 px-3.5 capitalize text-slate-300 print:text-black font-medium">
                      {r.limitingResource.replace('_', ' ')}
                    </td>

                    <td className="py-3 px-3.5 font-mono font-bold">
                      <span
                        className={`px-2 py-0.5 rounded text-[11px] border ${
                          isCrit
                            ? 'bg-red-950 text-red-400 border-red-800 print:text-black print:border-black'
                            : isWarn
                            ? 'bg-amber-950 text-amber-400 border-amber-800 print:text-black print:border-black'
                            : 'bg-emerald-950 text-emerald-400 border-emerald-800 print:text-black print:border-black'
                        }`}
                      >
                        {r.lowestDays} Days
                      </span>
                    </td>

                    <td className="py-3 px-3.5 font-mono text-slate-300 print:text-black">
                      {r.itemBreakdown.food.daysLeft}d
                    </td>

                    <td className="py-3 px-3.5 font-mono text-slate-300 print:text-black">
                      {r.itemBreakdown.fuel.daysLeft}d
                    </td>

                    <td className="py-3 px-3.5 font-mono text-slate-300 print:text-black">
                      {r.itemBreakdown.ammunition.daysLeft}d
                    </td>

                    <td className="py-3 px-3.5 font-mono text-slate-300 print:text-black">
                      {r.itemBreakdown.medicine.daysLeft}d
                    </td>

                    <td className="py-3 px-3.5 font-mono text-slate-300 print:text-black">
                      {r.itemBreakdown.spare_parts.daysLeft}d
                    </td>

                    <td className="py-3 px-3.5 text-right font-mono font-bold text-slate-200 print:text-black">
                      {r.total14DayExpected.toLocaleString()}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
