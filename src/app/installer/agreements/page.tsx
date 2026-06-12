'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  CreditCard,
  ExternalLink,
  FileText,
  FileCheck,
  Shield,
} from 'lucide-react'
import { LogoHeartbeatLoader } from '@/components/LogoHeartbeatLoader'

/** Matches Adobe embed: `...esignWidget?wid=...*&hosted=false` (see generate-independent-contractor-contract API). */
const DEFAULT_INDEPENDENT_CONTRACTOR_ADOBE_WIDGET =
  'https://na2.documents.adobe.com/public/esignWidget?wid=CBFCIBAA3AAABLblqZhDs4AEhql4PJpxJSBr3jAUYbOPkCUDhFvx9stwDoWbP6-TE_Cn8JqgWp0ME6NGCegg*'

function adobeWidgetUrlWithHostedFalse(url: string) {
  if (/[?&]hosted=/.test(url)) return url
  return url.includes('?') ? `${url}&hosted=false` : `${url}?hosted=false`
}

type InstallerProfile = {
  id: string
  firstName: string
  lastName: string
  email: string
  ndaAgreedAt?: string | null
  serviceAgreementSignedAt?: string | null
}

export default function InstallerAgreementsPage() {
  const router = useRouter()
  const [checking, setChecking] = useState(true)
  const [installer, setInstaller] = useState<InstallerProfile | null>(null)
  const [error, setError] = useState('')
  const [independentContractorServices, setIndependentContractorServices] = useState<{
    /** Primary card link: completed PDF from admin if set, else signing form */
    link: string
    signFormLink: string | null
    completedLink: string | null
    status: string
    title: string
  } | null>(null)
  const [uploadedAgreements, setUploadedAgreements] = useState<
    Array<{ id: string; title: string; fileUrl: string; createdAt?: string | null }>
  >([])

  useEffect(() => {
    const run = async () => {
      const tok = localStorage.getItem('installerToken')
      if (!tok) {
        router.push('/installer/login')
        return
      }

      try {
        const verifyRes = await fetch('/api/installers/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: tok }),
        })
        const verifyData = await verifyRes.json().catch(() => null)
        if (!verifyRes.ok || !verifyData?.success || !verifyData?.installerId) {
          localStorage.removeItem('installerToken')
          localStorage.removeItem('installerId')
          router.push('/installer/login')
          return
        }

        const id = String(verifyData.installerId)
        localStorage.setItem('installerId', id)

        const profileRes = await fetch(`/api/installers/${id}`, {
          headers: { Authorization: `Bearer ${tok}` },
        })
        const profileData = await profileRes.json().catch(() => null)
        if (profileRes.ok && profileData?.installer) {
          setInstaller(profileData.installer)
        }

        // Best-effort: load generated Independent Contractor Services Agreement link
        // so installers can sign the exact prefilled document.
        try {
          const agreementRes = await fetch(`/api/installers/${id}/agreements/independent-contractor-services`, {
            headers: { Authorization: `Bearer ${tok}` },
          })
          if (agreementRes.ok) {
            const agreementData = await agreementRes.json().catch(() => null)
            const redirectUrl = agreementData?.agreement?.payload?.adobe?.redirectUrl
            const completedUrl = agreementData?.agreement?.payload?.adobe?.signedDocumentUrl
            if (redirectUrl || completedUrl) {
              const sign = redirectUrl ? String(redirectUrl) : null
              const done = completedUrl ? String(completedUrl) : null
              setIndependentContractorServices({
                link: done || sign || '',
                signFormLink: sign,
                completedLink: done,
                status: agreementData?.agreement?.status || 'draft',
                title: 'Independent Contractor Services Agreement',
              })
            }
          }
        } catch {
          // ignore, fallback to static card below
        }

        // Admin-uploaded agreements (read-only for installer)
        try {
          const agreementsRes = await fetch(`/api/installers/${id}/agreements`, {
            headers: { Authorization: `Bearer ${tok}` },
            cache: 'no-store',
          })
          if (agreementsRes.ok) {
            const agreementsData = await agreementsRes.json().catch(() => null)
            const list = Array.isArray(agreementsData?.agreements) ? agreementsData.agreements : []
            const uploaded = list
              .filter((a: any) => typeof a?.type === 'string' && a.type.startsWith('admin-uploaded-agreement:'))
              .map((a: any) => ({
                id: String(a.id),
                title: String(a?.payload?.title || 'Uploaded Agreement'),
                fileUrl: String(a?.payload?.fileUrl || ''),
                createdAt: a?.createdAt ? String(a.createdAt) : null,
              }))
              .filter((a: any) => a.fileUrl)
            setUploadedAgreements(uploaded)
          }
        } catch {
          // ignore
        }

      } catch (e: any) {
        setError(e?.message || 'Unable to load your profile.')
      } finally {
        setChecking(false)
      }
    }

    run()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (checking) {
    return (
      <div className="min-h-screen interview-gradient flex items-center justify-center">
        <LogoHeartbeatLoader size={72} />
      </div>
    )
  }

  return (
    <>
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-200/50 sticky top-0 z-20 shadow-sm">
        <div className="px-4 lg:px-6 pt-20 lg:pt-6 pb-5 lg:pb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-11 sm:h-11 bg-brand-green/10 rounded-xl flex items-center justify-center flex-shrink-0">
              <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-brand-green" />
            </div>
            <div>
              <h1 className="text-[2rem] sm:text-3xl leading-tight font-bold text-slate-900">Agreements</h1>
              <p className="text-sm text-slate-500">Sign required forms using Adobe Sign</p>
            </div>
          </div>
        </div>
      </header>

      <main className="p-4 sm:p-6 lg:p-8 w-full">
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200/60 p-4 sm:p-6 w-full">
          <div className="grid gap-4">
            <a
              href="https://na2.documents.adobe.com/public/esignWidget?wid=CBFCIBAA3AAABLblqZhB5j-mH_p2ruL7INNqrKVKTBR2ncZH-koaIAKG71Adn7Y-twmq0L10ntLY98fB-vjc*"
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-start gap-3 sm:gap-4 p-3.5 sm:p-4 rounded-xl border border-slate-200 hover:border-brand-green/40 hover:bg-slate-50 transition-colors"
            >
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-brand-green/10 flex items-center justify-center flex-shrink-0">
                <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-brand-green" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-start gap-2">
                  <div className="font-bold text-slate-900 group-hover:text-brand-green transition-colors leading-tight">W-9 Form</div>
                </div>
                <div className="text-sm text-slate-600 mt-1 leading-snug">W-9 FORM - Fillable Form</div>
              </div>
              <div className="ml-1 sm:ml-2 text-slate-400 group-hover:text-brand-green transition-colors flex items-center gap-1 flex-shrink-0 self-start">
                <ExternalLink className="w-4 h-4" />
              </div>
            </a>

            <a
              href="https://na2.documents.adobe.com/public/esignWidget?wid=CBFCIBAA3AAABLblqZhD6ZgUjSyD1XPnftzSvkU-VqsxteBEqz1hpXmXiNGqkahKR0pZRusQ4zRcPAlT13oI*"
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-start gap-3 sm:gap-4 p-3.5 sm:p-4 rounded-xl border border-slate-200 hover:border-brand-green/40 hover:bg-slate-50 transition-colors"
            >
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-brand-green/10 flex items-center justify-center flex-shrink-0">
                <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-brand-green" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-start gap-2">
                  <div className="font-bold text-slate-900 group-hover:text-brand-green transition-colors leading-tight">
                    Background Authorization and Release Form
                  </div>
                </div>
                <div className="text-sm text-slate-600 mt-1 leading-snug">BACKGROUND AUTHORIZATION AND RELEASE FORM - Fillable Form</div>
              </div>
              <div className="ml-1 sm:ml-2 text-slate-400 group-hover:text-brand-green transition-colors flex items-center gap-1 flex-shrink-0 self-start">
                <ExternalLink className="w-4 h-4" />
              </div>
            </a>

            <a
              href={DEFAULT_INDEPENDENT_CONTRACTOR_ADOBE_WIDGET}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-start gap-3 sm:gap-4 p-3.5 sm:p-4 rounded-xl border border-slate-200 hover:border-brand-green/40 hover:bg-slate-50 transition-colors"
            >
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-brand-green/10 flex items-center justify-center flex-shrink-0">
                <CreditCard className="w-5 h-5 sm:w-6 sm:h-6 text-brand-green" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-start gap-2">
                  <div className="font-bold text-slate-900 group-hover:text-brand-green transition-colors leading-tight">
                    Independent Contractor Banking
                  </div>
                </div>
                <div className="text-sm text-slate-600 mt-1 leading-snug">Independent Contractor Banking - Fillable Form</div>
              </div>
              <div className="ml-1 sm:ml-2 text-slate-400 group-hover:text-brand-green transition-colors flex items-center gap-1 flex-shrink-0 self-start">
                <ExternalLink className="w-4 h-4" />
              </div>
            </a>

            {independentContractorServices?.link && (
              <div className="rounded-xl border border-slate-200 p-3.5 sm:p-4 space-y-3">
                <a
                  href={independentContractorServices.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-start gap-3 sm:gap-4 rounded-xl hover:bg-slate-50 transition-colors -m-1 p-1"
                >
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-brand-green/10 flex items-center justify-center flex-shrink-0">
                    <CreditCard className="w-5 h-5 sm:w-6 sm:h-6 text-brand-green" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-start gap-2">
                      <div className="font-bold text-slate-900 group-hover:text-brand-green transition-colors leading-tight">
                        {independentContractorServices.title}
                      </div>
                      <span
                        className={`text-xs font-bold px-2 py-0.5 rounded-full border ${
                          independentContractorServices.status === 'approved'
                            ? 'bg-success-100 border-success-200 text-success-700'
                            : 'bg-warning-100 border-warning-200 text-warning-700'
                        }`}
                      >
                        {independentContractorServices.status === 'approved'
                          ? 'Completed'
                          : 'Pending Approval'}
                      </span>
                    </div>
                    <div className="text-sm text-slate-600 mt-1 leading-snug">
                      {independentContractorServices.completedLink
                        ? 'View your signed Independent Contractor Services Agreement (saved copy).'
                        : 'Open your prefilled agreement to sign in Adobe.'}
                    </div>
                    {independentContractorServices.completedLink && (
                      <a
                        href={independentContractorServices.completedLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-brand-green hover:text-brand-green-dark underline"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        View Agreement
                      </a>
                    )}
                  </div>
                  <div className="ml-1 sm:ml-2 text-slate-400 group-hover:text-brand-green transition-colors flex items-center gap-1 flex-shrink-0 self-start">
                    <ExternalLink className="w-4 h-4" />
                  </div>
                </a>
              </div>
            )}

            <Link
              href="/installer/agreements/nda"
              className="group flex items-start gap-3 sm:gap-4 p-3.5 sm:p-4 rounded-xl border border-slate-200 hover:border-brand-green/40 hover:bg-slate-50 transition-colors"
            >
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-brand-green/10 flex items-center justify-center flex-shrink-0">
                <Shield className="w-5 h-5 sm:w-6 sm:h-6 text-brand-green" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-start gap-2">
                  <div className="font-bold text-slate-900 group-hover:text-brand-green transition-colors leading-tight">NDA Agreement</div>
                  {installer?.ndaAgreedAt ? (
                    <span className="text-xs font-bold text-success-700 bg-success-100 border border-success-200 px-2 py-0.5 rounded-full">
                      Completed
                    </span>
                  ) : (
                    <span className="text-xs font-bold text-warning-700 bg-warning-100 border border-warning-200 px-2 py-0.5 rounded-full">
                      Required
                    </span>
                  )}
                </div>
                <div className="text-sm text-slate-600 mt-1 leading-snug">Review and accept the NDA.</div>
              </div>
              <div className="ml-1 sm:ml-2 text-slate-400 group-hover:text-brand-green transition-colors flex-shrink-0 self-start">→</div>
            </Link>

            {uploadedAgreements.length > 0 && (
              <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="font-bold text-slate-900">Uploaded by Admin</div>
                  <span className="text-xs font-semibold text-slate-500">{uploadedAgreements.length}</span>
                </div>
                <div className="mt-3 grid gap-2">
                  {uploadedAgreements.map((a) => (
                    <a
                      key={a.id}
                      href={a.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group flex items-start gap-3 p-3 rounded-xl border border-slate-200 bg-white hover:border-brand-green/40 hover:bg-slate-50 transition-colors"
                    >
                      <div className="w-10 h-10 rounded-xl bg-brand-green/10 flex items-center justify-center flex-shrink-0">
                        <FileCheck className="w-5 h-5 text-brand-green" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-slate-900 group-hover:text-brand-green transition-colors leading-tight">
                          {a.title}
                        </div>
                        {a.createdAt ? (
                          <div className="text-xs text-slate-500 mt-0.5">
                            Uploaded: {new Date(a.createdAt).toLocaleDateString()}
                          </div>
                        ) : null}
                      </div>
                      <div className="ml-1 text-slate-400 group-hover:text-brand-green transition-colors flex items-center gap-1 flex-shrink-0 self-start">
                        <ExternalLink className="w-4 h-4" />
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </>
  )
}
