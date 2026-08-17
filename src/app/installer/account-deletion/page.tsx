import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Delete Your Account | FIS FastTrack',
  description: 'Instructions for deleting your FIS FastTrack installer account and associated data.',
}

export default function AccountDeletionPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-3xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl">
        <header className="bg-[#003B2E] px-6 py-8 text-white sm:px-10">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-200">
            FIS FastTrack
          </p>
          <h1 className="mt-2 text-3xl font-bold sm:text-4xl">Delete your installer account</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-emerald-50 sm:text-base">
            Floor Interior Services gives installers a self-service way to permanently delete their
            account and associated personal data.
          </p>
        </header>

        <div className="space-y-9 px-6 py-8 text-slate-700 sm:px-10 sm:py-10">
          <section>
            <h2 className="text-xl font-bold text-slate-900">Delete your account in FIS FastTrack</h2>
            <ol className="mt-4 list-decimal space-y-2 pl-5 leading-7">
              <li>Sign in to your installer account.</li>
              <li>Open <strong>Profile</strong> and scroll to the <strong>Account</strong> section.</li>
              <li>Select <strong>Delete My Account</strong>.</li>
              <li>Enter your password, type <strong>DELETE</strong>, and confirm.</li>
            </ol>
            <Link
              href="/installer/login"
              className="mt-5 inline-flex rounded-xl bg-[#4F8F16] px-5 py-3 font-semibold text-white transition-colors hover:bg-[#3f7312]"
            >
              Sign in to delete my account
            </Link>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <h2 className="text-xl font-bold text-slate-900">Request deletion by email</h2>
            <p className="mt-3 leading-7">
              If you cannot sign in, email{' '}
              <a
                href="mailto:support@fiscorponline.com?subject=FIS%20FastTrack%20account%20deletion%20request"
                className="font-semibold text-[#3f7312] underline underline-offset-2"
              >
                support@fiscorponline.com
              </a>{' '}
              from the email address associated with your account. Include your full name and state
              that you want your FIS FastTrack installer account deleted. We may ask you to verify
              your identity before processing the request.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900">Data that is deleted</h2>
            <p className="mt-3 leading-7">
              After confirmation, we permanently remove your account access, login credentials,
              installer profile and contact information, profile and staff photos, uploaded
              documents, and other data directly associated with your installer account.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900">Data that may be retained</h2>
            <p className="mt-3 leading-7">
              We may retain limited transaction, payment, tax, fraud-prevention, or legal records
              when required for legitimate business or legal obligations. These records are
              restricted, disconnected from the active account where practical, and retained only
              for the required period, generally no longer than seven years.
            </p>
          </section>

          <footer className="border-t border-slate-200 pt-6 text-sm text-slate-500">
            Last updated August 12, 2026 · Floor Interior Services
          </footer>
        </div>
      </div>
    </main>
  )
}
