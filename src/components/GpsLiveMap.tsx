'use client'

import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

export interface VehicleDevice {
  id: string
  vehicleName: string
  vehiclePlate: string
  deviceId: string
  deviceModel: string
  status: 'online' | 'offline' | 'idle'
  lastSeen: string
  latitude: number
  longitude: number
  speed: number
  heading: number
  ignition: boolean
  fuelLevel?: number
  engineTemp?: number
  batteryVoltage?: number
  odometer?: number
  satelliteCount: number
  signalStrength: number
  location?: string | null
  /** OBDII / CAN bus data */
  obdii?: {
    rpm?: number
    fuelLevel?: number
    obdSpeed?: number
    vin?: string
    dtcCodes?: string[]
    motionDetected?: boolean
    totalDistance?: number
  }
  /** Recent classified events for this device */
  recentEvents?: {
    id: number
    type: string
    eventTime: string
    label: string
    icon: string
    severity: string
    detail?: string
  }[]
  /** Today's driving summary */
  todaySummary?: {
    trips: number
    distance: number
    drivingTime: string
    maxSpeed: number
    avgSpeed: number
    odometer?: number
  }
}

type Props = {
  devices: VehicleDevice[]
  selectedDevice: VehicleDevice | null
  onSelectDevice: (device: VehicleDevice) => void
  routePositions?: { latitude: number; longitude: number; speed?: number; time?: string }[]
}

function buildPopup(d: VehicleDevice): string {
  const isOffline = d.status === 'offline'
  let html = '<div style="font-family:system-ui,sans-serif;font-size:12px;line-height:1.5;min-width:180px">'
  html += '<strong style="font-size:14px;color:' + (isOffline ? '#94a3b8' : '#15803d') + '">' + d.vehicleName + '</strong>'
  if (d.location) html += '<br/><span style="font-size:11px;color:#64748b">'+ d.location + '</span>'
  if (d.vehiclePlate) html += '<br/><span style="font-size:10px;color:#94a3b8">' + d.vehiclePlate + '</span>'
  if (isOffline) {
    html += '<div style="margin-top:6px;border-top:1px solid #e2e8f0;padding-top:4px">'
    html += '<span style="font-size:11px;color:#ef4444;font-weight:600">OFFLINE</span>'
    html += '<br/><span style="font-size:10px;color:#94a3b8">Last known position shown below</span>'
    html += '</div>'
  }
  html += '<div style="margin-top:6px;border-top:1px solid #e2e8f0;padding-top:4px">'
  html += '<span style="color:' + (isOffline ? '#94a3b8' : '#475569') + '">Speed:</span> <strong style="color:' + (isOffline ? '#94a3b8' : 'inherit') + '">' + d.speed.toFixed(0) + ' mph</strong><br/>'
  html += '<span style="color:' + (isOffline ? '#94a3b8' : '#475569') + '">Ignition:</span> <span style="color:' + (isOffline ? '#94a3b8' : 'inherit') + '">' + (d.ignition ? 'ON' : 'OFF') + '</span><br/>'
  html += '<span style="color:' + (isOffline ? '#94a3b8' : '#475569') + '">Satellites:</span> <span style="color:' + (isOffline ? '#94a3b8' : 'inherit') + '">' + d.satelliteCount + '</span><br/>'
  html += '<span style="color:' + (isOffline ? '#94a3b8' : '#475569') + '">Signal:</span> <span style="color:' + (isOffline ? '#94a3b8' : 'inherit') + '">' + d.signalStrength + '%</span><br/>'
  if (d.fuelLevel != null) html += '<span style="color:' + (isOffline ? '#94a3b8' : '#475569') + '">Fuel:</span> <span style="color:' + (isOffline ? '#94a3b8' : 'inherit') + '">' + d.fuelLevel.toFixed(0) + '%</span><br/>'
  if (d.odometer != null) html += '<span style="color:' + (isOffline ? '#94a3b8' : '#475569') + '">Odometer:</span> <span style="color:' + (isOffline ? '#94a3b8' : 'inherit') + '">' + d.odometer.toFixed(0) + ' mi</span><br/>'
  html += '</div>'
  html += '<div style="margin-top:4px;font-size:10px;color:#94a3b8">' + d.deviceModel + '</div>'
  html += '<div style="font-size:10px;color:#94a3b8">ID: ' + d.deviceId + '</div>'
  html += '</div>'
  return html
}

