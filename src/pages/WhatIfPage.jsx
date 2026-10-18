import React, { useEffect, useState, useMemo } from 'react'
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Polyline,
  Popup,
  useMap,
} from 'react-leaflet'
import {
  Sliders,
  Mountain,
  AlertTriangle,
  CloudSnow,
  Thermometer,
  Wind,
  Navigation,
  CheckCircle2,
  XCircle,
  Truck,
  Plane,
  RefreshCw,
  Loader2,
  Calendar,
  Layers,
  ArrowRight,
} from 'lucide-react'
import { supabase } from '../supabaseClient'

// Free Open-Meteo fallback mock data
const MOCK_WEATHER = {
  'PASS-01': { temp: -14.2, wind: 48, snow: 12.5, condition: 'Blizzard Alert' },
  'PASS-02': { temp: -9.8, wind: 32, snow: 5.0, condition: 'Moderate Snow' },
  'PASS-03': { temp: -18.5, wind: 62, snow: 22.0, condition: 'Severe Gale & Snow' },
}

export default function WhatIfPage() {
  const [graph, setGraph] = useState(null)
  const [posts, setPosts] = useState([])
  const [forecasts, setForecasts] = useState(null)
  const [dbStock, setDbStock] = useState({})
  const [loading, setLoading] = useState(true)

  // Simulation State
  const [closedPasses, setClosedPasses] = useState(['PASS-01']) // Khardung La closed by default demo
  const [durationDays, setDurationDays] = useState(7)
  const [selectedPostId, setSelectedPostId] = useState(null)
  const [passWeather, setPassWeather] = useState({})
  const [weatherLoading, setWeatherLoading] = useState(false)

  // 1. Fetch graph, posts, forecasts, and stock
  useEffect(() => {
    async function initData() {
      setLoading(true)
      try {
        const [graphRes, postsRes, forecastsRes] = await Promise.all([
          fetch('/data/graph.json').then((r) => r.json()),
          fetch('/data/posts.json').then((r) => r.json()),
          fetch('/data/forecasts.json').then((r) => r.json()),
        ])
        setGraph(graphRes)
        setPosts(postsRes)
        setForecasts(forecastsRes)

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
        console.error('Error initializing What-If data:', err)
      } finally {
        setLoading(false)
      }
    }
    initData()
  }, [])

  // 2. Fetch live weather from free Open-Meteo API for mountain passes
  const fetchPassWeather = async (passesList, nodesList) => {
    if (!passesList || !passesList.length) return
    setWeatherLoading(true)
    const weatherMap = {}

    for (const p of passesList) {
      const node = nodesList.find((n) => n.id === p.id)
      const lat = node?.lat || 34.66
      const lon = node?.lon || 76.06

      try {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,wind_speed_10m,snowfall&timezone=auto`
        const res = await fetch(url)
        if (!res.ok) throw new Error('Open-Meteo returned status ' + res.status)
        const data = await res.json()
        const current = data.current || {}

        weatherMap[p.id] = {
          temp: current.temperature_2m ?? -12,
          wind: current.wind_speed_10m ?? 35,
          snow: current.snowfall ?? 4,
          condition:
            (current.snowfall || 0) > 2
              ? 'Heavy Snow'
              : (current.temperature_2m || 0) < -5
              ? 'Sub-Zero Freezing'
              : 'Overcast & Cold',
          source: 'Live (Open-Meteo)',
        }
      } catch {
        // Fall back to realistic mock weather
        weatherMap[p.id] = {
          ...MOCK_WEATHER[p.id],
          source: 'Estimated Offline Model',
        }
      }
    }

    setPassWeather(weatherMap)
    setWeatherLoading(false)
  }

  useEffect(() => {
    if (graph?.passes && graph?.nodes) {
      fetchPassWeather(graph.passes, graph.nodes)
    }
  }, [graph])

  // Toggle closure of a mountain pass
  const togglePass = (passId) => {
    setClosedPasses((prev) =>
      prev.includes(passId) ? prev.filter((id) => id !== passId) : [...prev, passId]
    )
  }

  // 3. Dijkstra Shortest-Path Algorithm on Graph avoiding closed passes
  // Distance is weighted by road distance * terrain difficulty
  const routeCalculation = useMemo(() => {
    if (!graph || !posts.length) return { postRoutes: {}, allRoutesDrawn: [] }

    const nodeMap = {}
    graph.nodes.forEach((n) => {
      nodeMap[n.id] = n
    })

    // Adjacency list: filter out routes crossing a closed pass
    const adj = {}
    graph.nodes.forEach((n) => {
      adj[n.id] = []
    })

    graph.routes.forEach((r) => {
      const isBlocked = r.pass && closedPasses.includes(r.pass)
      if (!isBlocked) {
        // Effective road travel cost
        const cost = r.distance_km * r.difficulty
        adj[r.from].push({ to: r.to, km: r.distance_km, cost, routeObj: r })
        adj[r.to].push({ to: r.from, km: r.distance_km, cost, routeObj: r })
      }
    })

    // Shortest path from any Depot ("D01", "D02", "D03") to a target Post
    const depotIds = graph.nodes.filter((n) => n.type === 'depot').map((n) => n.id)

    function findBestRouteToPost(targetId) {
      let bestDist = Infinity
      let bestPath = null
      let bestDepot = null

      for (const startDepot of depotIds) {
        const dist = {}
        const prev = {}
        const pq = new Set()

        graph.nodes.forEach((n) => {
          dist[n.id] = Infinity
          pq.add(n.id)
        })
        dist[startDepot] = 0

        while (pq.size > 0) {
          let u = null
          let minD = Infinity
          pq.forEach((nodeId) => {
            if (dist[nodeId] < minD) {
              minD = dist[nodeId]
              u = nodeId
            }
          })

          if (!u || minD === Infinity) break
          pq.delete(u)

          if (u === targetId) break

          adj[u]?.forEach((edge) => {
            if (pq.has(edge.to)) {
              const alt = dist[u] + edge.cost
              if (alt < dist[edge.to]) {
                dist[edge.to] = alt
                prev[edge.to] = u
              }
            }
          })
        }

        if (dist[targetId] < bestDist) {
          bestDist = dist[targetId]
          bestDepot = startDepot

          // Reconstruct path
          const path = []
          let curr = targetId
          while (curr) {
            path.unshift(curr)
            curr = prev[curr]
          }
          bestPath = path
        }
      }

      return {
        reachable: bestDist !== Infinity,
        cost: bestDist,
        depot: bestDepot,
        path: bestPath,
      }
    }

    // Baseline route without any closures (for comparing extra km)
    const baseAdj = {}
    graph.nodes.forEach((n) => {
      baseAdj[n.id] = []
    })
    graph.routes.forEach((r) => {
      const cost = r.distance_km * r.difficulty
      baseAdj[r.from].push({ to: r.to, km: r.distance_km, cost })
      baseAdj[r.to].push({ to: r.from, km: r.distance_km, cost })
    })

    function findBaselineCost(targetId) {
      let minCost = Infinity
      for (const start of depotIds) {
        const dist = {}
        const pq = new Set()
        graph.nodes.forEach((n) => {
          dist[n.id] = Infinity
          pq.add(n.id)
        })
        dist[start] = 0
        while (pq.size > 0) {
          let u = null
          let minD = Infinity
          pq.forEach((nodeId) => {
            if (dist[nodeId] < minD) {
              minD = dist[nodeId]
              u = nodeId
            }
          })
          if (!u || minD === Infinity) break
          pq.delete(u)
          if (u === targetId) break
          baseAdj[u]?.forEach((edge) => {
            if (pq.has(edge.to)) {
              const alt = dist[u] + edge.cost
              if (alt < dist[edge.to]) dist[edge.to] = alt
            }
          })
        }
        if (dist[targetId] < minCost) minCost = dist[targetId]
      }
      return minCost
    }

    const postRoutes = {}
    posts.forEach((p) => {
      const routed = findBestRouteToPost(p.id)
      const baseCost = findBaselineCost(p.id)
      const extraKm =
        routed.reachable && routed.cost > baseCost
          ? Math.round(routed.cost - baseCost)
          : 0

      postRoutes[p.id] = {
        ...routed,
        extraKm,
      }
    })

    return { postRoutes, nodeMap }
  }, [graph, posts, closedPasses])

  // 4. Impact Simulation on Supplies
  // If reachable: supplies are dispatched (stock stays sustained or renewed)
  // If cut off (no route): stock drops by expected daily usage * durationDays
  const simulationResults = useMemo(() => {
    if (!posts.length || !forecasts || !routeCalculation.postRoutes) return []

    const impactList = []

    posts.forEach((post) => {
      const pid = post.id
      const routeInfo = routeCalculation.postRoutes[pid] || { reachable: false }
      const postStock = dbStock[pid] || post.current_stock || {}
      const postForecast = forecasts[pid] || {}

      let lowestEnduranceDays = Infinity
      let criticalItem = 'fuel'
      let fallsBelow3Days = false
      let failDay = null

      Object.keys(post.current_stock || {}).forEach((supply) => {
        const stockQty = postStock[supply] ?? post.current_stock[supply] ?? 0
        const dailyExpected =
          postForecast[supply]?.next_14_days?.[0]?.expected || 1

        let projectedStock = stockQty

        // If cut off, simulate day-by-day burn
        if (!routeInfo.reachable) {
          for (let d = 1; d <= durationDays; d++) {
            const dayUse =
              postForecast[supply]?.next_14_days?.[d - 1]?.expected ||
              dailyExpected
            projectedStock = Math.max(0, projectedStock - dayUse)
            const daysLeftAtDay = projectedStock / Math.max(0.1, dailyExpected)

            if (daysLeftAtDay < 3 && (!failDay || d < failDay)) {
              fallsBelow3Days = true
              failDay = d
            }
          }
        }

        const currentDaysLeft = projectedStock / Math.max(0.1, dailyExpected)
        if (currentDaysLeft < lowestEnduranceDays) {
          lowestEnduranceDays = currentDaysLeft
          criticalItem = supply
        }
      })

      // If already below 3 days at start
      if (lowestEnduranceDays < 3 && !failDay) {
        fallsBelow3Days = true
        failDay = 1
      }

      // Suggested action
      let suggestedAction = 'Normal Ground Convoy'
      let actionBadge = 'bg-emerald-950 text-emerald-400 border-emerald-800'

      if (!routeInfo.reachable) {
        if (failDay && failDay <= 4) {
          suggestedAction = 'Emergency Air Drop (Mi-17 / C-130J)'
          actionBadge = 'bg-red-950 text-red-400 border-red-800'
        } else {
          suggestedAction = 'Early Pre-Emptive Dispatch'
          actionBadge = 'bg-amber-950 text-amber-400 border-amber-800'
        }
      } else if (routeInfo.extraKm > 0) {
        suggestedAction = `Alternate Route (+${routeInfo.extraKm} km detour)`
        actionBadge = 'bg-cyan-950 text-cyan-400 border-cyan-800'
      }

      impactList.push({
        post,
        reachable: routeInfo.reachable,
        routeInfo,
        criticalItem,
        projectedDaysLeft: Math.round(lowestEnduranceDays * 10) / 10,
        fallsBelow3Days,
        failDay,
        suggestedAction,
        actionBadge,
      })
    })

    return impactList
  }, [posts, forecasts, dbStock, routeCalculation, durationDays])

  // Filter posts that fall below 3 days of supplies
  const atRiskPostsTable = useMemo(() => {
    return simulationResults
      .filter((r) => r.fallsBelow3Days || !r.reachable)
      .sort((a, b) => (a.failDay || 99) - (b.failDay || 99))
  }, [simulationResults])

  // Selected post active path coordinates for drawing polyline
  const activePathCoordinates = useMemo(() => {
    if (!selectedPostId || !routeCalculation.postRoutes?.[selectedPostId]) return null
    const route = routeCalculation.postRoutes[selectedPostId]
    if (!route.reachable || !route.path || !routeCalculation.nodeMap) return null

    return route.path.map((nodeId) => {
      const n = routeCalculation.nodeMap[nodeId]
      return [n.lat, n.lon]
    })
  }, [selectedPostId, routeCalculation])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] space-y-4">
        <Loader2 className="w-10 h-10 text-emerald-500 animate-spin" />
        <p className="text-xs uppercase font-mono tracking-widest text-slate-400">
          Loading What-If Topology and Terrain Graphs...
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 1. Header & Live Mountain Pass Weather Cards */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-800 gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-100 flex items-center gap-3">
            <span>What-If Scenario Simulator</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full font-medium bg-emerald-950 text-emerald-400 border border-emerald-800/60">
              DISRUPTION ENGINE
            </span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Simulate seasonal snow closures, route cut-offs, and supply depletion with live mountain meteorology.
          </p>
        </div>

        <button
          onClick={() => graph && fetchPassWeather(graph.passes, graph.nodes)}
          disabled={weatherLoading}
          className="px-3 py-1.5 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 text-xs font-semibold rounded-lg flex items-center gap-2 transition-all duration-300 cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${weatherLoading ? 'animate-spin' : ''}`} />
          <span>Sync Pass Weather</span>
        </button>
      </div>

      {/* 3 Pass Status Cards with Open-Meteo Weather */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {graph?.passes.map((pass) => {
          const isClosed = closedPasses.includes(pass.id)
          const weather = passWeather[pass.id] || MOCK_WEATHER[pass.id]

          return (
            <div
              key={pass.id}
              onClick={() => togglePass(pass.id)}
              className={`p-4 rounded-xl border transition-all duration-300 cursor-pointer flex flex-col justify-between ${
                isClosed
                  ? 'bg-red-950/30 border-red-800/80 shadow-lg ring-1 ring-red-500/40'
                  : 'bg-slate-900 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-xs font-bold text-slate-400">
                    {pass.id}
                  </span>
                  <span
                    className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded uppercase tracking-wider border ${
                      isClosed
                        ? 'bg-red-950 text-red-400 border-red-800'
                        : 'bg-emerald-950 text-emerald-400 border-emerald-800'
                    }`}
                  >
                    {isClosed ? 'CLOSED (SNOWBOUND)' : 'OPEN & CLEAR'}
                  </span>
                </div>

                <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                  <Mountain className="w-4 h-4 text-slate-400" />
                  <span>{pass.name}</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Elevation: {pass.altitude_m}m • Risk: {pass.risk_level}
                </p>
              </div>

              {/* Weather snapshot */}
              <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 text-slate-300">
                  <Thermometer className="w-3.5 h-3.5 text-cyan-400" />
                  <span>{weather?.temp}°C</span>
                </div>
                <div className="flex items-center gap-1.5 text-slate-300">
                  <Wind className="w-3.5 h-3.5 text-slate-400" />
                  <span>{weather?.wind} km/h</span>
                </div>
                <div className="flex items-center gap-1.5 text-slate-300">
                  <CloudSnow className="w-3.5 h-3.5 text-cyan-300" />
                  <span>{weather?.snow} cm</span>
                </div>
              </div>

              <div className="mt-2 text-[10px] text-right text-slate-500 italic">
                {weather?.source || 'Open-Meteo'}
              </div>
            </div>
          )
        })}
      </div>

      {/* 2. Simulation Controls & Main Tactical Map */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
        {/* Controls Sidebar */}
        <div className="lg:col-span-1 bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-5 flex flex-col justify-between shadow-md">
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-800 text-slate-200 font-semibold text-xs uppercase tracking-wider">
              <Sliders className="w-4 h-4 text-emerald-400" />
              <span>Simulation Controls</span>
            </div>

            {/* Duration Slider */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-slate-300">Closure Duration:</span>
                <span className="text-emerald-400 font-mono text-sm font-bold">
                  {durationDays} Days
                </span>
              </div>
              <input
                type="range"
                min="1"
                max="14"
                value={durationDays}
                onChange={(e) => setDurationDays(Number(e.target.value))}
                className="w-full accent-emerald-500 bg-slate-800 rounded-lg cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>1 Day</span>
                <span>7 Days</span>
                <span>14 Days</span>
              </div>
            </div>

            {/* Quick Toggle Pass Checkboxes */}
            <div className="space-y-2 pt-2">
              <label className="text-xs font-semibold uppercase text-slate-400 block tracking-wider">
                Toggle Mountain Passes:
              </label>
              {graph?.passes.map((pass) => {
                const isClosed = closedPasses.includes(pass.id)
                return (
                  <label
                    key={pass.id}
                    className="flex items-center gap-2.5 p-2 rounded-lg bg-slate-950 border border-slate-800/80 cursor-pointer hover:border-slate-700 text-xs text-slate-300"
                  >
                    <input
                      type="checkbox"
                      checked={isClosed}
                      onChange={() => togglePass(pass.id)}
                      className="accent-red-500 w-4 h-4 rounded cursor-pointer"
                    />
                    <span className={isClosed ? 'text-red-400 font-semibold' : ''}>
                      {pass.name}
                    </span>
                  </label>
                )
              })}
            </div>
          </div>

          <div className="p-3 bg-slate-950 rounded-lg border border-slate-800/80 text-[11px] text-slate-400 space-y-1">
            <div className="font-semibold text-slate-300">Topology Status:</div>
            <div>
              • Cut off posts:{' '}
              <span className="font-mono text-red-400 font-bold">
                {simulationResults.filter((r) => !r.reachable).length}
              </span>
            </div>
            <div>
              • Critical threshold (&lt;3d):{' '}
              <span className="font-mono text-amber-400 font-bold">
                {atRiskPostsTable.length}
              </span>
            </div>
          </div>
        </div>

        {/* Map View */}
        <div className="lg:col-span-3 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl min-h-[460px] flex flex-col relative">
          <div className="p-3 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-slate-300">
              <Navigation className="w-4 h-4 text-emerald-400" />
              <span className="font-semibold uppercase tracking-wider">
                Supply Corridor Topology & Shortest Paths
              </span>
            </div>
            <span className="text-[11px] font-mono text-slate-400">
              Click a post or pass to inspect route
            </span>
          </div>

          <div className="flex-1 w-full h-[480px] relative z-0">
            <MapContainer
              center={[34.45, 76.25]}
              zoom={8}
              scrollWheelZoom={true}
              style={{ height: '100%', width: '100%', backgroundColor: '#020617' }}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              {/* All road segments in graph */}
              {graph?.routes.map((r, idx) => {
                const nFrom = routeCalculation.nodeMap?.[r.from]
                const nTo = routeCalculation.nodeMap?.[r.to]
                if (!nFrom || !nTo) return null

                const isBlocked = r.pass && closedPasses.includes(r.pass)

                return (
                  <Polyline
                    key={idx}
                    positions={[
                      [nFrom.lat, nFrom.lon],
                      [nTo.lat, nTo.lon],
                    ]}
                    pathOptions={{
                      color: isBlocked ? '#ef4444' : '#475569',
                      weight: isBlocked ? 4 : 2,
                      dashArray: isBlocked ? '6 6' : undefined,
                      opacity: isBlocked ? 0.9 : 0.6,
                    }}
                    eventHandlers={{
                      click: () => {
                        if (r.pass) togglePass(r.pass)
                      },
                    }}
                  >
                    <Popup>
                      <div className="text-slate-900 text-xs p-1">
                        <div className="font-bold">
                          {r.from} ➔ {r.to}
                        </div>
                        <div>Distance: {r.distance_km} km</div>
                        <div>Difficulty: x{r.difficulty}</div>
                        {r.pass && (
                          <div
                            className={`font-semibold mt-1 ${
                              isBlocked ? 'text-red-600' : 'text-emerald-700'
                            }`}
                          >
                            Pass: {r.pass} ({isBlocked ? 'CLOSED' : 'OPEN'})
                          </div>
                        )}
                      </div>
                    </Popup>
                  </Polyline>
                )
              })}

              {/* Highlight active route for selected post */}
              {activePathCoordinates && (
                <Polyline
                  positions={activePathCoordinates}
                  pathOptions={{
                    color: '#10b981',
                    weight: 5,
                    opacity: 0.95,
                  }}
                />
              )}

              {/* Depots */}
              {graph?.nodes
                .filter((n) => n.type === 'depot')
                .map((d) => (
                  <CircleMarker
                    key={d.id}
                    center={[d.lat, d.lon]}
                    radius={10}
                    pathOptions={{
                      fillColor: '#3b82f6',
                      fillOpacity: 1,
                      color: '#ffffff',
                      weight: 2,
                    }}
                  >
                    <Popup>
                      <div className="text-slate-900 text-xs font-bold">
                        Depot: {d.id} - {d.name}
                      </div>
                    </Popup>
                  </CircleMarker>
                ))}

              {/* Mountain Passes as clickable markers */}
              {graph?.passes.map((pass) => {
                const node = routeCalculation.nodeMap?.[pass.id]
                if (!node) return null
                const isClosed = closedPasses.includes(pass.id)

                return (
                  <CircleMarker
                    key={pass.id}
                    center={[node.lat, node.lon]}
                    radius={12}
                    pathOptions={{
                      fillColor: isClosed ? '#ef4444' : '#10b981',
                      fillOpacity: 0.9,
                      color: '#ffffff',
                      weight: 2,
                    }}
                    eventHandlers={{
                      click: () => togglePass(pass.id),
                    }}
                  >
                    <Popup>
                      <div className="text-slate-900 text-xs font-bold">
                        {pass.name} [{isClosed ? 'CLOSED' : 'OPEN'}]
                        <div className="font-normal">Click to toggle closure</div>
                      </div>
                    </Popup>
                  </CircleMarker>
                )
              })}

              {/* Army Posts */}
              {posts.map((p) => {
                const res = simulationResults.find((r) => r.post.id === p.id)
                const isSelected = selectedPostId === p.id
                const isCutOff = !res?.reachable

                let markerColor = '#10b981'
                if (isCutOff || res?.fallsBelow3Days) markerColor = '#ef4444'
                else if (res?.routeInfo?.extraKm > 0) markerColor = '#06b6d4'

                return (
                  <CircleMarker
                    key={p.id}
                    center={[p.latitude, p.longitude]}
                    radius={isSelected ? 13 : 8}
                    pathOptions={{
                      fillColor: markerColor,
                      fillOpacity: 0.9,
                      color: isSelected ? '#ffffff' : '#0f172a',
                      weight: isSelected ? 3 : 1.5,
                    }}
                    eventHandlers={{
                      click: () => setSelectedPostId(p.id),
                    }}
                  >
                    <Popup>
                      <div className="text-slate-900 text-xs">
                        <div className="font-bold">{p.id} - {p.name}</div>
                        <div>Status: {isCutOff ? 'CUT OFF' : 'REACHABLE'}</div>
                        <div>Days Left: {res?.projectedDaysLeft}d</div>
                      </div>
                    </Popup>
                  </CircleMarker>
                )
              })}
            </MapContainer>
          </div>
        </div>
      </div>

      {/* 3. At-Risk Posts Impact Table & Action Recommendations */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl transition-all duration-300 hover:border-slate-700">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-800 gap-2 mb-4">
          <div>
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
              <span>Posts Breaching Supply Safety Threshold (&lt; 3 Days)</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Impact projection over {durationDays} days of simulated pass disruption. Click any row to highlight its route.
            </p>
          </div>

          <span className="text-xs font-mono font-bold px-3 py-1 rounded bg-slate-950 border border-slate-800 text-slate-300">
            {atRiskPostsTable.length} Posts Impacted
          </span>
        </div>

        {atRiskPostsTable.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-sm flex flex-col items-center justify-center space-y-2">
            <CheckCircle2 className="w-8 h-8 text-emerald-400" />
            <span>All posts remain supplied and resilient during this duration!</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider text-[10px] border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Post Identifier</th>
                  <th className="py-3 px-4">Pass Access</th>
                  <th className="py-3 px-4">Deficit Item</th>
                  <th className="py-3 px-4">Projected Stock Left</th>
                  <th className="py-3 px-4">Depletion Day</th>
                  <th className="py-3 px-4">Tactical Recommended Action</th>
                  <th className="py-3 px-4 text-right">Route Inspect</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {atRiskPostsTable.map((item) => {
                  const isSelected = selectedPostId === item.post.id

                  return (
                    <tr
                      key={item.post.id}
                      onClick={() => setSelectedPostId(item.post.id)}
                      className={`hover:bg-slate-800/50 transition-colors cursor-pointer ${
                        isSelected ? 'bg-slate-800/80' : ''
                      }`}
                    >
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-200">
                        {item.post.id} - {item.post.name}
                      </td>

                      <td className="py-3.5 px-4">
                        {item.reachable ? (
                          <span className="inline-flex items-center gap-1 text-emerald-400">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Rerouted</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-red-400 font-semibold animate-pulse">
                            <XCircle className="w-3.5 h-3.5" />
                            <span>CUT OFF</span>
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 capitalize text-slate-300">
                        {item.criticalItem}
                      </td>

                      <td className="py-3.5 px-4 font-mono font-bold text-red-400">
                        {item.projectedDaysLeft} Days
                      </td>

                      <td className="py-3.5 px-4 font-mono text-slate-300">
                        {item.failDay ? `Day ${item.failDay}` : 'Immediate'}
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-block px-2.5 py-1 rounded text-[11px] font-medium border ${item.actionBadge}`}
                        >
                          {item.suggestedAction}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right font-mono text-emerald-400">
                        <span className="hover:underline flex items-center justify-end gap-1">
                          <span>Inspect</span>
                          <ArrowRight className="w-3 h-3" />
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
