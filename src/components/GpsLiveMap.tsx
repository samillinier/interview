'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
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

type RoutePoint = { latitude: number; longitude: number; speed?: number; time?: string }

type Props = {
  devices: VehicleDevice[]
  selectedDevice: VehicleDevice | null
  onSelectDevice: (device: VehicleDevice) => void
  /** Flat points (legacy). Prefer routeSegments so parking gaps are not connected. */
  routePositions?: RoutePoint[]
  /** Separate trip polylines — does not draw lines across parked time. */
  routeSegments?: RoutePoint[][]
  /** Increment to fly the map to the selected (or first) vehicle live position. */
  locateTick?: number
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

function makeVehicleDivIcon(
  d: Pick<VehicleDevice, 'status' | 'heading'>,
  opts?: { pulse?: boolean; /** History playback: car only, no white status disc */ bare?: boolean }
): L.DivIcon {
  const isOnline = d.status === 'online'
  const color = isOnline ? '#8CB63C' : d.status === 'idle' ? '#f59e0b' : '#94a3b8'
  const bare = opts?.bare === true
  const showPulse = !bare && opts?.pulse !== false && isOnline
  const pulseClass = showPulse ? 'gps-marker-pulse' : ''
  const carSize = bare ? 36 : 28

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
      + (showPulse
        ? '<span class="gps-pulse-ring gps-pulse-ring-a"></span><span class="gps-pulse-ring gps-pulse-ring-b"></span>'
        : '')
      + (bare
        ? ''
        : '<div style="'
          + 'position:absolute;'
          + 'width:30px;height:30px;'
          + 'border-radius:50%;'
          + 'border:2px solid ' + color + ';'
          // No solid white fill — it peeked out behind the dark car as a white blob
          + 'background:rgba(255,255,255,0.15);'
          + 'box-shadow:0 1px 3px rgba(0,0,0,0.25);'
          + 'z-index:1;'
          + '"></div>')
      + '<img class="gps-car-img" src="/vehicle-marker.png" style="'
      + 'width:' + carSize + 'px;height:' + carSize + 'px;'
      + 'transform:rotate(' + d.heading + 'deg);'
      // No drop-shadow — it always falls "down" on screen, so it looks like a black blob at the rear
      + 'position:relative;z-index:2;'
      + 'will-change:transform;'
      + '" alt="" />'
      + '</div>',
  })
}

function shortestAngleDelta(from: number, to: number): number {
  return ((to - from + 540) % 360) - 180
}

function bearingDeg(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = Math.PI / 180
  const φ1 = lat1 * toRad
  const φ2 = lat2 * toRad
  const Δλ = (lng2 - lng1) * toRad
  const y = Math.sin(Δλ) * Math.cos(φ2)
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ)
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360
}

function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000
  const toRad = Math.PI / 180
  const dLat = (lat2 - lat1) * toRad
  const dLng = (lng2 - lng1) * toRad
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * toRad) * Math.cos(lat2 * toRad) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(a))
}

type PlaybackSeg = {
  points: RoutePoint[]
  cumDist: number[]
  lengthM: number
}

function buildPlaybackSegs(segments: RoutePoint[][]): PlaybackSeg[] {
  return segments
    .filter((s) => s.length >= 2)
    .map((points) => {
      const cumDist = [0]
      for (let i = 1; i < points.length; i++) {
        const d = haversineMeters(
          points[i - 1].latitude,
          points[i - 1].longitude,
          points[i].latitude,
          points[i].longitude
        )
        cumDist.push(cumDist[i - 1] + d)
      }
      return { points, cumDist, lengthM: cumDist[cumDist.length - 1] || 0 }
    })
    .filter((s) => s.lengthM > 1)
}

function pointAlongSegment(
  seg: PlaybackSeg,
  distM: number
): { lat: number; lng: number; heading: number; speed?: number } {
  const target = Math.max(0, Math.min(distM, seg.lengthM))
  const { points, cumDist } = seg
  let i = 1
  while (i < cumDist.length && cumDist[i] < target) i++
  const i1 = Math.max(1, i)
  const i0 = i1 - 1
  const span = Math.max(0.001, cumDist[i1] - cumDist[i0])
  const t = (target - cumDist[i0]) / span
  const a = points[i0]
  const b = points[i1]
  const lat = a.latitude + (b.latitude - a.latitude) * t
  const lng = a.longitude + (b.longitude - a.longitude) * t
  const heading = bearingDeg(a.latitude, a.longitude, b.latitude, b.longitude)
  const speed = (b.speed ?? a.speed) || 0
  return { lat, lng, heading, speed }
}