function makeVehicleDivIcon(d: VehicleDevice): L.DivIcon {
  const isOnline = d.status === 'online'
  const color = isOnline ? '#8CB63C' : d.status === 'idle' ? '#f59e0b' : '#94a3b8'
  const pulseClass = isOnline ? 'gps-marker-pulse' : ''

  // Small top-down car with status ring + heading rotation
  return L.divIcon({
    className: pulseClass,
    iconSize: [48, 48],
    iconAnchor: [24, 24],
    html:
      '<div class="gps-car-wrap" style="'
      + 'width:48px;height:48px;'
      + 'display:flex;align-items:center;justify-content:center;'
      + 'position:relative;'
      + '">'
      + (isOnline
        ? '<span class="gps-pulse-ring gps-pulse-ring-a"></span><span class="gps-pulse-ring gps-pulse-ring-b"></span>'
        : '')
      // Status ring
      + '<div style="'
      + 'position:absolute;'
      + 'width:34px;height:34px;'
      + 'border-radius:50%;'
      + 'border:2px solid ' + color + ';'
      + 'background:rgba(255,255,255,0.95);'
      + 'box-shadow:0 2px 6px rgba(0,0,0,0.35);'
      + 'z-index:1;'
      + '"></div>'
      // Car image rotated to heading
      + '<img src="/vehicle-marker.png" style="'
      + 'width:28px;height:28px;'
      + 'transform:rotate(' + d.heading + 'deg);'
      + 'filter:drop-shadow(0 1px 2px rgba(0,0,0,0.3));'
      + 'position:relative;z-index:2;'
      + '" alt="" />'
      + '</div>',
  })
}

