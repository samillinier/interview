'use client'

import { useEffect, useMemo, useRef } from 'react'
import { MapPin } from 'lucide-react'
import { normalizeStateCode, stateLabel, US_STATE_OPTIONS } from '@/lib/us-states'

let statesGeoPromise: Promise<any> | null = null

function loadUsStates(): Promise<any> {
  if (!statesGeoPromise) {
    statesGeoPromise = fetch('https://raw.githubusercontent.com/PublicaMundi/MappingAPI/master/data/geojson/us-states.json')
      .then((res) => (res.ok ? res.json() : null))
      .catch(() => null)
  }
  return statesGeoPromise
}

function codeFromFeature(feature: any): string | null {
  const name = String(feature?.properties?.name || feature?.properties?.NAME || '').trim()
  const abbr = String(feature?.properties?.state_code || feature?.properties?.STUSPS || '').trim()
  return normalizeStateCode(abbr) || US_STATE_OPTIONS.find((state) => state.label === name)?.value || null
}

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

export function MarketingLeadsMap({ leads, stateCode, placeLabel, focus, selectedHost, onSelectHost, onSelectState }: Props) {
  const mapRef = useRef<HTMLDivElement | null>(null)
  const leafletMapRef = useRef<any>(null)
  const markersRef = useRef<Map<string, any>>(new Map())
  const onSelectHostRef = useRef(onSelectHost)
  const onSelectStateRef = useRef(onSelectState)
  onSelectHostRef.current = onSelectHost
  onSelectStateRef.current = onSelectState

  const pins = useMemo(
    () =>
      leads.filter(
        (lead) => Number.isFinite(Number(lead.lat)) && Number.isFinite(Number(lead.lng)),
      ),
    [leads],
  )

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
      }

      const map = L.map(mapRef.current, {
        zoomControl: true,
        scrollWheelZoom: false,
      }).setView([39.8283, -98.5795], 4)
      leafletMapRef.current = map

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
      }).addTo(map)

      let selectedLayer: any = null
      const geo = await loadUsStates()
      if (!cancelled && geo) {
        L.geoJSON(geo, {
          style: (feature: any) => {
            const code = codeFromFeature(feature)
            const selected = code === stateCode
            return {
              color: selected ? '#15803d' : '#94a3b8',
              weight: selected ? 2.5 : 1,
              fillColor: selected ? '#22c55e' : '#e2e8f0',
              fillOpacity: selected ? 0.35 : 0.15,
            }
          },
          onEachFeature: (feature: any, layer: any) => {
            const code = codeFromFeature(feature)
            const name = stateLabel(code) || String(feature?.properties?.name || '')
            layer.bindTooltip(name, { sticky: true })
            layer.on('click', () => {
              if (code) onSelectStateRef.current?.(code)
            })
            if (code === stateCode) selectedLayer = layer
          },
        }).addTo(map)
      }

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
      } else if (selectedLayer?.getBounds) {
        map.fitBounds(selectedLayer.getBounds(), { padding: [28, 28], maxZoom: 6 })
      }

      window.setTimeout(() => map.invalidateSize(), 80)
    }

    void run()

    return () => {
      cancelled = true
      if (leafletMapRef.current) {
        leafletMapRef.current.remove()
        leafletMapRef.current = null
      }
      markersRef.current.clear()
    }
  }, [pins, stateCode, focus?.lat, focus?.lng, focus?.zoom])

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
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-brand-green" />
          <h2 className="text-sm font-semibold text-slate-900">Looking in {looking}</h2>
        </div>
        <p className="text-xs text-slate-500">
          {pins.length ? `${pins.length} on the map` : 'Add a city or county, or click a state'}
        </p>
      </div>
      <div ref={mapRef} className="h-64 w-full lg:h-[420px]" />
    </div>
  )
}
