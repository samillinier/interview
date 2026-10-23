/** Live / on-the-road: GPS speed, or Ruhavik motion while speed is 0 at a stop. */
export function deviceIsMoving(device: {
  status?: string
  speed?: number | null
  moving?: boolean
  obdii?: { motionDetected?: boolean } | null
}) {
  if (device.status === 'offline') return false
  if (device.moving === true) return true
  if (Number(device.speed) > 3) return true
  if (device.obdii?.motionDetected === true) return true
  return false
}