export function GpsLiveMap({ devices, selectedDevice, onSelectDevice, routePositions }: Props) {
  const mapRef = useRef<HTMLDivElement | null>(null)
  const leafletMapRef = useRef<any>(null)
  const markersRef = useRef<Map<string, any>>(new Map())
  const polylineRef = useRef<any>(null)
  const osmLayerRef = useRef<any>(null)
  const cartoLightRef = useRef<any>(null)
  const cartoDarkRef = useRef<any>(null)
  const satelliteLayerRef = useRef<any>(null)
  const isViewingHistoryRef = useRef(false)
  const [activeLayer, setActiveLayer] = useState<'osm' | 'light' | 'dark' | 'satellite'>('light')

  // Initialize map AND place initial markers in a SINGLE effect
  useEffect(() => {
    if (!mapRef.current || leafletMapRef.current) return

    const map = L.map(mapRef.current, {
      center: [27.95, -82.45],
      zoom: 10,
      zoomControl: true,
      scrollWheelZoom: false,
    })

    const osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    })

    const cartoLight = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>',
      maxZoom: 19,
    }).addTo(map)

    const cartoDark = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>',
      maxZoom: 19,
    })

    const satelliteLayer = L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      {
        attribution: '&copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
        maxZoom: 19,
      }
    )

    osmLayerRef.current = osmLayer
    cartoLightRef.current = cartoLight
    cartoDarkRef.current = cartoDark
    satelliteLayerRef.current = satelliteLayer

    // Layer picker control (replaces old satellite toggle)
    const LayerControl = L.Control.extend({
      options: { position: 'topright' },
      onAdd: function () {
        const container = L.DomUtil.create('div', 'leaflet-control')
        container.style.cssText = 'background:white;border-radius:6px;box-shadow:0 1px 4px rgba(0,0,0,0.2);padding:3px;display:flex;gap:1px'
        for (const { key, label } of [
          { key: 'osm', label: 'OSM' },
          { key: 'light', label: 'Light' },
          { key: 'dark', label: 'Dark' },
          { key: 'satellite', label: 'Sat' },
        ] as { key: string; label: string }[]) {
          const btn = L.DomUtil.create('a', '', container)
          btn.href = '#'
          btn.title = label
          btn.style.cssText = 'font-size:11px;font-weight:500;padding:3px 7px;border-radius:4px;color:#64748b;text-decoration:none;display:inline-block'
          btn.textContent = label
          btn.onclick = (e: Event) => {
            e.preventDefault()
            e.stopPropagation()
            setActiveLayer(key as any)
          }
          // Highlight active (Light is default)
          if (key === 'light') btn.style.cssText += ';background:#f0fdf4;color:#15803d'
          ;(container as any)['_layerBtn' + key] = btn
        }
        return container
      },
    })
    map.addControl(new LayerControl())

    leafletMapRef.current = map

    // Place initial markers after tiles start loading
    const bounds = L.latLngBounds([])
    devices.forEach((d) => {
      const latlng = L.latLng(d.latitude, d.longitude)
      const marker = L.marker(latlng, { icon: makeVehicleDivIcon(d) })
        .addTo(map)
        .bindPopup(buildPopup(d))
      marker.on('click', () => onSelectDevice(d))
      markersRef.current.set(d.id, marker)
      bounds.extend(latlng)
    })

    if (bounds.isValid()) {
      if (devices.length === 1) {
        map.setView(bounds.getCenter(), 14)
      } else {
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 12 })
      }
    }

    setTimeout(() => map.invalidateSize(), 300)

    // ResizeObserver handles height changes from parent (e.g. detail panel open)
    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver(() => {
        map.invalidateSize()
      })
      observer.observe(mapRef.current)
      // Store observer for cleanup
      ;(mapRef.current as any).__leafletResizeObserver = observer
    }

    return () => {
      // Cleanup observer
      if ((mapRef.current as any)?.__leafletResizeObserver) {
        ;(mapRef.current as any).__leafletResizeObserver.disconnect()
      }
      map.remove()
      leafletMapRef.current = null
      markersRef.current.clear()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Update markers when devices data changes (position updates every 3s)
  useEffect(() => {
    const map = leafletMapRef.current
    if (!map) return

    const currentIds = new Set<string>()
    const bounds = L.latLngBounds([])

    devices.forEach((d) => {
      currentIds.add(d.id)
      const latlng = L.latLng(d.latitude, d.longitude)
      const existing = markersRef.current.get(d.id)

      if (existing) {
        // Update position and icon
        existing.setLatLng(latlng)
        existing.setIcon(makeVehicleDivIcon(d))
        existing.setPopupContent(buildPopup(d))
      } else {
        // Create new marker for device that arrived after initial mount
        const marker = L.marker(latlng, { icon: makeVehicleDivIcon(d) })
          .addTo(map)
          .bindPopup(buildPopup(d))
        marker.on('click', () => onSelectDevice(d))
        markersRef.current.set(d.id, marker)
      }

      bounds.extend(latlng)
    })

    // Remove markers for devices that no longer exist
    markersRef.current.forEach((_marker, id) => {
      if (!currentIds.has(id)) {
        markersRef.current.get(id)?.remove()
        markersRef.current.delete(id)
      }
    })

    // Fit bounds when new devices appear — skip if viewing history route
    if (!isViewingHistoryRef.current && bounds.isValid()) {
      if (devices.length === 1) {
        map.setView(bounds.getCenter(), 14)
      } else {
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 12 })
      }
    }
  }, [devices])

  // Center on selected device when clicked from sidebar (skip when viewing history)
  useEffect(() => {
    const map = leafletMapRef.current
    if (!map || !selectedDevice || isViewingHistoryRef.current) return
    map.setView([selectedDevice.latitude, selectedDevice.longitude], 15, {
      animate: true,
      duration: 0.5,
    })
    const marker = markersRef.current.get(selectedDevice.id)
    if (marker) marker.openPopup()
  }, [selectedDevice])

  // Swap tile layers when active layer changes
  useEffect(() => {
    const map = leafletMapRef.current
    if (!map) return

    const layers = [
      osmLayerRef.current,
      cartoLightRef.current,
      cartoDarkRef.current,
      satelliteLayerRef.current,
    ]

    // Remove all tile layers
    for (const l of layers) {
      if (l && map.hasLayer(l)) map.removeLayer(l)
    }

    // Add active layer
    const active = activeLayer === 'osm' ? osmLayerRef.current
      : activeLayer === 'light' ? cartoLightRef.current
      : activeLayer === 'dark' ? cartoDarkRef.current
      : satelliteLayerRef.current

    if (active && !map.hasLayer(active)) {
      map.addLayer(active)
    }

    // Update button highlight in the DOM
    const container = mapRef.current?.querySelector('.leaflet-control > a')?.parentElement
    if (container) {
      const buttons = container.querySelectorAll('a')
      for (let i = 0; i < buttons.length; i++) {
        const a = buttons.item(i)
        if (!a) continue
        const key = a.textContent?.toLowerCase()
        const isActive =
          (key === 'osm' && activeLayer === 'osm') ||
          (key === 'light' && activeLayer === 'light') ||
          (key === 'dark' && activeLayer === 'dark') ||
          (key === 'sat' && activeLayer === 'satellite')
        a.style.background = isActive ? '#f0fdf4' : 'transparent'
        a.style.color = isActive ? '#15803d' : '#64748b'
      }
    }
  }, [activeLayer])

  // Draw route polyline when routePositions changes
  useEffect(() => {
    const map = leafletMapRef.current
    if (!map) return

    // Remove old polyline
    if (polylineRef.current) {
      map.removeLayer(polylineRef.current)
      polylineRef.current = null
    }

    // User cleared history — resume live tracking
    if (!routePositions || routePositions.length < 2) {
      isViewingHistoryRef.current = false
      return
    }

    isViewingHistoryRef.current = true

    const latlngs = routePositions.map(
      (p) => L.latLng(p.latitude, p.longitude)
    )

    polylineRef.current = L.polyline(latlngs, {
      color: '#15803d',
      weight: 3,
      opacity: 0.7,
      dashArray: '10 6',
    }).addTo(map)

    // Fit map to route bounds
    const bounds = L.latLngBounds(latlngs)
    map.fitBounds(bounds, { padding: [50, 50] })
  }, [routePositions])

  return (
    <>
      <style>{`
        .gps-car-wrap {
          overflow: visible;
        }
        .gps-pulse-ring {
          position: absolute;
          left: 50%;
          top: 50%;
          width: 34px;
          height: 34px;
          margin-left: -17px;
          margin-top: -17px;
          border-radius: 50%;
          border: 2px solid rgba(15, 23, 42, 0.28);
          background: rgba(15, 23, 42, 0.08);
          box-sizing: border-box;
          pointer-events: none;
          z-index: 0;
          animation: gps-ring-pulse 1.8s ease-out infinite;
        }
        .gps-pulse-ring-b {
          animation-delay: 0.9s;
        }
        @keyframes gps-ring-pulse {
          0% {
            transform: scale(0.9);
            opacity: 0.55;
          }
          100% {
            transform: scale(2.1);
            opacity: 0;
          }
        }
        .gps-marker-pulse {
          overflow: visible !important;
        }
        .leaflet-marker-icon.gps-marker-pulse {
          overflow: visible !important;
        }
      `}</style>
      <div ref={mapRef} className="w-full h-full" style={{ minHeight: 500 }} />
    </>
  )
}
