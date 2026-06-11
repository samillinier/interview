'use client'

import { useEffect, useState } from 'react'

export function useSidebarOpen() {
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    if (typeof window === 'undefined') return true
    try {
      return localStorage.getItem('sidebar-collapsed') !== '1'
    } catch {
      return true
    }
  })

  const toggle = () => {
    try {
      const next = !sidebarOpen
      localStorage.setItem('sidebar-collapsed', next ? '0' : '1')
      setSidebarOpen(next)
      window.dispatchEvent(new Event('sidebar-toggle'))
    } catch {
      setSidebarOpen((v) => !v)
    }
  }

  useEffect(() => {
    const sync = () => {
      try {
        setSidebarOpen(localStorage.getItem('sidebar-collapsed') !== '1')
      } catch {
        setSidebarOpen(true)
      }
    }
    window.addEventListener('sidebar-toggle', sync)
    return () => window.removeEventListener('sidebar-toggle', sync)
  }, [])

  return { sidebarOpen, toggle }
}
