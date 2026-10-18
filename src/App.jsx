import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import OverviewPage from './pages/OverviewPage'
import WhatIfPage from './pages/WhatIfPage'
import AlertsPage from './pages/AlertsPage'
import ReportsPage from './pages/ReportsPage'
import CopilotPage from './pages/CopilotPage'
import LoginPage from './pages/LoginPage'

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public Login Route (No sign-up) */}
            <Route path="/login" element={<LoginPage />} />

            {/* Protected Routes (Require Authentication) */}
            <Route
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              {/* Overview: accessible to all authenticated roles */}
              <Route path="/" element={<OverviewPage />} />

              {/* What-If Simulation */}
              <Route
                path="/what-if"
                element={
                  <ProtectedRoute allowedRoles={['commander', 'logistics_officer', 'post_commander']}>
                    <WhatIfPage />
                  </ProtectedRoute>
                }
              />

              {/* Alerts & Incidents: accessible to all authenticated roles */}
              <Route path="/alerts" element={<AlertsPage />} />

              {/* Reports */}
              <Route
                path="/reports"
                element={
                  <ProtectedRoute allowedRoles={['commander', 'logistics_officer', 'viewer']}>
                    <ReportsPage />
                  </ProtectedRoute>
                }
              />

              {/* Tactical Copilot AI */}
              <Route
                path="/copilot"
                element={
                  <ProtectedRoute allowedRoles={['commander', 'logistics_officer']}>
                    <CopilotPage />
                  </ProtectedRoute>
                }
              />
            </Route>

            {/* Catch-all fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  )
}
