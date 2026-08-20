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

async function registerIosFcmToken() {
  try {
    const result = await FCM.getToken()
    if (result?.token) {
      await sendTokenToBackend(result.token)
    }
  } catch (error) {
    console.error('Failed to obtain FCM token on iOS:', error)
  }
}

/**
 * Shows the iOS/Android "Allow Notifications" system dialog and registers
 * the device for push. Runs on any native app open (including the login
 * screen) so the permission prompt is not gated behind sign-in.
 */
export function usePushNotifications(enabled: boolean = true) {
  useEffect(() => {
    if (!enabled || !Capacitor.isNativePlatform()) return

    let mounted = true

    const setup = async () => {
      try {
        await PushNotifications.addListener('registration', (token) => {
          if (Capacitor.getPlatform() === 'android') {
            void sendTokenToBackend(token.value)
          } else if (Capacitor.getPlatform() === 'ios') {
            // APNs registration succeeded — FCM can now mint an FCM token.
            void registerIosFcmToken()
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

        // This is what triggers the iOS "Would Like to Send You Notifications"
        // Allow / Don't Allow system dialog.
        let permission = await PushNotifications.checkPermissions()
        if (permission.receive === 'prompt' || permission.receive === 'prompt-with-rationale') {
          permission = await PushNotifications.requestPermissions()
        }
        if (permission.receive !== 'granted') {
          console.warn('Push notification permission not granted:', permission.receive)
          return
        }

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

        // Fallback for iOS in case the registration event already fired
        // before we attached the listener, or FCM already has a token.
        if (Capacitor.getPlatform() === 'ios') {
          // Small delay so APNs token can reach Firebase Messaging first.
          window.setTimeout(() => {
            if (mounted) void registerIosFcmToken()
          }, 1500)
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
