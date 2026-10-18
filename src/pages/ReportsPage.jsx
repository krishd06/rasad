import React from 'react'
import { FileText, Download, Calendar, ArrowDownToLine, Eye } from 'lucide-react'

const reports = [
  {
    id: 'REP-2026-004',
    title: 'Weekly Cybernetic Perimeter Assessment',
    category: 'Perimeter Defense',
    date: 'Oct 18, 2026',
    classification: 'UNCLASSIFIED // SYNTHETIC',
    size: '2.4 MB',
  },
  {
    id: 'REP-2026-003',
    title: 'Tactical Bandwidth Latency Audit',
    category: 'Communications',
    date: 'Oct 15, 2026',
    classification: 'UNCLASSIFIED // SYNTHETIC',
    size: '1.1 MB',
  },
  {
    id: 'REP-2026-002',
    title: 'Failover Battery & Substation Reserves Diagnostic',
    category: 'Infrastructure',
    date: 'Oct 12, 2026',
    classification: 'UNCLASSIFIED // SYNTHETIC',
    size: '4.8 MB',
  },
  {
    id: 'REP-2026-001',
    title: 'Sensor Calibration & Node Baseline Report',
    category: 'Sensors',
    date: 'Oct 01, 2026',
    classification: 'UNCLASSIFIED // SYNTHETIC',
    size: '3.6 MB',
  },
]

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-100 flex items-center gap-3">
            <span>Intelligence & Reports</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full font-medium bg-emerald-950 text-emerald-400 border border-emerald-800/60">
              ARCHIVE
            </span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Generated operational telemetry audits and system assessment briefings.
          </p>
        </div>

        <button className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg shadow-md transition-all duration-300 flex items-center gap-2 cursor-pointer self-start sm:self-auto">
          <FileText className="w-3.5 h-3.5" />
          <span>Generate New Briefing</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {reports.map((report) => (
          <div
            key={report.id}
            className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col justify-between transition-all duration-300 hover:border-slate-700 hover:shadow-lg"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-mono text-emerald-400">
                  {report.id}
                </span>
                <span className="text-[10px] font-mono tracking-widest px-2 py-0.5 rounded bg-slate-950 text-slate-400 border border-slate-800">
                  {report.classification}
                </span>
              </div>
              <h3 className="text-base font-semibold text-slate-100 mt-1">
                {report.title}
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Category: {report.category}
              </p>
            </div>

            <div className="mt-5 pt-4 border-t border-slate-800/80 flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <Calendar className="w-3.5 h-3.5" />
                <span>{report.date}</span>
                <span className="mx-1">•</span>
                <span>{report.size}</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  title="View Briefing"
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all duration-300 cursor-pointer"
                >
                  <Eye className="w-4 h-4" />
                </button>
                <button
                  title="Download File"
                  className="p-1.5 rounded-lg bg-emerald-950 hover:bg-emerald-900 text-emerald-400 border border-emerald-800/50 transition-all duration-300 cursor-pointer"
                >
                  <ArrowDownToLine className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
