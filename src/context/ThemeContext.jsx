import React, { createContext, useContext, useEffect, useState } from 'react'

const ThemeContext = createContext({
  theme: 'dark',
  isDark: true,
  toggleTheme: () => {},
})

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('rasad-theme')
    return saved === 'light' ? 'light' : 'dark'
  })

  const isDark = theme === 'dark'

  useEffect(() => {
    const root = document.documentElement
    // Correctly toggle 'dark' and 'light' classes on root html element
    root.classList.toggle('dark', isDark)
    root.classList.toggle('light', !isDark)

    if (isDark) {
      document.body.style.backgroundColor = '#020617'
      document.body.style.color = '#f8fafc'
    } else {
      document.body.style.backgroundColor = '#f8fafc'
      document.body.style.color = '#0f172a'
    }

    localStorage.setItem('rasad-theme', theme)
  }, [theme, isDark])

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))
  }

  return (
    <ThemeContext.Provider value={{ theme, isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}
