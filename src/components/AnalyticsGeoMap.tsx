'use client'

import { useEffect, useRef } from 'react'
import L from 'leaflet'

type GeoPin = {
  label: string
  type: 'workroom' | 'county'
  lat: number
  lng: number
  count: number
  avgRadiusMiles?: number
}

type Props = {
  pins: GeoPin[]
}

export function AnalyticsGeoMap({ pins }: Props) {
  const mapRef = useRef<HTMLDivElement | null>(null)
  const leafletMapRef = useRef<any>(null)

  useEffect(() => {
    let cancelled = false

    const run = async () => {
      if (!mapRef.current || leafletMapRef.current || pins.length === 0) return

      if (cancelled || !mapRef.current) return

      const greenMarkerIcon = new L.Icon({
        iconRetinaUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41],
      })

      const map = L.map(mapRef.current, {
        zoomControl: true,
        scrollWheelZoom: false,
      })
      leafletMapRef.current = map

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
      }).addTo(map)

      const bounds = L.latLngBounds([])
      pins.forEach((pin) => {
        const marker = L.marker([pin.lat, pin.lng], { icon: greenMarkerIcon }).addTo(map)
        const radius = Math.max(0, Number(pin.avgRadiusMiles || 0))
        marker.bindPopup(
          `<div style="font-size:12px;line-height:1.35">
             <strong>${pin.label}</strong><br/>
             Type: ${pin.type}<br/>
             Installers: ${pin.count}<br/>
             Avg Radius: ${radius.toFixed(1)} mi
           </div>`
        )
        if (radius > 0) {
          L.circle([pin.lat, pin.lng], {
            radius: radius * 1609.34,
            color: '#65a30d',
            fillColor: '#84cc16',
            fillOpacity: 0.12,
            weight: 1,
          }).addTo(map)
        }
        bounds.extend([pin.lat, pin.lng])
      })

      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [28, 28] })
      } else {
        map.setView([27.8, -82.5], 6)
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
  }, [pins])

  if (!pins.length) {
    return (
      <div className="h-[420px] rounded-2xl border border-slate-200 bg-slate-50 flex items-center justify-center">
        <p className="text-sm text-slate-500">No mappable workroom/county locations found.</p>
      </div>
    )
  }

  return <div ref={mapRef} className="h-[420px] rounded-2xl overflow-hidden border border-slate-200" />
}

