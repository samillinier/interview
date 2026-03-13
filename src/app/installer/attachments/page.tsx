'use client'

import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { upload } from '@vercel/blob/client'
import { 
  User, 
  LayoutDashboard,
  FileText,
  Bell,
  Menu,
  X,
  LogOut,
  Upload,
  Plus,
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
  Briefcase,
  ExternalLink,
  HelpCircle
} from 'lucide-react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import logo from '@/images/freepik_br_649d627d-2016-4108-ab09-0d2a0ad903d9.png'
import { InstallerMobileMenu } from '@/components/InstallerMobileMenu'

// All document types now support multiple uploads
const MULTI_DOCUMENT_TYPES = new Set() // Empty set - all types are multi now

interface Document {
  id: string
  type: string
  name?: string
  fileName: string
  fileUrl: string
  url?: string
  uploadedAt: string
  createdAt?: string
  fileSize?: number
  verificationLink?: string | null
  verificationLinkStatus?: string | null
}

const DOCUMENT_TYPES = [
  { 
    id: 'sunbiz', 
    name: 'Sunbiz',
    description: 'Upload your Sunbiz registration document',
    icon: Building2,
    required: false
  },
  { 
    id: 'business_registration', 
    name: 'Business Tax Receipt',
    description: 'Upload your business tax receipt certificate',
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
    id: 'auto_insurance', 
    name: 'Auto Insurance',
    description: 'Upload your auto insurance certificate / policy',
    icon: Shield,
    required: false
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
    id: 'lead_firm_certificate', 
    name: 'Lead Firm Certificate',
    description: 'Upload your Lead Firm Certificate',
    icon: FileCheck,
    required: false
  },
  { 
    id: 'employers_liability', 
    name: "Employer's Liability Insurance",
    description: "Upload your employer's liability insurance certificate",
    icon: Shield,
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
  const pathname = usePathname()
  const [installer, setInstaller] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [documents, setDocuments] = useState<Document[]>([])
  const [uploading, setUploading] = useState<{ [key: string]: boolean }>({})
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [notificationCount, setNotificationCount] = useState(0)
  const [deleteConfirm, setDeleteConfirm] = useState<{ show: boolean; documentId: string | null; documentName: string; documentType: string }>({
    show: false,
    documentId: null,
    documentName: '',
    documentType: '',
  })
  const [isDeleting, setIsDeleting] = useState(false)
  const fileInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({})

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
      const profileResponse = await fetch(`/api/installers/${installerId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      })
      
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
      
      // Fetch notification count
      try {
        const notificationResponse = await fetch(`/api/notifications/count?installerId=${installerId}`)
        if (notificationResponse.ok) {
          const notificationData = await notificationResponse.json()
          setNotificationCount(notificationData.count || 0)
        }
      } catch (error) {
        console.error('Error fetching notification count:', error)
      }
      
      // Load documents
      const docsResponse = await fetch(`/api/installers/${installerId}/documents`)
      if (docsResponse.ok) {
        const docsContentType = docsResponse.headers.get('content-type')
        if (docsContentType && docsContentType.includes('application/json')) {
          const docsData = await docsResponse.json()
          // Map API response fields to frontend expected fields
          const mappedDocuments = (docsData.documents || []).map((doc: any) => ({
            id: doc.id,
            type: doc.type,
            name: doc.name || 'Document',
            fileName: doc.name || 'Document',
            fileUrl: doc.url,
            url: doc.url,
            uploadedAt: doc.createdAt || doc.uploadedAt || new Date().toISOString(),
            createdAt: doc.createdAt || doc.uploadedAt || new Date().toISOString(),
            fileSize: doc.fileSize || doc.size,
            verificationLink: doc.verificationLink || null,
            verificationLinkStatus: doc.verificationLinkStatus || null,
          }))
          setDocuments(mappedDocuments)
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
    if (!installer) {
      setError('Installer information not available. Please refresh the page.')
      return
    }

    // Allow up to 10MB (uploads go direct-to-Blob to avoid serverless body limits)
    if (file.size > 10 * 1024 * 1024) {
      setError('File size must be less than 10MB. Please compress or upload a smaller version.')
      return
    }

    // Validate file type
    const allowedExtensions = ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png']
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase()
    if (!allowedExtensions.includes(fileExtension)) {
      setError('Invalid file type. Allowed: PDF, DOC, DOCX, JPG, PNG')
      return
    }

    setUploading({ ...uploading, [type]: true })
    setError('')
    setSuccess('')

    try {
      // 1) Direct upload to Vercel Blob
      const timestamp = Date.now()
      const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
      const blobPath = `documents/${installer.id}_${type}_${timestamp}_${sanitizedFileName}`

      const blob = await upload(blobPath, file, {
        access: 'public',
        handleUploadUrl: '/api/blob/upload',
      })

      // 2) Save URL in DB
      const response = await fetch(`/api/installers/${installer.id}/documents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: blob.url, name: file.name, type }),
      })

      const contentType = response.headers.get('content-type')
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text()
        console.error('Non-JSON response from documents API:', text.substring(0, 200))
        throw new Error(`Upload failed (HTTP ${response.status}). Please try again.`)
      }

      const data = await response.json()

      if (!response.ok) {
        console.error('Upload failed:', data)
        throw new Error(data.error || 'Failed to upload document')
      }

      if (data.document) {
        // Map API response fields to frontend expected fields
        const mappedDocument = {
          id: data.document.id,
          type: data.document.type,
          fileName: data.document.name || file.name,
          fileUrl: data.document.url || blob.url,
          uploadedAt: data.document.createdAt || data.document.uploadedAt || new Date().toISOString(),
          fileSize: data.document.fileSize || file.size,
        }
        if (MULTI_DOCUMENT_TYPES.has(type)) {
          // Append new document for multi-document types
          setDocuments([mappedDocument, ...documents])
        } else {
          // Replace existing for single-document types
          setDocuments([...documents.filter(d => d.type !== type), mappedDocument])
        }
        setSuccess(`${DOCUMENT_TYPES.find(dt => dt.id === type)?.name} uploaded successfully!`)
        setTimeout(() => setSuccess(''), 3000)
        
        // Reset file input
        const fileInput = fileInputRefs.current[type]
        if (fileInput) {
          fileInput.value = ''
        }
      }
    } catch (err: any) {
      console.error('Error uploading document:', err)
      setError(err.message || 'Failed to upload document. Please try again.')
    } finally {
      setUploading({ ...uploading, [type]: false })
    }
  }

  const handleDeleteClick = (documentId: string, documentName: string, documentType: string) => {
    const docType = DOCUMENT_TYPES.find(dt => dt.id === documentType)
    setDeleteConfirm({
      show: true,
      documentId,
      documentName: documentName || docType?.name || 'this document',
      documentType: docType?.name || documentType,
    })
  }

  const handleDeleteCancel = () => {
    setDeleteConfirm({ show: false, documentId: null, documentName: '', documentType: '' })
  }

  const handleDeleteConfirm = async () => {
    if (!installer || !deleteConfirm.documentId) return

    try {
      setIsDeleting(true)
      const response = await fetch(`/api/installers/${installer.id}/documents/${deleteConfirm.documentId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete document')
      }

      setDocuments(documents.filter(d => d.id !== deleteConfirm.documentId))
      setSuccess('Document deleted successfully!')
      setTimeout(() => setSuccess(''), 3000)
      setDeleteConfirm({ show: false, documentId: null, documentName: '', documentType: '' })
    } catch (err: any) {
      console.error('Error deleting document:', err)
      setError(err.message || 'Failed to delete document')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('installerToken')
    localStorage.removeItem('installerId')
    router.push('/installer/login')
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
            href="/installer/agreements"
            className="flex items-center gap-3 px-4 py-3 text-white/90 hover:bg-white/10 rounded-xl transition-colors"
          >
            <FileText className="w-5 h-5 flex-shrink-0" />
            {sidebarOpen && <span>Agreements</span>}
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
            {sidebarOpen && <span>Account</span>}
          </Link>
          <Link
            href="/installer/referrals"
            className="flex items-center gap-3 px-4 py-3 text-white/90 hover:bg-white/10 rounded-xl transition-colors"
          >
            <ExternalLink className="w-5 h-5 flex-shrink-0" />
            {sidebarOpen && <span>Referrals</span>}
          </Link>
          <Link
            href="/installer/notifications"
            className="flex items-center gap-3 px-4 py-3 text-white/90 hover:bg-white/10 rounded-xl transition-colors"
          >
            <Bell className="w-5 h-5 flex-shrink-0" />
            {sidebarOpen && (
              <div className="flex items-center gap-2">
                <span>Notifications</span>
                {notificationCount > 0 && (
                  <span className="bg-white text-brand-green text-xs font-bold rounded-full min-w-[20px] h-5 px-2 flex items-center justify-center">
                    {notificationCount > 9 ? '9+' : notificationCount}
                  </span>
                )}
              </div>
            )}
          </Link>
          <Link
            href="/installer/help"
            className="flex items-center gap-3 px-4 py-3 text-white/90 hover:bg-white/10 rounded-xl transition-colors"
          >
            <HelpCircle className="w-5 h-5 flex-shrink-0" />
            {sidebarOpen && <span>Help</span>}
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
        <InstallerMobileMenu pathname={pathname} notificationCount={notificationCount} onLogout={handleLogout} />
        <header className="bg-white/80 backdrop-blur-md border-b border-slate-200/50 sticky top-0 z-20 shadow-sm">
          <div className="px-4 lg:px-6 pt-16 lg:pt-6 pb-6">
            <h1 className="text-3xl font-bold text-slate-900 mb-1">Attachments</h1>
            <p className="text-sm text-slate-500">Upload and manage your required documents</p>
          </div>
        </header>

        <main className="p-4 sm:p-6 lg:p-8">
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
              const isMulti = true // All document types now support multiple uploads
              const matchingDocs = documents.filter((d) => d.type === docType.id)
              const existingDoc = matchingDocs[0] // For display purposes, show first doc
              const isUploading = uploading[docType.id]
              
              // Only show verification link feature for specific document types
              const hasVerificationLinkFeature = docType.id === 'sunbiz' || docType.id === 'workers_comp_certificate' || docType.id === 'business_registration' || docType.id === 'liability_insurance'
              const hasActiveVerificationLink = hasVerificationLinkFeature && existingDoc?.verificationLink && existingDoc?.verificationLinkStatus === 'active'

              return (
                <motion.div
                  key={docType.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`bg-white rounded-2xl shadow-lg border p-6 backdrop-blur-sm ${
                    hasActiveVerificationLink 
                      ? 'border-brand-green/50 bg-brand-green/5' 
                      : 'border-slate-200/60'
                  }`}
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
                          {hasActiveVerificationLink && (
                            <CheckCircle2 className="w-5 h-5 text-brand-green flex-shrink-0" />
                          )}
                          <h3 className="text-lg font-bold text-slate-900">{docType.name}</h3>
                          {docType.required && (
                            <span className="text-xs font-semibold text-danger-600 bg-danger-50 px-2 py-0.5 rounded-full">
                              Required
                            </span>
                          )}
                          {isMulti && (
                            <label
                              className={`ml-auto inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-colors cursor-pointer ${
                                isUploading ? 'opacity-60 cursor-not-allowed' : 'border-brand-green/30 text-brand-green hover:bg-brand-green/10'
                              }`}
                              title="Add another file"
                            >
                              <Plus className="w-4 h-4" />
                              <span className="text-xs font-semibold">Add</span>
                              <input
                                type="file"
                                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                                onChange={(e) => {
                                  const file = e.target.files?.[0]
                                  if (file) handleFileUpload(docType.id, file)
                                  e.target.value = ''
                                }}
                                className="hidden"
                                disabled={isUploading}
                              />
                            </label>
                          )}
                        </div>
                        <p className="text-sm text-slate-500 mb-2">{docType.description}</p>
                        {existingDoc && (
                          <div className="flex items-center gap-2 text-sm text-slate-600 mt-2">
                            <CheckCircle2 className="w-4 h-4 text-success-600" />
                            <span>
                              Uploaded on {
                                existingDoc.uploadedAt 
                                  ? (() => {
                                      try {
                                        const date = new Date(existingDoc.uploadedAt)
                                        return isNaN(date.getTime()) ? 'Unknown date' : date.toLocaleDateString()
                                      } catch {
                                        return 'Unknown date'
                                      }
                                    })()
                                  : 'Unknown date'
                              }
                            </span>
                          </div>
                        )}
                        {/* Verification Link is admin-only; hidden in installer portal */}
                      </div>
                    </div>
                  </div>

                  {matchingDocs.length > 0 ? (
                    <div className="space-y-3">
                      {matchingDocs.map((doc) => (
                          <div key={doc.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
                            <div className="flex items-start sm:items-center gap-3 flex-1 min-w-0">
                              <FileText className="w-5 h-5 text-brand-green flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-slate-900 whitespace-normal break-words sm:truncate sm:whitespace-nowrap">
                                  {doc.name || doc.fileName}
                                </p>
                                <div className="flex flex-wrap items-center gap-2 mt-1">
                                  {doc.fileSize && (
                                    <p className="text-xs text-slate-500">
                                      {(doc.fileSize / 1024 / 1024).toFixed(2)} MB
                                    </p>
                                  )}
                                {(doc.uploadedAt || doc.createdAt) && (
                                  <p className="text-xs text-slate-500">
                                    • {(() => {
                                      try {
                                        const dateStr = doc.uploadedAt || doc.createdAt
                                        if (!dateStr) return 'Unknown date'
                                        const date = new Date(dateStr)
                                        return isNaN(date.getTime()) ? 'Unknown date' : date.toLocaleDateString()
                                      } catch {
                                        return 'Unknown date'
                                      }
                                    })()}
                                  </p>
                                )}
                                  {/* Verification Link is admin-only; hidden in installer portal */}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <a
                                href={doc.url || doc.fileUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                download={doc.name || doc.fileName}
                                className="p-2 text-brand-green hover:bg-brand-green/10 rounded-lg transition-colors"
                                title="View / Download"
                              >
                                <Download className="w-5 h-5" />
                              </a>
                              <button
                                onClick={() => handleDeleteClick(doc.id, doc.name || doc.fileName, docType.id)}
                                className="p-2 text-danger-600 hover:bg-danger-50 rounded-lg transition-colors"
                                title="Delete"
                              >
                                <Trash2 className="w-5 h-5" />
                              </button>
                            </div>
                          </div>
                        ))}
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
                              e.target.value = ''
                              return
                            }
                            handleFileUpload(docType.id, file)
                          }
                          // Reset input to allow re-uploading the same file
                          e.target.value = ''
                        }}
                        className="hidden"
                        disabled={isUploading}
                        ref={(el) => {
                          if (el) {
                            fileInputRefs.current[docType.id] = el
                          }
                        }}
                      />
                    </label>
                  )}
                </motion.div>
              )
            })}
          </div>
        </main>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirm.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-red-50 to-orange-50 px-6 py-5 border-b border-red-100">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <Trash2 className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900">Delete Document</h3>
                  <p className="text-sm text-slate-600 mt-0.5">This action cannot be undone</p>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="px-6 py-6">
              <div className="mb-4">
                <p className="text-slate-700 mb-3">
                  Are you sure you want to delete <span className="font-semibold text-slate-900">{deleteConfirm.documentName}</span>?
                </p>
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-amber-800">
                    <p className="font-medium mb-1">Warning</p>
                    <p>This will permanently remove the document and all associated data. You'll need to upload it again if needed.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center gap-3">
              <button
                onClick={handleDeleteCancel}
                disabled={isDeleting}
                className="flex-1 px-4 py-2.5 border-2 border-slate-300 text-slate-700 rounded-xl font-medium hover:bg-white hover:border-slate-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
                className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-red-600/20"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}
