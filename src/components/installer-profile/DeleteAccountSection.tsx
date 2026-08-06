'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle, Loader2, Trash2 } from 'lucide-react'
import { IosProfileSection } from '@/components/installer-profile/IosProfileSection'

type Props = {
  installerEmail?: string | null
}

export function DeleteAccountSection({ installerEmail }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [error, setError] = useState('')
  const [deleting, setDeleting] = useState(false)

  const resetForm = () => {
    setPassword('')
    setConfirmation('')
    setError('')
  }

  const closeModal = () => {
    if (deleting) return
    setOpen(false)
    resetForm()
  }

  const clearSession = () => {
    try {
      localStorage.removeItem('installerToken')
      localStorage.removeItem('installerId')
      localStorage.removeItem('installerSavedCredentials')
    } catch {
      // ignore
    }
  }

  const handleDelete = async () => {
    setError('')
    if (confirmation.trim().toUpperCase() !== 'DELETE') {
      setError('Type DELETE to confirm.')
      return
    }
    if (!password) {
      setError('Enter your password to continue.')
      return
    }

    const token = typeof window !== 'undefined' ? localStorage.getItem('installerToken') : null
    if (!token) {
      setError('Your session expired. Please sign in again.')
      return
    }

    setDeleting(true)
    try {
      const res = await fetch('/api/installers/delete-account', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ password, confirmation: 'DELETE' }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(String(data?.error || 'Failed to delete account.'))
        setDeleting(false)
        return
      }

      clearSession()
      router.replace('/installer/login?deleted=1')
    } catch {
      setError('Something went wrong. Please try again.')
      setDeleting(false)
    }
  }

  return (
    <>
      <IosProfileSection title="Account">
        <div className="bg-white rounded-2xl shadow-lg border border-red-200/70 p-5 sm:p-6 mb-6">
          <div className="flex items-start gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center flex-shrink-0">
              <Trash2 className="w-5 h-5 text-red-600" />
            </div>
            <div className="min-w-0">
              <h3 className="text-lg font-bold text-slate-900">Delete Account</h3>
              <p className="text-sm text-slate-600 mt-1 leading-relaxed">
                Permanently delete your installer account and associated profile data. This cannot be undone.
                {installerEmail ? (
                  <>
                    {' '}
                    Signed in as <span className="font-medium text-slate-800">{installerEmail}</span>.
                  </>
                ) : null}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              resetForm()
              setOpen(true)
            }}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-red-600 text-white font-semibold hover:bg-red-700 transition-colors"
          >
            Delete My Account
          </button>
        </div>
      </IosProfileSection>

      {open && (
        <div
          className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Confirm account deletion"
          onClick={closeModal}
        >
          <div
            className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-11 h-11 rounded-full bg-red-50 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900">Delete account?</h2>
                <p className="text-sm text-slate-500">This action is permanent</p>
              </div>
            </div>

            <p className="text-sm text-slate-600 mb-4 leading-relaxed">
              Your profile, documents, and login access will be permanently removed. You will not be able to
              sign in with this account again.
            </p>

            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
              Type DELETE to confirm
            </label>
            <input
              type="text"
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
              autoCapitalize="characters"
              autoCorrect="off"
              spellCheck={false}
              disabled={deleting}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-red-400 focus:ring-2 focus:ring-red-100 outline-none mb-3"
              placeholder="DELETE"
            />

            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={deleting}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-red-400 focus:ring-2 focus:ring-red-100 outline-none mb-3"
              placeholder="Your account password"
              autoComplete="current-password"
            />

            {error ? (
              <p className="text-sm text-red-600 mb-3" role="alert">
                {error}
              </p>
            ) : null}

            <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3 mt-2">
              <button
                type="button"
                onClick={closeModal}
                disabled={deleting}
                className="flex-1 px-4 py-3 rounded-xl border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 px-4 py-3 rounded-xl bg-red-600 text-white font-semibold hover:bg-red-700 disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {deleting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Deleting…
                  </>
                ) : (
                  'Permanently Delete'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
