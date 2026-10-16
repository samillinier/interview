export function gpsMatchKey(value: unknown): string {
  return String(value || '').toUpperCase().replace(/[^A-Z0-9]/g, '')
}

export function fleetVehicleLabel(vehicle: {
  vehicleYear?: number | string | null
  vehicleMake?: string | null
  vehicleModel?: string | null
}): string {
  return [vehicle.vehicleMake, vehicle.vehicleModel].filter(Boolean).join(' ').trim()
}

export function fleetVehicleGpsPath(vehicle: {
  id: string
  vin?: string | null
  plate?: string | null
  vehicleMake?: string | null
  vehicleModel?: string | null
}): string {
  const params = new URLSearchParams()
  params.set('vehicle', vehicle.id)
  if (vehicle.vin) params.set('vin', vehicle.vin)
  if (vehicle.plate) params.set('plate', vehicle.plate)
  const name = fleetVehicleLabel(vehicle)
  if (name) params.set('name', name)
  return `/property/gps?${params.toString()}`
}

type GpsMatchable = {
  id: string
  vehicleId?: string | null
  vehicleName?: string | null
  vehiclePlate?: string | null
  obdii?: { vin?: string | null } | null
}

export function findGpsDeviceForFleet<T extends GpsMatchable>(
  devices: T[],
  query: {
    vehicleId?: string | null
    vin?: string | null
    plate?: string | null
    name?: string | null
  }
): T | null {
  const vin = gpsMatchKey(query.vin)
  if (vin) {
    const hit = devices.find((d) => gpsMatchKey(d.obdii?.vin) === vin)
    if (hit) return hit
  }

  if (query.vehicleId) {
    const hit = devices.find((d) => d.vehicleId === query.vehicleId)
    if (hit) return hit
  }

  const plate = gpsMatchKey(query.plate)
  if (plate) {
    const hit = devices.find((d) => gpsMatchKey(d.vehiclePlate) === plate)
    if (hit) return hit
  }

  const name = String(query.name || '').trim().toLowerCase()
  if (name) {
    const exact = devices.filter((d) => (d.vehicleName || '').trim().toLowerCase() === name)
    if (exact.length === 1) return exact[0]
    const partial = devices.filter((d) => {
      const n = (d.vehicleName || '').trim().toLowerCase()
      return Boolean(n) && (n.includes(name) || name.includes(n))
    })
    if (partial.length === 1) return partial[0]
  }

  return null
}
