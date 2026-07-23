'use client'

import { useEffect, useMemo, useRef } from 'react'

export type CilioGeoPin = {
  label: string
  country: string
  city: string
  region?: string | null
  action: string
  count: number
  lat: number
  lng: number
}

type Props = {
  pins: CilioGeoPin[]
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

export function CilioGeoMap({ pins }: Props) {
  const mapRef = useRef<HTMLDivElement | null>(null)
  const leafletMapRef = useRef<any>(null)

  const validPins = useMemo(
    () => pins.filter((pin) => Number.isFinite(pin.lat) && Number.isFinite(pin.lng)),
    [pins]
  )

  useEffect(() => {
    let cancelled = false

    const run = async () => {
      if (!mapRef.current) return
      const L = await import('leaflet')
      if (cancelled || !mapRef.current) return

      if (leafletMapRef.current) {
        leafletMapRef.current.remove()
        leafletMapRef.current = null
      }

      const map = L.map(mapRef.current, {
        zoomControl: true,
        scrollWheelZoom: false,
      })
      leafletMapRef.current = map

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 18,
      }).addTo(map)

      const bounds = L.latLngBounds([])

      validPins.forEach((pin) => {
        const blocked = pin.action === 'cilio.api_blocked'
        const marker = L.circleMarker([pin.lat, pin.lng], {
          radius: Math.min(18, 8 + Math.log2(pin.count + 1) * 3),
          color: blocked ? '#dc2626' : '#16a34a',
          fillColor: blocked ? '#ef4444' : '#22c55e',
          fillOpacity: 0.82,
          weight: 2,
        }).addTo(map)

        marker.bindPopup(
          `<div style="font-size:12px;line-height:1.4">
            <strong>${escapeHtml(pin.label)}</strong><br/>
            Status: ${blocked ? 'Blocked' : 'Allowed'}<br/>
            Country: ${escapeHtml(pin.country)}<br/>
            Calls: ${pin.count}
          </div>`
        )
        bounds.extend([pin.lat, pin.lng])
      })

      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [28, 28], maxZoom: 7 })
      } else {
        map.setView([39.5, -98.35], 4)
      }
    }

    run()

    return () => {
      cancelled = true
      if (leafletMapRef.current) {
        leafletMapRef.current.remove()
        leafletMapRef.current = null
      }
    }
  }, [validPins])

  return (
    <div className="relative">
      <div ref={mapRef} className="h-80 rounded-3xl overflow-hidden border border-slate-200" />
      {!validPins.length && (
        <div className="pointer-events-none absolute left-4 top-4 max-w-xs rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-lg">
          <p className="text-sm font-semibold text-slate-900">OpenStreetMap is ready</p>
          <p className="mt-1 text-xs text-slate-500">
            No Cilio location pins yet. New API events will appear here when Vercel provides coordinates.
          </p>
        </div>
      )}
    </div>
  )
}
