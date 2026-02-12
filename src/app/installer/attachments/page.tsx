'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  User, 
  LayoutDashboard,
  FileText,
  Bell,
  Menu,
  X,
  LogOut,
  Upload,
  FileCheck,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Paperclip,
  Shield,
  Building2,
  FileX,
  Download,
  Trash2,
  CreditCard,
  Briefcase
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Dancing_Script } from 'next/font/google'
import logo from '@/images/freepik_br_649d627d-2016-4108-ab09-0d2a0ad903d9.png'

const dancingScript = Dancing_Script({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
})

interface Document {
  id: string
  type: string
  fileName: string
  fileUrl: string
  uploadedAt: string
  fileSize?: number
}

const DOCUMENT_TYPES = [
  { 
    id: 'business_registration', 
    name: 'Business Registration',
    description: 'Upload your business registration certificate',
    icon: Building2,
    required: true
  },
  { 
    id: 'w9', 
    name: 'W-9 Form',
    description: 'Upload your completed W-9 tax form',
    icon: FileText,
    required: true
  },
  { 
    id: 'liability_insurance', 
    name: 'Liability Insurance',
    description: 'Upload your general liability insurance certificate',
    icon: Shield,
    required: true
  },
  { 
    id: 'workers_comp', 
    name: "Workers' Compensation Insurance",
    description: 'Upload your workers compensation insurance certificate',
    icon: Shield,
    required: true
  },
  { 
    id: 'workers_comp_certificate', 
    name: "WORKERS' COMPENSATION CERTIFICATE",
    description: 'Upload your workers compensation certificate',
    icon: FileCheck,
    required: false
  },
  { 
    id: 'lrrp', 
    name: 'Lead Renovator Certificate (LRRP)',
    description: 'Upload your Lead Renovator, Repair, and Painting certificate',
    icon: FileCheck,
    required: false
  },
]

