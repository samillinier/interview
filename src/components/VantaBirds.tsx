'use client'

import { useEffect, useRef } from 'react'

declare global {
  interface Window {
    THREE: any
    VANTA: any
  }
}

export function VantaBirds() {
  const containerRef = useRef<HTMLDivElement>(null)
  const vantaRef = useRef<any>(null)

  useEffect(() => {
    if (vantaRef.current || !containerRef.current) return

    const init = async () => {
      try {
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement('script')
          script.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r134/three.min.js'
          script.async = true
          script.onload = () => resolve()
          script.onerror = () => reject(new Error('three.js failed'))
          document.head.appendChild(script)
        })

        await new Promise<void>((resolve, reject) => {
          const script = document.createElement('script')
          script.src = 'https://cdn.jsdelivr.net/npm/vanta@0.5.24/dist/vanta.clouds.min.js'
          script.async = true
          script.onload = () => resolve()
          script.onerror = () => reject(new Error('vanta.clouds failed'))
          document.head.appendChild(script)
        })

        if (!window.VANTA || !containerRef.current) return

        vantaRef.current = window.VANTA.CLOUDS({
          el: containerRef.current,
          mouseControls: true,
          touchControls: true,
          gyroControls: false,
          minHeight: 200.0,
          minWidth: 200.0,
          speed: 0.5,
          backgroundColor: 0x8CB63C,
        })
      } catch (err) {
        console.error('Vanta clouds error:', err)
      }
    }

    init()

    return () => {
      if (vantaRef.current) {
        vantaRef.current.destroy()
        vantaRef.current = null
      }
    }
  }, [])

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 bg-brand-green"
    />
  )
}