export function GpsLiveMap({
  devices,
  selectedDevice,
  onSelectDevice,
  routePositions,
  routeSegments,
  locateTick = 0,
}: Props) {
  const mapRef = useRef<HTMLDivElement | null>(null)
  const leafletMapRef = useRef<any>(null)
  const markersRef = useRef<Map<string, any>>(new Map())
  const polylineRef = useRef<any>(null)
  const trailRef = useRef<any>(null)
  const osmLayerRef = useRef<any>(null)
  const cartoLightRef = useRef<any>(null)
  const cartoDarkRef = useRef<any>(null)
  const satelliteLayerRef = useRef<any>(null)
  const isViewingHistoryRef = useRef(false)
  const playbackDeviceIdRef = useRef<string | null>(null)
  const playbackRafRef = useRef<number | null>(null)
  const playbackSegsRef = useRef<PlaybackSeg[]>([])
  const playbackIndexRef = useRef(0)
  const playbackDistRef = useRef(0)
  const playbackLastTsRef = useRef(0)
  const playbackPausedRef = useRef(false)
  const playbackSpeedRef = useRef(1)
  const playbackDoneRef = useRef(false)
  const playbackPauseUntilRef = useRef(0)
  const playbackHeadingRef = useRef<number | null>(null)
  const playbackIconReadyRef = useRef(false)
  const trailUpdateAccRef = useRef(0)
  const selectedDeviceRef = useRef(selectedDevice)
  selectedDeviceRef.current = selectedDevice

  const [activeLayer, setActiveLayer] = useState<'osm' | 'light' | 'dark' | 'satellite'>('light')
  const [playbackUi, setPlaybackUi] = useState<{
    active: boolean
    playing: boolean
    done: boolean
    speed: number
    progress: number
  }>({ active: false, playing: false, done: false, speed: 1, progress: 0 })

  const stopPlaybackLoop = useCallback(() => {
    if (playbackRafRef.current != null) {
      cancelAnimationFrame(playbackRafRef.current)
      playbackRafRef.current = null
    }
  }, [])

  const clearTrail = useCallback(() => {
    const map = leafletMapRef.current
    if (trailRef.current && map) {
      map.removeLayer(trailRef.current)
      trailRef.current = null
    }
  }, [])

  const updatePlaybackMarker = useCallback((lat: number, lng: number, heading: number, forceIcon = false) => {
    const device = selectedDeviceRef.current
    if (!device) return
    const marker = markersRef.current.get(device.id)
    if (!marker) return

    // Smooth heading so GPS noise doesn't make the car vibrate/spin
    const prev = playbackHeadingRef.current
    const smoothed =
      prev == null
        ? heading
        : (prev + shortestAngleDelta(prev, heading) * 0.2 + 360) % 360
    playbackHeadingRef.current = smoothed

    // Move only — never recreate the icon every frame (that causes vibration)
    marker.setLatLng([lat, lng])

    if (forceIcon || !playbackIconReadyRef.current) {
      // History playback: car only — no white disc underneath
      marker.setIcon(makeVehicleDivIcon({ status: 'online', heading: smoothed }, { pulse: false, bare: true }))
      playbackIconReadyRef.current = true
      return
    }

    const el = marker.getElement?.() as HTMLElement | null
    const img = el?.querySelector?.('.gps-car-img') as HTMLElement | null
    if (img) {
      img.style.transform = `rotate(${smoothed.toFixed(1)}deg)`
    }
  }, [])

  const updateTrail = useCallback((latlngs: L.LatLng[]) => {
    const map = leafletMapRef.current
    if (!map || latlngs.length < 2) return
    if (trailRef.current) {
      trailRef.current.setLatLngs(latlngs)
    } else {
      trailRef.current = L.polyline(latlngs, {
        color: '#15803d',
        weight: 4,
        opacity: 0.95,
      }).addTo(map)
    }
  }, [])

  const tickPlayback = useCallback(() => {
    const segs = playbackSegsRef.current
    if (!segs.length) {
      playbackRafRef.current = null
      return
    }

    const now = performance.now()

    if (playbackPausedRef.current || playbackDoneRef.current) {
      playbackRafRef.current = null
      return
    }

    // Brief hold between trip segments (don't animate across parking)
    if (now < playbackPauseUntilRef.current) {
      playbackLastTsRef.current = now
      playbackRafRef.current = requestAnimationFrame(tickPlayback)
      return
    }

    const last = playbackLastTsRef.current || now
    const dt = Math.min(0.05, Math.max(0, (now - last) / 1000))
    playbackLastTsRef.current = now

    const totalM = segs.reduce((s, seg) => s + seg.lengthM, 0)
    const baseDurationSec = Math.min(40, Math.max(10, totalM / 35))
    const metersPerSec = (totalM / baseDurationSec) * playbackSpeedRef.current

    let segIdx = playbackIndexRef.current
    let dist = playbackDistRef.current + metersPerSec * dt

    while (segIdx < segs.length && dist >= segs[segIdx].lengthM) {
      dist -= segs[segIdx].lengthM
      segIdx++
      if (segIdx < segs.length) {
        playbackIndexRef.current = segIdx
        playbackDistRef.current = 0
        playbackPauseUntilRef.current = now + 400
        const start = segs[segIdx].points[0]
        updatePlaybackMarker(
          start.latitude,
          start.longitude,
          bearingDeg(
            start.latitude,
            start.longitude,
            segs[segIdx].points[1].latitude,
            segs[segIdx].points[1].longitude
          )
        )
        playbackRafRef.current = requestAnimationFrame(tickPlayback)
        return
      }
    }

    if (segIdx >= segs.length) {
      const lastSeg = segs[segs.length - 1]
      const end = lastSeg.points[lastSeg.points.length - 1]
      const prev = lastSeg.points[Math.max(0, lastSeg.points.length - 2)]
      updatePlaybackMarker(
        end.latitude,
        end.longitude,
        bearingDeg(prev.latitude, prev.longitude, end.latitude, end.longitude)
      )
      // Final trail flush
      const finalTrail: L.LatLng[] = []
      for (const seg of segs) {
        for (const p of seg.points) finalTrail.push(L.latLng(p.latitude, p.longitude))
      }
      updateTrail(finalTrail)
      playbackDoneRef.current = true
      playbackPausedRef.current = true
      playbackRafRef.current = null
      setPlaybackUi((u) => ({ ...u, playing: false, done: true, progress: 1 }))
      return
    }

    playbackIndexRef.current = segIdx
    playbackDistRef.current = dist
    const pos = pointAlongSegment(segs[segIdx], dist)
    updatePlaybackMarker(pos.lat, pos.lng, pos.heading)

    const trail: L.LatLng[] = []
    for (let s = 0; s < segIdx; s++) {
      for (const p of segs[s].points) trail.push(L.latLng(p.latitude, p.longitude))
    }
    const cur = segs[segIdx]
    for (let i = 0; i < cur.points.length; i++) {
      if (cur.cumDist[i] <= dist) {
        trail.push(L.latLng(cur.points[i].latitude, cur.points[i].longitude))
      } else break
    }
    trail.push(L.latLng(pos.lat, pos.lng))
    // Throttle trail redraws — updating every frame makes the map stutter
    trailUpdateAccRef.current += dt
    if (trailUpdateAccRef.current >= 0.08) {
      trailUpdateAccRef.current = 0
      updateTrail(trail)
    }

    const doneM = segs.slice(0, segIdx).reduce((s, seg) => s + seg.lengthM, 0) + dist
    const progress = totalM > 0 ? Math.min(1, doneM / totalM) : 0
    setPlaybackUi((u) =>
      Math.abs(u.progress - progress) > 0.02 ? { ...u, progress, playing: true, done: false } : u
    )

    playbackRafRef.current = requestAnimationFrame(tickPlayback)
  }, [updatePlaybackMarker, updateTrail])

  const startPlayback = useCallback(
    (segs: PlaybackSeg[], reset = true, autoPlay = true) => {
      stopPlaybackLoop()
      if (!segs.length) {
        setPlaybackUi({ active: false, playing: false, done: false, speed: 1, progress: 0 })
        return
      }
      playbackSegsRef.current = segs
      if (reset) {
        playbackIndexRef.current = 0
        playbackDistRef.current = 0
        playbackHeadingRef.current = null
        playbackIconReadyRef.current = false
        trailUpdateAccRef.current = 0
        clearTrail()
        const start = segs[0].points[0]
        const next = segs[0].points[1]
        updatePlaybackMarker(
          start.latitude,
          start.longitude,
          bearingDeg(start.latitude, start.longitude, next.latitude, next.longitude),
          true
        )
      }
      playbackPausedRef.current = !autoPlay
      playbackDoneRef.current = false
      playbackPauseUntilRef.current = 0
      playbackLastTsRef.current = 0
      setPlaybackUi((u) => ({
        active: true,
        playing: autoPlay,
        done: false,
        speed: playbackSpeedRef.current || u.speed || 1,
        progress: reset ? 0 : u.progress,
      }))
      if (autoPlay) {
        playbackRafRef.current = requestAnimationFrame(tickPlayback)
      }
    },
    [stopPlaybackLoop, clearTrail, updatePlaybackMarker, tickPlayback]
  )

  const endHistoryMode = useCallback(() => {
    stopPlaybackLoop()
    clearTrail()
    playbackSegsRef.current = []
    playbackDeviceIdRef.current = null
    isViewingHistoryRef.current = false
    playbackHeadingRef.current = null
    playbackIconReadyRef.current = false
    setPlaybackUi({ active: false, playing: false, done: false, speed: 1, progress: 0 })
    const device = selectedDeviceRef.current
    if (device) {
      const marker = markersRef.current.get(device.id)
      if (marker) {
        marker.setLatLng(L.latLng(device.latitude, device.longitude))
        marker.setIcon(makeVehicleDivIcon(device))
      }
    }
  }, [stopPlaybackLoop, clearTrail])

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
          if (key === 'light') btn.style.cssText += ';background:#f0fdf4;color:#15803d'
          ;(container as any)['_layerBtn' + key] = btn
        }
        return container
      },
    })
    map.addControl(new LayerControl())

    leafletMapRef.current = map

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

    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver(() => {
        map.invalidateSize()
      })
      observer.observe(mapRef.current)
      ;(mapRef.current as any).__leafletResizeObserver = observer
    }

    return () => {
      stopPlaybackLoop()
      if ((mapRef.current as any)?.__leafletResizeObserver) {
        ;(mapRef.current as any).__leafletResizeObserver.disconnect()
      }
      map.remove()
      leafletMapRef.current = null
      markersRef.current.clear()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const map = leafletMapRef.current
    if (!map) return

    const currentIds = new Set<string>()
    const bounds = L.latLngBounds([])
    const playbackId = playbackDeviceIdRef.current

    devices.forEach((d) => {
      currentIds.add(d.id)
      const latlng = L.latLng(d.latitude, d.longitude)
      const existing = markersRef.current.get(d.id)
      const isPlaybackTarget = isViewingHistoryRef.current && playbackId === d.id

      if (existing) {
        if (!isPlaybackTarget) {
          existing.setLatLng(latlng)
          existing.setIcon(makeVehicleDivIcon(d))
        }
        existing.setPopupContent(buildPopup(d))
      } else {
        const marker = L.marker(latlng, { icon: makeVehicleDivIcon(d) })
          .addTo(map)
          .bindPopup(buildPopup(d))
        marker.on('click', () => onSelectDevice(d))
        markersRef.current.set(d.id, marker)
      }

      bounds.extend(latlng)
    })

    markersRef.current.forEach((_marker, id) => {
      if (!currentIds.has(id)) {
        markersRef.current.get(id)?.remove()
        markersRef.current.delete(id)
      }
    })

    if (!isViewingHistoryRef.current && bounds.isValid()) {
      if (devices.length === 1) {
        map.setView(bounds.getCenter(), 14)
      } else {
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 12 })
      }
    }
  }, [devices])

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

  // Explicit Locate — fly to live vehicle position
  useEffect(() => {
    if (!locateTick) return
    const map = leafletMapRef.current
    if (!map) return
    const device = selectedDeviceRef.current || devices[0]
    if (!device || !Number.isFinite(device.latitude) || !Number.isFinite(device.longitude)) return

    if (isViewingHistoryRef.current && playbackDeviceIdRef.current === device.id) {
      const marker = markersRef.current.get(device.id)
      if (marker) {
        marker.setLatLng(L.latLng(device.latitude, device.longitude))
        marker.setIcon(makeVehicleDivIcon(device))
      }
    }

    map.setView([device.latitude, device.longitude], 16, {
      animate: true,
      duration: 0.65,
    })
    const marker = markersRef.current.get(device.id)
    if (marker) marker.openPopup()
  }, [locateTick, devices])

  useEffect(() => {
    const map = leafletMapRef.current
    if (!map) return

    const layers = [
      osmLayerRef.current,
      cartoLightRef.current,
      cartoDarkRef.current,
      satelliteLayerRef.current,
    ]

    for (const l of layers) {
      if (l && map.hasLayer(l)) map.removeLayer(l)
    }

    const active = activeLayer === 'osm' ? osmLayerRef.current
      : activeLayer === 'light' ? cartoLightRef.current
      : activeLayer === 'dark' ? cartoDarkRef.current
      : satelliteLayerRef.current

    if (active && !map.hasLayer(active)) {
      map.addLayer(active)
    }

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

  useEffect(() => {
    const map = leafletMapRef.current
    if (!map) return

    if (polylineRef.current) {
      map.removeLayer(polylineRef.current)
      polylineRef.current = null
    }

    const segments: RoutePoint[][] =
      routeSegments && routeSegments.length > 0
        ? routeSegments.filter((s) => s.length >= 2)
        : routePositions && routePositions.length >= 2
          ? [routePositions]
          : []

    if (segments.length === 0) {
      endHistoryMode()
      return
    }

    isViewingHistoryRef.current = true
    playbackDeviceIdRef.current = selectedDeviceRef.current?.id ?? null

    const group = L.layerGroup()
    const allLatLngs: L.LatLng[] = []

    for (const seg of segments) {
      const latlngs = seg.map((p) => L.latLng(p.latitude, p.longitude))
      allLatLngs.push(...latlngs)
      L.polyline(latlngs, {
        color: '#86efac',
        weight: 3,
        opacity: 0.55,
        dashArray: '8 8',
      }).addTo(group)
    }

    group.addTo(map)
    polylineRef.current = group
    map.fitBounds(L.latLngBounds(allLatLngs), { padding: [50, 50] })

    const playbackSegs = buildPlaybackSegs(segments)
    // Load track paused — user presses Play to animate
    const t = window.setTimeout(() => startPlayback(playbackSegs, true, false), 400)
    return () => {
      window.clearTimeout(t)
      stopPlaybackLoop()
    }
  }, [routePositions, routeSegments, startPlayback, endHistoryMode, stopPlaybackLoop])

  function togglePlayPause() {
    if (!playbackUi.active) return
    if (playbackDoneRef.current) {
      startPlayback(playbackSegsRef.current, true)
      return
    }
    const willPause = !playbackPausedRef.current
    playbackPausedRef.current = willPause
    setPlaybackUi((u) => ({ ...u, playing: !willPause, done: false }))
    if (!willPause) {
      playbackLastTsRef.current = 0
      if (playbackRafRef.current == null) {
        playbackRafRef.current = requestAnimationFrame(tickPlayback)
      }
    }
  }

  function cycleSpeed() {
    const next = playbackSpeedRef.current === 1 ? 2 : playbackSpeedRef.current === 2 ? 4 : 1
    playbackSpeedRef.current = next
    setPlaybackUi((u) => ({ ...u, speed: next }))
  }

  function replay() {
    if (!playbackSegsRef.current.length) return
    startPlayback(playbackSegsRef.current, true)
  }

  return (
    <>
      <style>{`
        .gps-car-wrap {
          overflow: visible;
        }
        .gps-car-img {
          transform-origin: center center;
          backface-visibility: hidden;
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
      <div className="relative w-full h-full" style={{ minHeight: 500 }}>
        <div ref={mapRef} className="w-full h-full" style={{ minHeight: 500 }} />
        {playbackUi.active && (
          <div className="pointer-events-none absolute bottom-3 left-1/2 z-[1000] -translate-x-1/2 w-[min(92%,360px)]">
            <div className="pointer-events-auto rounded-xl border border-slate-200/80 bg-white/95 shadow-lg backdrop-blur-sm px-3 py-2">
              <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden mb-2">
                <div
                  className="h-full rounded-full bg-brand-green transition-[width] duration-150 ease-linear"
                  style={{ width: `${Math.round(playbackUi.progress * 100)}%` }}
                />
              </div>
              <div className="flex items-center justify-between gap-2">
                <p className="text-[10px] font-medium text-slate-500 truncate">
                  {playbackUi.done ? 'Trip playback finished' : playbackUi.playing ? 'Playing trip history' : 'Paused'}
                </p>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={replay}
                    className="px-2 py-1 text-[11px] font-semibold rounded-md text-slate-600 hover:bg-slate-100"
                  >
                    Replay
                  </button>
                  <button
                    type="button"
                    onClick={cycleSpeed}
                    className="px-2 py-1 text-[11px] font-semibold rounded-md text-slate-600 hover:bg-slate-100 tabular-nums"
                  >
                    {playbackUi.speed}x
                  </button>
                  <button
                    type="button"
                    onClick={togglePlayPause}
                    className="px-2.5 py-1 text-[11px] font-semibold rounded-md bg-brand-green text-white hover:bg-brand-green/90"
                  >
                    {playbackUi.done ? 'Play again' : playbackUi.playing ? 'Pause' : 'Play'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
