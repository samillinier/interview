'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { MapPin } from 'lucide-react'
import { stateLabel } from '@/lib/us-states'

export type MarketingMapLead = {
  companyName: string
  websiteHost: string
  website?: string | null
  phone?: string | null
  city?: string | null
  state?: string | null
  lat?: number | null
  lng?: number | null
}

type Props = {
  leads: MarketingMapLead[]
  stateCode: string
  placeLabel?: string
  focus?: { lat: number; lng: number; zoom: number } | null
  selectedHost?: string | null
  onSelectHost?: (host: string) => void
  onSelectState?: (stateCode: string) => void
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

type MapStyle = 'map' | 'satellite'

export function MarketingLeadsMap({ leads, stateCode, placeLabel, focus, selectedHost, onSelectHost }: Props) {
  const mapRef = useRef<HTMLDivElement | null>(null)
  const leafletMapRef = useRef<any>(null)
  const markersRef = useRef<Map<string, any>>(new Map())
  const tilesRef = useRef<{ osm: any; satellite: any; active: any } | null>(null)
  const onSelectHostRef = useRef(onSelectHost)
  onSelectHostRef.current = onSelectHost
  const [mapStyle, setMapStyle] = useState<MapStyle>('map')
  const mapStyleRef = useRef<MapStyle>(mapStyle)
  mapStyleRef.current = mapStyle

  const applyMapStyle = (style: MapStyle) => {
    const map = leafletMapRef.current
    const tiles = tilesRef.current
    if (!map || !tiles) return
    const next = style === 'satellite' ? tiles.satellite : tiles.osm
    if (tiles.active && map.hasLayer(tiles.active) && tiles.active !== next) {
      map.removeLayer(tiles.active)
    }
    if (!map.hasLayer(next)) map.addLayer(next)
    tiles.active = next
  }

  const pins = useMemo(() => {
    const used = new Map<string, number>()
    return leads.map((lead, index) => {
      const hasPoint = Number.isFinite(Number(lead.lat)) && Number.isFinite(Number(lead.lng))
      if (hasPoint) return lead
      if (!focus || !Number.isFinite(focus.lat) || !Number.isFinite(focus.lng)) return lead
      const stamp = `${focus.lat.toFixed(4)},${focus.lng.toFixed(4)}`
      const offset = used.get(stamp) || 0
      used.set(stamp, offset + 1)
      const angle = (offset + index) * 2.399
      const dist = 0.01 + 0.007 * (offset + 1)
      return {
        ...lead,
        lat: focus.lat + Math.cos(angle) * dist,
        lng: focus.lng + Math.sin(angle) * dist,
      }
    }).filter((lead) => Number.isFinite(Number(lead.lat)) && Number.isFinite(Number(lead.lng)))
  }, [leads, focus])

  useEffect(() => {
    let cancelled = false

    const run = async () => {
      if (!mapRef.current) return
      const L = (await import('leaflet')).default
      if (cancelled || !mapRef.current) return

      if (leafletMapRef.current) {
        leafletMapRef.current.remove()
        leafletMapRef.current = null
        markersRef.current.clear()
        tilesRef.current = null
      }

      const map = L.map(mapRef.current, {
        zoomControl: true,
        scrollWheelZoom: false,
        attributionControl: false,
      }).setView([39.8283, -98.5795], 4)
      leafletMapRef.current = map

      const osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 })
      const satellite = L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        { maxZoom: 19 },
      )
      const start = mapStyleRef.current === 'satellite' ? satellite : osm
      start.addTo(map)
      tilesRef.current = { osm, satellite, active: start }

      const icon = new L.Icon({
        iconRetinaUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41],
      })

      const bounds = L.latLngBounds([])
      pins.forEach((lead) => {
        const marker = L.marker([Number(lead.lat), Number(lead.lng)], { icon }).addTo(map)
        const place = [lead.city, lead.state].filter(Boolean).join(', ')
        marker.bindPopup(
          `<div style="font-size:12px;line-height:1.4;min-width:140px">
             <strong>${escapeHtml(lead.companyName)}</strong><br/>
             ${place ? `${escapeHtml(place)}<br/>` : ''}
             ${lead.phone ? `${escapeHtml(lead.phone)}<br/>` : ''}
             <span style="color:#64748b">${escapeHtml(lead.websiteHost)}</span>
           </div>`,
        )
        marker.on('click', () => onSelectHostRef.current?.(lead.websiteHost))
        markersRef.current.set(lead.websiteHost, marker)
        bounds.extend([Number(lead.lat), Number(lead.lng)])
      })

      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [36, 36], maxZoom: 12 })
      } else if (focus && Number.isFinite(focus.lat) && Number.isFinite(focus.lng)) {
        map.setView([focus.lat, focus.lng], focus.zoom || 11)
      }

      window.setTimeout(() => map.invalidateSize(), 80)
      const resize = () => map.invalidateSize()
      window.addEventListener('resize', resize)
      const observer = typeof ResizeObserver !== 'undefined' && mapRef.current
        ? new ResizeObserver(resize)
        : null
      if (observer && mapRef.current) observer.observe(mapRef.current)
      ;(map as any)._marketingCleanup = () => {
        window.removeEventListener('resize', resize)
        observer?.disconnect()
      }
    }

    void run()

    return () => {
      cancelled = true
      if (leafletMapRef.current) {
        leafletMapRef.current._marketingCleanup?.()
        leafletMapRef.current.remove()
        leafletMapRef.current = null
      }
      markersRef.current.clear()
      tilesRef.current = null
    }
  }, [pins, stateCode, focus?.lat, focus?.lng, focus?.zoom])

  useEffect(() => {
    applyMapStyle(mapStyle)
  }, [mapStyle])

  useEffect(() => {
    if (!selectedHost) return
    const marker = markersRef.current.get(selectedHost)
    if (!marker || !leafletMapRef.current) return
    const latLng = marker.getLatLng()
    leafletMapRef.current.setView(latLng, Math.max(leafletMapRef.current.getZoom(), 10), { animate: true })
    marker.openPopup()
  }, [selectedHost])

  const looking = placeLabel || stateLabel(stateCode) || 'the United States'

  return (
    <div className="flex h-full min-h-[560px] flex-col overflow-hidden rounded-2xl border border-slate-200/60 bg-white shadow-md">
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-brand-green" />
          <h2 className="text-sm font-semibold text-slate-900">Looking in {looking}</h2>
        </div>
        <p className="text-xs text-slate-500">
          {leads.length
            ? pins.length === leads.length
              ? `${pins.length} on the map`
              : `${pins.length} of ${leads.length} on the map`
            : 'Add a city or county, or click a state'}
        </p>
      </div>
      <div className="relative min-h-[480px] w-full flex-1">
        <div ref={mapRef} className="absolute inset-0 min-h-[480px] w-full" />
        <div className="absolute right-3 top-3 z-[1000] flex overflow-hidden rounded-lg border border-slate-200 bg-white shadow-md">
          <button
            type="button"
            onClick={() => setMapStyle('map')}
            className={`px-3 py-1.5 text-xs font-semibold ${
              mapStyle === 'map' ? 'bg-brand-green text-white' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            Map
          </button>
          <button
            type="button"
            onClick={() => setMapStyle('satellite')}
            className={`px-3 py-1.5 text-xs font-semibold ${
              mapStyle === 'satellite' ? 'bg-brand-green text-white' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            Satellite
          </button>
        </div>
      </div>
    </div>
  )
}