export default function AttachmentsPage() {
  const router = useRouter()
  const [installer, setInstaller] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [documents, setDocuments] = useState<Document[]>([])
  const [uploading, setUploading] = useState<{ [key: string]: boolean }>({})
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [showContractModal, setShowContractModal] = useState(false)
  const [isSigningContract, setIsSigningContract] = useState(false)
  const [contractSignature, setContractSignature] = useState('')
  const [contractName, setContractName] = useState('')
  const [contractDate, setContractDate] = useState(new Date().toISOString().split('T')[0])

  useEffect(() => {
    checkAuthAndLoadData()
  }, [])

  const checkAuthAndLoadData = async () => {
    const token = localStorage.getItem('installerToken')
    const storedInstallerId = localStorage.getItem('installerId')

    if (!token) {
      router.push('/installer/login')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      const verifyResponse = await fetch('/api/installers/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })

      // Check if response is JSON before parsing
      const verifyContentType = verifyResponse.headers.get('content-type')
      if (!verifyContentType || !verifyContentType.includes('application/json')) {
        const text = await verifyResponse.text()
        console.error('Non-JSON response from verify API:', text.substring(0, 200))
        throw new Error('Server returned an error. Please try again.')
      }

      const verifyData = await verifyResponse.json()

      if (!verifyData.success || !verifyData.installerId) {
        localStorage.removeItem('installerToken')
        localStorage.removeItem('installerId')
        router.push('/installer/login')
        return
      }

      const installerId = verifyData.installerId
      localStorage.setItem('installerId', installerId)

      // Load installer profile
      const profileResponse = await fetch(`/api/installers/${installerId}`)
      
      // Check if response is JSON before parsing
      const profileContentType = profileResponse.headers.get('content-type')
      if (!profileContentType || !profileContentType.includes('application/json')) {
        const text = await profileResponse.text()
        console.error('Non-JSON response from profile API:', text.substring(0, 200))
        throw new Error('Server returned an error. Please refresh and try again.')
      }
      
      if (!profileResponse.ok) {
        const errorData = await profileResponse.json()
        throw new Error(errorData.error || 'Failed to load profile')
      }
      const profileData = await profileResponse.json()
      setInstaller(profileData.installer)
      
      // Show contract modal if not signed yet
      if (!profileData.installer.serviceAgreementSignedAt) {
        setShowContractModal(true)
      }

      // Load documents
      const docsResponse = await fetch(`/api/installers/${installerId}/documents`)
      if (docsResponse.ok) {
        const docsContentType = docsResponse.headers.get('content-type')
        if (docsContentType && docsContentType.includes('application/json')) {
          const docsData = await docsResponse.json()
          setDocuments(docsData.documents || [])
        }
      }
    } catch (err: any) {
      console.error('Error loading data:', err)
      setError(err.message || 'Failed to load data')
    } finally {
      setIsLoading(false)
    }
  }

  const handleFileUpload = async (type: string, file: File) => {
    if (!installer) return

    // Check file size limit (4MB to stay under Vercel's 4.5MB serverless limit)
    if (file.size > 4 * 1024 * 1024) {
      setError('File size must be less than 4MB. Please compress or use a smaller file.')
      return
    }

    setUploading({ ...uploading, [type]: true })
    setError('')
    setSuccess('')

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('type', type)
      formData.append('installerId', installer.id)

      const response = await fetch(`/api/installers/${installer.id}/documents`, {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to upload document')
      }

      if (data.document) {
        setDocuments([...documents.filter(d => d.type !== type), data.document])
        setSuccess(`${DOCUMENT_TYPES.find(dt => dt.id === type)?.name} uploaded successfully!`)
        setTimeout(() => setSuccess(''), 3000)
      }
    } catch (err: any) {
      console.error('Error uploading document:', err)
      setError(err.message || 'Failed to upload document')
    } finally {
      setUploading({ ...uploading, [type]: false })
    }
  }

  const handleDeleteDocument = async (documentId: string, type: string) => {
    if (!installer || !confirm('Are you sure you want to delete this document?')) return

    try {
      const response = await fetch(`/api/installers/${installer.id}/documents/${documentId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete document')
      }

      setDocuments(documents.filter(d => d.id !== documentId))
      setSuccess('Document deleted successfully!')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err: any) {
      console.error('Error deleting document:', err)
      setError(err.message || 'Failed to delete document')
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('installerToken')
    localStorage.removeItem('installerId')
    router.push('/installer/login')
  }

  const handleSignContract = async () => {
    if (!installer) {
      setError('Installer information not available. Please refresh the page.')
      return
    }

    if (!contractSignature.trim()) {
      setError('Please enter your signature')
      return
    }

    setIsSigningContract(true)
    setError('')
    setSuccess('')

    try {
      const response = await fetch(`/api/installers/${installer.id}/sign-service-agreement`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          signature: contractSignature,
          name: contractName || `${installer.firstName || ''} ${installer.lastName || ''}`.trim(),
          date: contractDate,
        }),
      })

      const contentType = response.headers.get('content-type')
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text()
        console.error('Non-JSON response from sign-service-agreement API:', text.substring(0, 200))
        throw new Error('Server error: API returned invalid response.')
      }

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || errorData.details || `Failed to sign contract (${response.status})`)
      }

      const data = await response.json()

      if (data.success && data.installer) {
        setInstaller(data.installer)
        setShowContractModal(false)
        setSuccess('Service agreement signed successfully!')
        setTimeout(() => setSuccess(''), 3000)
      } else {
        throw new Error(data.error || 'Failed to sign service agreement')
      }
    } catch (err: any) {
      console.error('Error signing contract:', err)
      setError(err.message || 'Failed to sign service agreement. Please try again.')
    } finally {
      setIsSigningContract(false)
    }
  }

  const handleSignLater = () => {
    setShowContractModal(false)
    setSuccess('You can sign the service agreement later from this page.')
    setTimeout(() => setSuccess(''), 5000)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen interview-gradient flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-brand-green animate-spin mx-auto mb-4" />
          <p className="text-primary-600">Loading attachments...</p>
        </div>
      </div>
    )
  }

  if (!installer) {
    return (
      <div className="min-h-screen interview-gradient flex items-center justify-center p-4">
        <div className="text-center bg-white rounded-3xl shadow-xl p-8 max-w-md">
          <AlertCircle className="w-16 h-16 text-danger-600 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-primary-900 mb-2">Access Denied</h2>
          <p className="text-primary-500 mb-6">{error || 'Unable to load your profile.'}</p>
          <button
            onClick={() => router.push('/installer/login')}
            className="w-full px-6 py-3 bg-brand-green text-white rounded-xl font-medium hover:bg-brand-green-dark transition-colors"
          >
            Go to Login
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Service Agreement Contract Modal */}
      {showContractModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col"
          >
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-200 bg-gradient-to-r from-brand-green to-brand-green-dark">
              <h2 className="text-2xl font-bold text-white">Service Agreement</h2>
              <p className="text-white/90 text-sm mt-1">Please review and sign the service agreement</p>
            </div>

            {/* Modal Content - Scrollable */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="prose max-w-none">
                <h3 className="text-xl font-bold text-slate-900 mb-4">FLOOR INTERIOR SERVICES, CORP. SERVICES AGREEMENT</h3>
                
                <p className="text-slate-700 mb-4">
                  This Contract is effective on the date indicated below (the "Effective Date") between Floor Interior Services, Corp. and 
                  the Independent Contractor as defined below. The terms of this Contract govern, as applicable, real property 
                  improvements and the detail assessments of real property improvements provided by Independent Contractor to Floor 
                  Interior Services Corp. Customers ("Installation Services"). The term "Services" means Installation Services. The term 
                  "Lowe's" means Lowe's Home Centers, LLC.
                </p>

                <h4 className="text-lg font-semibold text-slate-900 mt-6 mb-3">Contact Information</h4>
                <p className="text-slate-700 mb-2">
                  <strong>Official Business Name of Independent Contractor ("Independent Contractor")</strong>
                </p>
                <p className="text-slate-700 mb-2">
                  <strong>Address:</strong> {installer?.companyStreetAddress || 'Not provided'}
                </p>
                <p className="text-slate-700 mb-2">
                  <strong>City, State, Zip Code:</strong> {installer?.companyCity || ''} {installer?.companyState || ''} {installer?.companyZipCode || ''}
                </p>
                <p className="text-slate-700 mb-4">
                  <strong>Email:</strong> {installer?.email || 'Not provided'}
                </p>

                <p className="text-slate-700 mb-6 font-semibold">
                  BY EXECUTING THIS CONTRACT, FLOOR INTERIOR SERVICES, CORP. AND INDEPENDENT CONTRACTOR AGREE TO THE 
                  TERMS SET OUT IN THIS CONTRACT AND ANY ATTACHMENTS, AND AGREE TO ARBITRATE ANY CONTROVERSY BETWEEN 
                  THEM, AS DESCRIBED IN SECTION 15.
                </p>

                <h4 className="text-lg font-semibold text-slate-900 mt-6 mb-3">Signatures</h4>
                
                <div className="mt-6 space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Printed Name *
                    </label>
                    <input
                      type="text"
                      value={contractName}
                      onChange={(e) => setContractName(e.target.value)}
                      placeholder={installer ? `${installer.firstName || ''} ${installer.lastName || ''}`.trim() || 'Enter your name' : 'Enter your name'}
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-white text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Signature *
                    </label>
                    <input
                      type="text"
                      value={contractSignature}
                      onChange={(e) => setContractSignature(e.target.value)}
                      placeholder="Enter your signature"
                      className={`w-full px-4 py-3 border border-slate-300 rounded-lg focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-white text-slate-900 ${dancingScript.className} text-2xl`}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Effective Date *
                    </label>
                    <input
                      type="date"
                      value={contractDate}
                      onChange={(e) => setContractDate(e.target.value)}
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-white text-slate-900"
                    />
                  </div>
                </div>

                <p className="text-sm text-slate-600 mt-6">
                  This Agreement may be executed in one or more counterparts, each of which shall be deemed an original, but all of 
                  which together shall constitute one and the same instrument.
                </p>

                <p className="text-sm text-slate-600 mt-4">
                  <strong>THE FOLLOWING ARE PART OF THIS CONTRACT:</strong> Performance of Installation Services (Attachment A), Schedule of Prices 
                  (Attachment B), Insurance Requirements (Attachment C), Independent Contractor Code of Conduct (Attachment D), 
                  Warranty Retainer (Attachment E), Service Requirements (Attachment F), Reference Guides (Attachment G).
                </p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-4">
              <button
                onClick={handleSignLater}
                className="px-6 py-3 border border-slate-300 text-slate-700 rounded-xl font-medium hover:bg-slate-100 transition-colors"
              >
                Sign Later
              </button>
              <button
                onClick={handleSignContract}
                disabled={isSigningContract || !contractSignature.trim()}
                className="px-6 py-3 bg-gradient-to-r from-brand-green to-brand-green-dark text-white rounded-xl font-medium hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isSigningContract ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Signing...
                  </>
                ) : (
                  'Sign Agreement'
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'w-64' : 'w-20'} bg-brand-green border-r border-brand-green-dark transition-all duration-300 flex flex-col fixed h-screen z-30 hidden lg:flex shadow-lg`}>
        <div className="p-6 border-b border-slate-200 bg-white flex items-center justify-between">
          <div className={`flex items-center gap-3 ${!sidebarOpen && 'justify-center w-full'}`}>
            <div className="w-10 h-10 flex-shrink-0">
              <Image
                src={logo}
                alt="Logo"
                width={40}
                height={40}
                className="w-full h-full object-contain"
              />
            </div>
            {sidebarOpen && (
              <div>
                <h1 className="font-bold text-primary-900 text-sm">Installer Portal</h1>
                <p className="text-xs text-primary-500">Dashboard</p>
              </div>
            )}
          </div>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-primary-600"
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          <Link
            href="/installer/dashboard"
            className="flex items-center gap-3 px-4 py-3 text-white/90 hover:bg-white/10 rounded-xl transition-colors"
          >
            <LayoutDashboard className="w-5 h-5 flex-shrink-0" />
            {sidebarOpen && <span>Dashboard</span>}
          </Link>
          <Link
            href="/installer/profile"
            className="flex items-center gap-3 px-4 py-3 text-white/90 hover:bg-white/10 rounded-xl transition-colors"
          >
            <User className="w-5 h-5 flex-shrink-0" />
            {sidebarOpen && <span>Profile</span>}
          </Link>
          <Link
            href="/installer/jobs"
            className="flex items-center gap-3 px-4 py-3 text-white/90 hover:bg-white/10 rounded-xl transition-colors"
          >
            <Briefcase className="w-5 h-5 flex-shrink-0" />
            {sidebarOpen && <span>Jobs</span>}
          </Link>
          <Link
            href="/installer/attachments"
            className="flex items-center gap-3 px-4 py-3 bg-white/20 text-white rounded-xl font-medium"
          >
            <Paperclip className="w-5 h-5 flex-shrink-0" />
            {sidebarOpen && <span>Attachments</span>}
          </Link>
          <Link
            href="/installer/payment"
            className="flex items-center gap-3 px-4 py-3 text-white/90 hover:bg-white/10 rounded-xl transition-colors"
          >
            <CreditCard className="w-5 h-5 flex-shrink-0" />
            {sidebarOpen && <span>Payment</span>}
          </Link>
          <Link
            href="/installer/notifications"
            className="flex items-center gap-3 px-4 py-3 text-white/90 hover:bg-white/10 rounded-xl transition-colors"
          >
            <Bell className="w-5 h-5 flex-shrink-0" />
            {sidebarOpen && <span>Notifications</span>}
          </Link>
        </nav>

        <div className="p-4 border-t border-slate-200 bg-white">
          <div className={`flex items-center gap-3 mb-4 ${!sidebarOpen && 'justify-center'}`}>
            <div className="w-10 h-10 bg-brand-green/10 rounded-full flex items-center justify-center flex-shrink-0">
              <User className="w-5 h-5 text-brand-green" />
            </div>
            {sidebarOpen && (
              <div className="flex-1 min-w-0">
                <p className="font-medium text-primary-900 text-sm truncate">
                  {installer.firstName || installer.lastName 
                    ? `${installer.firstName || ''} ${installer.lastName || ''}`.trim()
                    : installer.email.split('@')[0]
                  }
                </p>
                <p className="text-xs text-primary-500 truncate">{installer.email}</p>
              </div>
            )}
          </div>
          <button
            onClick={handleLogout}
            className={`w-full flex items-center gap-3 px-4 py-3 text-primary-600 hover:bg-slate-100 rounded-xl transition-colors ${!sidebarOpen && 'justify-center'}`}
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            {sidebarOpen && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className={`flex-1 transition-all duration-300 ${sidebarOpen ? 'lg:ml-64' : 'lg:ml-20'} w-full`}>
        <header className="bg-white/80 backdrop-blur-md border-b border-slate-200/50 sticky top-0 z-20 shadow-sm">
          <div className="px-4 lg:px-6 py-6">
            <h1 className="text-3xl font-bold text-slate-900 mb-1">Attachments</h1>
            <p className="text-sm text-slate-500">Upload and manage your required documents</p>
          </div>
        </header>

        <main className="p-6 lg:p-8">
          {success && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-4 bg-gradient-to-r from-success-50 to-success-100 border border-success-200 rounded-xl text-success-700 text-sm font-medium flex items-center gap-2"
            >
              <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
              {success}
            </motion.div>
          )}

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-4 bg-gradient-to-r from-danger-50 to-danger-100 border border-danger-200 rounded-xl text-danger-700 text-sm font-medium flex items-center gap-2"
            >
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              {error}
            </motion.div>
          )}

          <div className="grid gap-6">
            {DOCUMENT_TYPES.map((docType) => {
              const Icon = docType.icon
              const existingDoc = documents.find(d => d.type === docType.id)
              const isUploading = uploading[docType.id]

              return (
                <motion.div
                  key={docType.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-2xl shadow-lg border border-slate-200/60 p-6 backdrop-blur-sm"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-start gap-4 flex-1">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        existingDoc ? 'bg-success-100' : 'bg-brand-green/10'
                      }`}>
                        <Icon className={`w-6 h-6 ${existingDoc ? 'text-success-600' : 'text-brand-green'}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-lg font-bold text-slate-900">{docType.name}</h3>
                          {docType.required && (
                            <span className="text-xs font-semibold text-danger-600 bg-danger-50 px-2 py-0.5 rounded-full">
                              Required
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-slate-500 mb-2">{docType.description}</p>
                        {existingDoc && (
                          <div className="flex items-center gap-2 text-sm text-slate-600 mt-2">
                            <CheckCircle2 className="w-4 h-4 text-success-600" />
                            <span>Uploaded on {new Date(existingDoc.uploadedAt).toLocaleDateString()}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {existingDoc ? (
                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <FileText className="w-5 h-5 text-brand-green flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-slate-900 truncate">{existingDoc.fileName}</p>
                          {existingDoc.fileSize && (
                            <p className="text-xs text-slate-500">
                              {(existingDoc.fileSize / 1024 / 1024).toFixed(2)} MB
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <a
                          href={existingDoc.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 text-brand-green hover:bg-brand-green/10 rounded-lg transition-colors"
                          title="Download"
                        >
                          <Download className="w-5 h-5" />
                        </a>
                        <label className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer" title="Replace">
                          <Upload className="w-5 h-5" />
                          <input
                            type="file"
                            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                            onChange={(e) => {
                              const file = e.target.files?.[0]
                              if (file) handleFileUpload(docType.id, file)
                            }}
                            className="hidden"
                            disabled={isUploading}
                          />
                        </label>
                        <button
                          onClick={() => handleDeleteDocument(existingDoc.id, docType.id)}
                          className="p-2 text-danger-600 hover:bg-danger-50 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <label className="block">
                      <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:border-brand-green transition-colors cursor-pointer bg-slate-50/50">
                        {isUploading ? (
                          <div className="flex flex-col items-center gap-3">
                            <Loader2 className="w-8 h-8 text-brand-green animate-spin" />
                            <p className="text-sm font-medium text-slate-600">Uploading...</p>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center gap-3">
                            <Upload className="w-8 h-8 text-slate-400" />
                            <div>
                              <p className="text-sm font-medium text-slate-700 mb-1">
                                Click to upload or drag and drop
                              </p>
                              <p className="text-xs text-slate-500">
                                PDF, DOC, DOCX, JPG, PNG (Max 10MB)
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                      <input
                        type="file"
                        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) {
                            if (file.size > 10 * 1024 * 1024) {
                              setError('File size must be less than 10MB')
                              return
                            }
                            handleFileUpload(docType.id, file)
                          }
                        }}
                        className="hidden"
                        disabled={isUploading}
                      />
                    </label>
                  )}
                </motion.div>
              )
            })}
          </div>
        </main>
      </div>
    </div>
  )
}
