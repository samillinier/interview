'use client'

import { useEffect } from 'react'
import { Capacitor } from '@capacitor/core'
import {
  PushNotifications,
  type PushNotificationSchema,
  type ActionPerformed,
} from '@capacitor/push-notifications'
import { FCM } from '@capacitor-community/fcm'
import { toast } from 'sonner'

// Custom event fired when a push arrives while the app is in the foreground.
// Listeners (e.g. the installer layout) can use this to refresh unread counts.
export const PUSH_RECEIVED_EVENT = 'fis:push-received'

async function sendTokenToBackend(tokenValue: string) {
  const installerToken = localStorage.getItem('installerToken')
  const installerId = localStorage.getItem('installerId')
  if (!installerToken || !installerId || !tokenValue) return

  try {
    await fetch(`/api/installers/${installerId}/device-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${installerToken}`,
      },
      body: JSON.stringify({
        token: tokenValue,
        platform: Capacitor.getPlatform(),
      }),
    })
  } catch {
    // Non-fatal: the token is re-sent on the next app launch.
  }
}

export function usePushNotifications(enabled: boolean) {
  useEffect(() => {
    // Push is only available inside the native Capacitor app.
    if (!enabled || !Capacitor.isNativePlatform()) return

    let mounted = true

    const setup = async () => {
      try {
        await PushNotifications.addListener('registration', (token) => {
          // On Android this token is already an FCM token. On iOS the
          // push-notifications plugin emits an APNs token, so we use FCM.getToken()
          // there instead (see below).
          if (Capacitor.getPlatform() === 'android') {
            void sendTokenToBackend(token.value)
          }
        })

        await PushNotifications.addListener('registrationError', (error) => {
          console.error('Push registration error:', error.error)
        })

        await PushNotifications.addListener(
          'pushNotificationReceived',
          (notification: PushNotificationSchema) => {
            if (!mounted) return
            window.dispatchEvent(
              new CustomEvent(PUSH_RECEIVED_EVENT, { detail: notification })
            )

            const title = notification.title
            const body = notification.body
            if (title || body) {
              toast(title || 'New notification', { description: body })
            }
          }
        )

        await PushNotifications.addListener(
          'pushNotificationActionPerformed',
          (action: ActionPerformed) => {
            const link = action.notification?.data?.link
            if (typeof link === 'string' && link) {
              window.location.href = link
            }
          }
        )

        let permission = await PushNotifications.checkPermissions()
        if (permission.receive === 'prompt') {
          permission = await PushNotifications.requestPermissions()
        }
        if (permission.receive !== 'granted') return

        // Ensure a stable channel so Android 8+ shows notifications reliably.
        if (Capacitor.getPlatform() === 'android') {
          try {
            await PushNotifications.createChannel({
              id: 'default',
              name: 'General',
              description: 'General notifications',
              importance: 4,
              visibility: 1,
              vibration: true,
            })
          } catch {
            // Channel may already exist; ignore.
          }
        }

        await PushNotifications.register()

        // iOS: the push-notifications plugin only yields an APNs token. Use the
        // FCM plugin (Firebase iOS SDK) to obtain the FCM token the server sends to.
        if (Capacitor.getPlatform() === 'ios') {
          try {
            const result = await FCM.getToken()
            if (result?.token) {
              await sendTokenToBackend(result.token)
            }
          } catch (error) {
            console.error('Failed to obtain FCM token on iOS:', error)
          }
        }
      } catch (error) {
        console.error('Push notifications setup failed:', error)
      }
    }

    void setup()

    return () => {
      mounted = false
    }
  }, [enabled])
}
