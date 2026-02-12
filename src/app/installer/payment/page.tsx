'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  User, 
  LayoutDashboard,
  Bell,
  Menu,
  X,
  LogOut,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Paperclip,
  Shield,
  CreditCard,
  Save,
  Building2,
  Phone,
  Mail,
  MapPin,
  Banknote,
  FileCheck,
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

interface PaymentInfo {
  companyName?: string
  contactPerson?: string
  phoneNumber?: string
  businessAddress?: string
  emailAddress?: string
  bankName?: string
  accountName?: string
  accountNumber?: string
  routingNumber?: string
  accountType?: string
  authorizationName?: string
  authorizationSignature?: string
  authorizationDate?: string
}

export default function PaymentPage() {
  const router = useRouter()
  const [installer, setInstaller] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [isEditing, setIsEditing] = useState(false)

  const [paymentInfo, setPaymentInfo] = useState<PaymentInfo>({
    companyName: '',
    contactPerson: '',
    phoneNumber: '',
    businessAddress: '',
    emailAddress: '',
    bankName: '',
    accountName: '',
    accountNumber: '',
    routingNumber: '',
    accountType: '',
    authorizationName: '',
    authorizationSignature: '',
    authorizationDate: '',
  })

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

      // Load payment information
      setPaymentInfo({
        companyName: profileData.installer.paymentCompanyName || '',
        contactPerson: profileData.installer.paymentContactPerson || '',
        phoneNumber: profileData.installer.paymentPhoneNumber || '',
        businessAddress: profileData.installer.paymentBusinessAddress || '',
        emailAddress: profileData.installer.paymentEmailAddress || profileData.installer.email || '',
        bankName: profileData.installer.paymentBankName || '',
        accountName: profileData.installer.paymentAccountName || '',
        accountNumber: profileData.installer.paymentAccountNumber || '',
        routingNumber: profileData.installer.paymentRoutingNumber || '',
        accountType: profileData.installer.paymentAccountType || '',
        authorizationName: profileData.installer.paymentAuthorizationName || '',
        authorizationSignature: profileData.installer.paymentAuthorizationSignature || '',
        authorizationDate: profileData.installer.paymentAuthorizationDate || '',
      })
    } catch (err: any) {
      console.error('Error loading data:', err)
      setError(err.message || 'Failed to load data')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async () => {
    if (!installer) return

    setIsSaving(true)
    setError('')
    setSuccess('')

    try {
      const response = await fetch(`/api/installers/${installer.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentCompanyName: paymentInfo.companyName?.trim() || undefined,
          paymentContactPerson: paymentInfo.contactPerson?.trim() || undefined,
          paymentPhoneNumber: paymentInfo.phoneNumber?.trim() || undefined,
          paymentBusinessAddress: paymentInfo.businessAddress?.trim() || undefined,
          paymentEmailAddress: paymentInfo.emailAddress?.trim() || undefined,
          paymentBankName: paymentInfo.bankName?.trim() || undefined,
          paymentAccountName: paymentInfo.accountName?.trim() || undefined,
          paymentAccountNumber: paymentInfo.accountNumber?.trim() || undefined,
          paymentRoutingNumber: paymentInfo.routingNumber?.trim() || undefined,
          paymentAccountType: paymentInfo.accountType?.trim() || undefined,
          paymentAuthorizationName: paymentInfo.authorizationName?.trim() || undefined,
          paymentAuthorizationSignature: paymentInfo.authorizationSignature?.trim() || undefined,
          paymentAuthorizationDate: paymentInfo.authorizationDate?.trim() || undefined,
        }),
      })

      const data = await response.json()

      if (data.installer) {
        setInstaller(data.installer)
        setSuccess('Payment information saved successfully!')
        setIsEditing(false)
        setTimeout(() => setSuccess(''), 3000)
      } else {
        setError(data.error || 'Failed to save payment information')
      }
    } catch (err: any) {
      console.error('Error saving payment information:', err)
      setError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setIsSaving(false)
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
          <p className="text-primary-600">Loading payment information...</p>
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
            href="/installer/attachments"
            className="flex items-center gap-3 px-4 py-3 text-white/90 hover:bg-white/10 rounded-xl transition-colors"
          >
            <Paperclip className="w-5 h-5 flex-shrink-0" />
            {sidebarOpen && <span>Attachments</span>}
          </Link>
          <Link
            href="/installer/payment"
            className="flex items-center gap-3 px-4 py-3 bg-white/20 text-white rounded-xl font-medium"
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
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-slate-900 mb-1">Account Information Form</h1>
                <p className="text-sm text-slate-500">Set up direct deposit payment to your bank account</p>
              </div>
              {!isEditing ? (
                <button
                  onClick={() => setIsEditing(true)}
                  className="flex items-center gap-2 px-5 py-2.5 text-brand-green hover:bg-brand-green/10 rounded-xl transition-all duration-200 font-medium hover:shadow-md"
                >
                  <Save className="w-4 h-4" />
                  Edit
                </button>
              ) : (
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setIsEditing(false)
                      checkAuthAndLoadData()
                    }}
                    className="px-5 py-2.5 text-slate-600 hover:bg-slate-100 rounded-xl transition-all duration-200 font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-brand-green to-brand-green-dark text-white rounded-xl hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                  >
                    {isSaving ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    Save Changes
                  </button>
                </div>
              )}
            </div>
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

          <div className="space-y-6">
            {/* Company Information */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl shadow-lg border border-slate-200/60 p-8 backdrop-blur-sm"
            >
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-200">
                <div className="w-12 h-12 bg-brand-green/10 rounded-xl flex items-center justify-center">
                  <Building2 className="w-6 h-6 text-brand-green" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">Company Information</h2>
                  <p className="text-sm text-slate-500">Your company details</p>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Company Name
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={paymentInfo.companyName}
                      onChange={(e) => setPaymentInfo({ ...paymentInfo, companyName: e.target.value })}
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-white text-slate-900"
                      placeholder="Enter company name"
                    />
                  ) : (
                    <p className="px-4 py-3 bg-slate-50 rounded-lg text-slate-900 border border-slate-200">
                      {paymentInfo.companyName || <span className="text-slate-400 italic">Not provided</span>}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Contact Person
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={paymentInfo.contactPerson}
                      onChange={(e) => setPaymentInfo({ ...paymentInfo, contactPerson: e.target.value })}
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-white text-slate-900"
                      placeholder="Enter contact person name"
                    />
                  ) : (
                    <p className="px-4 py-3 bg-slate-50 rounded-lg text-slate-900 border border-slate-200">
                      {paymentInfo.contactPerson || <span className="text-slate-400 italic">Not provided</span>}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Phone Number
                  </label>
                  {isEditing ? (
                    <input
                      type="tel"
                      value={paymentInfo.phoneNumber}
                      onChange={(e) => setPaymentInfo({ ...paymentInfo, phoneNumber: e.target.value })}
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-white text-slate-900"
                      placeholder="Enter phone number"
                    />
                  ) : (
                    <p className="px-4 py-3 bg-slate-50 rounded-lg text-slate-900 border border-slate-200">
                      {paymentInfo.phoneNumber || <span className="text-slate-400 italic">Not provided</span>}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Email Address
                  </label>
                  {isEditing ? (
                    <input
                      type="email"
                      value={paymentInfo.emailAddress}
                      onChange={(e) => setPaymentInfo({ ...paymentInfo, emailAddress: e.target.value })}
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-white text-slate-900"
                      placeholder="Enter email address"
                    />
                  ) : (
                    <p className="px-4 py-3 bg-slate-50 rounded-lg text-slate-900 border border-slate-200">
                      {paymentInfo.emailAddress || <span className="text-slate-400 italic">Not provided</span>}
                    </p>
                  )}
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Business Address
                  </label>
                  {isEditing ? (
                    <textarea
                      value={paymentInfo.businessAddress}
                      onChange={(e) => setPaymentInfo({ ...paymentInfo, businessAddress: e.target.value })}
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-white text-slate-900 resize-none"
                      placeholder="Enter business address"
                      rows={3}
                    />
                  ) : (
                    <p className="px-4 py-3 bg-slate-50 rounded-lg text-slate-900 border border-slate-200 min-h-[80px]">
                      {paymentInfo.businessAddress || <span className="text-slate-400 italic">Not provided</span>}
                    </p>
                  )}
                </div>
              </div>
            </motion.div>

            {/* Bank Account Information */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white rounded-2xl shadow-lg border border-slate-200/60 p-8 backdrop-blur-sm"
            >
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-200">
                <div className="w-12 h-12 bg-brand-green/10 rounded-xl flex items-center justify-center">
                  <Banknote className="w-6 h-6 text-brand-green" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">Bank Account Information</h2>
                  <p className="text-sm text-slate-500">Direct deposit details</p>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Bank Name
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={paymentInfo.bankName}
                      onChange={(e) => setPaymentInfo({ ...paymentInfo, bankName: e.target.value })}
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-white text-slate-900"
                      placeholder="Enter bank name"
                    />
                  ) : (
                    <p className="px-4 py-3 bg-slate-50 rounded-lg text-slate-900 border border-slate-200">
                      {paymentInfo.bankName || <span className="text-slate-400 italic">Not provided</span>}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Account Name
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={paymentInfo.accountName}
                      onChange={(e) => setPaymentInfo({ ...paymentInfo, accountName: e.target.value })}
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-white text-slate-900"
                      placeholder="Enter account name"
                    />
                  ) : (
                    <p className="px-4 py-3 bg-slate-50 rounded-lg text-slate-900 border border-slate-200">
                      {paymentInfo.accountName || <span className="text-slate-400 italic">Not provided</span>}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Account Number
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={paymentInfo.accountNumber}
                      onChange={(e) => setPaymentInfo({ ...paymentInfo, accountNumber: e.target.value })}
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-white text-slate-900"
                      placeholder="Enter account number"
                    />
                  ) : (
                    <p className="px-4 py-3 bg-slate-50 rounded-lg text-slate-900 border border-slate-200">
                      {paymentInfo.accountNumber ? '••••••••' : <span className="text-slate-400 italic">Not provided</span>}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Routing Number (ACH)
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={paymentInfo.routingNumber}
                      onChange={(e) => setPaymentInfo({ ...paymentInfo, routingNumber: e.target.value })}
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-white text-slate-900"
                      placeholder="Enter routing number"
                    />
                  ) : (
                    <p className="px-4 py-3 bg-slate-50 rounded-lg text-slate-900 border border-slate-200">
                      {paymentInfo.routingNumber ? '••••••••' : <span className="text-slate-400 italic">Not provided</span>}
                    </p>
                  )}
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Account Type
                  </label>
                  {isEditing ? (
                    <select
                      value={paymentInfo.accountType}
                      onChange={(e) => setPaymentInfo({ ...paymentInfo, accountType: e.target.value })}
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-white text-slate-900"
                    >
                      <option value="">Select account type</option>
                      <option value="Checking">Checking</option>
                      <option value="Savings">Savings</option>
                    </select>
                  ) : (
                    <p className="px-4 py-3 bg-slate-50 rounded-lg text-slate-900 border border-slate-200">
                      {paymentInfo.accountType || <span className="text-slate-400 italic">Not provided</span>}
                    </p>
                  )}
                </div>
              </div>
            </motion.div>

            {/* Authorization */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white rounded-2xl shadow-lg border border-slate-200/60 p-8 backdrop-blur-sm"
            >
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-200">
                <div className="w-12 h-12 bg-brand-green/10 rounded-xl flex items-center justify-center">
                  <FileCheck className="w-6 h-6 text-brand-green" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">Authorization</h2>
                  <p className="text-sm text-slate-500">Confirm and authorize payment setup</p>
                </div>
              </div>

              <div className="mb-6 p-4 bg-slate-50 rounded-xl border border-slate-200">
                <p className="text-sm text-slate-700 leading-relaxed">
                  I hereby confirm that the above account information is accurate, and I authorize its use for payment transactions.
                </p>
              </div>

              <div className="grid md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Name
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={paymentInfo.authorizationName}
                      onChange={(e) => setPaymentInfo({ ...paymentInfo, authorizationName: e.target.value })}
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-white text-slate-900"
                      placeholder="Enter your name"
                    />
                  ) : (
                    <p className="px-4 py-3 bg-slate-50 rounded-lg text-slate-900 border border-slate-200">
                      {paymentInfo.authorizationName || <span className="text-slate-400 italic">Not provided</span>}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Signature
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={paymentInfo.authorizationSignature}
                      onChange={(e) => setPaymentInfo({ ...paymentInfo, authorizationSignature: e.target.value })}
                      className={`w-full px-4 py-3 border border-slate-300 rounded-lg focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-white text-slate-900 ${dancingScript.className} text-2xl`}
                      placeholder="Enter your signature"
                    />
                  ) : (
                    <p className={`px-4 py-3 bg-slate-50 rounded-lg text-slate-900 border border-slate-200 ${dancingScript.className} text-2xl`}>
                      {paymentInfo.authorizationSignature || <span className="text-slate-400 italic">Not provided</span>}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Date
                  </label>
                  {isEditing ? (
                    <input
                      type="date"
                      value={paymentInfo.authorizationDate}
                      onChange={(e) => setPaymentInfo({ ...paymentInfo, authorizationDate: e.target.value })}
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-white text-slate-900"
                    />
                  ) : (
                    <p className="px-4 py-3 bg-slate-50 rounded-lg text-slate-900 border border-slate-200">
                      {paymentInfo.authorizationDate || <span className="text-slate-400 italic">Not provided</span>}
                    </p>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        </main>
      </div>
    </div>
  )
}
