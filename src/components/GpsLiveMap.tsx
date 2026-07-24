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
}

type Props = {
  devices: VehicleDevice[]
  selectedDevice: VehicleDevice | null
  onSelectDevice: (device: VehicleDevice) => void
}

function buildPopup(d: VehicleDevice): string {
  let html = '<div style="font-family:system-ui,sans-serif;font-size:12px;line-height:1.5;min-width:180px">'
  html += '<strong style="font-size:14px;color:#15803d">' + d.vehicleName + '</strong><br/>'
  html += '<span style="color:#64748b">' + (d.vehiclePlate || '—') + '</span><br/>'
  if (d.location) html += '<span style="font-size:11px;color:#64748b;margin-top:2px;display:inline-block">'+ d.location + '</span><br/>'
  html += '<div style="margin-top:6px;border-top:1px solid #e2e8f0;padding-top:4px">'
  html += '<span style="color:#475569">Speed:</span> <strong>' + d.speed.toFixed(0) + ' mph</strong><br/>'
  html += '<span style="color:#475569">Ignition:</span> ' + (d.ignition ? 'ON' : 'OFF') + '<br/>'
  html += '<span style="color:#475569">Satellites:</span> ' + d.satelliteCount + '<br/>'
  html += '<span style="color:#475569">Signal:</span> ' + d.signalStrength + '%<br/>'
  if (d.fuelLevel != null) html += '<span style="color:#475569">Fuel:</span> ' + d.fuelLevel.toFixed(0) + '%<br/>'
  if (d.odometer != null) html += '<span style="color:#475569">Odometer:</span> ' + d.odometer.toFixed(0) + ' mi<br/>'
  html += '</div>'
  html += '<div style="margin-top:4px;font-size:10px;color:#94a3b8">' + d.deviceModel + '</div>'
  html += '<div style="font-size:10px;color:#94a3b8">ID: ' + d.deviceId + '</div>'
  html += '</div>'
  return html
}

function makeVehicleDivIcon(d: VehicleDevice): L.DivIcon {
  const isOnline = d.status === 'online'
  const color = isOnline ? '#16a34a' : d.status === 'idle' ? '#f59e0b' : '#94a3b8'
  const pulseClass = isOnline ? 'gps-marker-pulse' : ''

  // Small top-down car with status ring + heading rotation
  return L.divIcon({
    className: pulseClass,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    html:
      '<div style="'
      + 'width:36px;height:36px;'
      + 'display:flex;align-items:center;justify-content:center;'
      + '">'
      // Status ring
      + '<div style="'
      + 'position:absolute;'
      + 'width:34px;height:34px;'
      + 'border-radius:50%;'
      + 'border:2px solid ' + color + ';'
      + 'background:rgba(255,255,255,0.85);'
      + 'filter:drop-shadow(0 2px 4px rgba(0,0,0,0.35));'
      + '"></div>'
      // Car image rotated to heading
      + '<img src="/vehicle-marker.png" style="'
      + 'width:28px;height:28px;'
      + 'transform:rotate(' + d.heading + 'deg);'
      + 'filter:drop-shadow(0 1px 2px rgba(0,0,0,0.25));'
      + 'position:relative;z-index:1;'
      + '" alt="" />'
      + '</div>',
  })
}

export function GpsLiveMap({ devices, selectedDevice, onSelectDevice }: Props) {
  const mapRef = useRef<HTMLDivElement | null>(null)
  const leafletMapRef = useRef<any>(null)
  const markersRef = useRef<Map<string, any>>(new Map())
  const osmLayerRef = useRef<any>(null)
  const satelliteLayerRef = useRef<any>(null)
  const [isSatellite, setIsSatellite] = useState(false)

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
    }).addTo(map)

    const satelliteLayer = L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      {
        attribution: '&copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
        maxZoom: 19,
      }
    )

    osmLayerRef.current = osmLayer
    satelliteLayerRef.current = satelliteLayer

    // Custom satellite toggle control
    const SatelliteControl = L.Control.extend({
      options: { position: 'topright' },
      onAdd: function () {
        const div = L.DomUtil.create('div', 'leaflet-bar leaflet-control')
        div.innerHTML =
          '<a href="#" title="Toggle satellite view" style="display:flex;align-items:center;justify-content:center;font-size:16px;line-height:34px;width:34px;height:34px;background:white;color:#475569;text-decoration:none;border-radius:2px">' +
          '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="#ea4335" stroke="#b31412" stroke-width="0.5" stroke-linecap="round" stroke-linejoin="round">' +
          '<path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>' +
          '<circle cx="12" cy="9" r="2.5" fill="white" stroke="none"/>' +
          '</svg></a>'
        div.onclick = (e: Event) => {
          e.preventDefault()
          e.stopPropagation()
          setIsSatellite((prev) => !prev)
        }
        return div
      },
    })
    map.addControl(new SatelliteControl())

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

    return () => {
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

    // Fit bounds when new devices appear
    if (bounds.isValid()) {
      if (devices.length === 1) {
        map.setView(bounds.getCenter(), 14)
      } else {
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 12 })
      }
    }
  }, [devices])

  // Center on selected device when clicked from sidebar
  useEffect(() => {
    const map = leafletMapRef.current
    if (!map || !selectedDevice) return
    map.setView([selectedDevice.latitude, selectedDevice.longitude], 15, {
      animate: true,
      duration: 0.5,
    })
    const marker = markersRef.current.get(selectedDevice.id)
    if (marker) marker.openPopup()
  }, [selectedDevice])

  // Swap tile layers when satellite toggle changes
  useEffect(() => {
    const map = leafletMapRef.current
    if (!map) return
    if (isSatellite) {
      if (osmLayerRef.current) map.removeLayer(osmLayerRef.current)
      if (satelliteLayerRef.current) map.addLayer(satelliteLayerRef.current)
    } else {
      if (satelliteLayerRef.current) map.removeLayer(satelliteLayerRef.current)
      if (osmLayerRef.current) map.addLayer(osmLayerRef.current)
    }
  }, [isSatellite])

  return (
    <>
      <style>{`
        @keyframes gps-pulse {
          0%, 100% { filter: drop-shadow(0 0 6px rgba(22,163,74,0.4)); }
          50% { filter: drop-shadow(0 0 18px rgba(22,163,74,0.7)); }
        }
        .gps-marker-pulse {
          animation: gps-pulse 2s ease-in-out infinite;
        }
      `}</style>
      <div ref={mapRef} className="h-[500px] w-full" style={{ minHeight: 500 }} />
    </>
  )
}
