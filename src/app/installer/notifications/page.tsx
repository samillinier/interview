'use client'

import { useState, useEffect, useRef, type ChangeEvent } from 'react'
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
  CreditCard,
  Mail,
  Newspaper,
  MessageSquare,
  Clock,
  Trash2,
  Check,
  RefreshCw,
  Send,
  Briefcase,
  ExternalLink
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import logo from '@/images/freepik_br_649d627d-2016-4108-ab09-0d2a0ad903d9.png'

interface Notification {
  id: string
  type: 'notification' | 'message' | 'news'
  title: string
  content: string
  isRead: boolean
  readAt: string | null
  createdAt: string
  link: string | null
  senderId?: string
  senderType?: 'admin' | 'installer'
  priority: 'low' | 'normal' | 'high' | 'urgent'
  attachmentUrl?: string | null
  attachmentName?: string | null
}

export default function NotificationsPage() {
  const router = useRouter()
  const [installer, setInstaller] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [activeTab, setActiveTab] = useState<'notification' | 'message' | 'news'>('notification')
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isMarkingRead, setIsMarkingRead] = useState<string | null>(null)
  const [messageContent, setMessageContent] = useState('')
  const [isSendingMessage, setIsSendingMessage] = useState(false)
  const [isUploadingFile, setIsUploadingFile] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [filePreview, setFilePreview] = useState<string | null>(null)
  const [notificationCount, setNotificationCount] = useState(0)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    checkAuthAndLoadData()
  }, [])

  useEffect(() => {
    if (installer) {
      loadNotifications()
    }
  }, [installer, activeTab])

  // Only when the installer opens the Messages tab, automatically mark all unread messages as read
  useEffect(() => {
    if (!installer?.id) return
    if (activeTab !== 'message') return

    const markMessagesAsRead = async () => {
      try {
        await fetch(`/api/installers/${installer.id}/notifications/mark-all-read`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'message' }),
        })
        await loadNotifications()
      } catch (e) {
        console.error('Error marking messages as read:', e)
      }
    }

    markMessagesAsRead()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [installer?.id, activeTab])

  useEffect(() => {
    if (activeTab === 'message') {
      scrollToBottom()
    }
  }, [notifications, activeTab])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

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
    } catch (err: any) {
      console.error('Error loading data:', err)
      setError(err.message || 'Failed to load data')
    } finally {
      setIsLoading(false)
    }
  }

  const loadNotifications = async () => {
    if (!installer) return

    try {
      // Update notification count
      const countResponse = await fetch(`/api/notifications/count?installerId=${installer.id}`)
      if (countResponse.ok) {
        const countData = await countResponse.json()
        setNotificationCount(countData.count || 0)
      }
      
      // Load all notifications (not filtered by type) so we can show unread counts
      const response = await fetch(`/api/installers/${installer.id}/notifications`)
      const contentType = response.headers.get('content-type')
      if (contentType && contentType.includes('application/json')) {
        const data = await response.json()
        setNotifications(data.notifications || [])
      } else {
        console.error('Non-JSON response from notifications API')
      }
    } catch (err: any) {
      console.error('Error loading notifications:', err)
      setError('Failed to load notifications. Please try again.')
    }
  }

  const handleMarkAsRead = async (notificationId: string) => {
    if (!installer) return

    setIsMarkingRead(notificationId)
    try {
      const response = await fetch(`/api/installers/${installer.id}/notifications/${notificationId}/read`, {
        method: 'POST',
      })

      if (response.ok) {
        setNotifications(notifications.map(n => 
          n.id === notificationId 
            ? { ...n, isRead: true, readAt: new Date().toISOString() }
            : n
        ))
      }
    } catch (err: any) {
      console.error('Error marking as read:', err)
    } finally {
      setIsMarkingRead(null)
    }
  }

  const handleDelete = async (notificationId: string) => {
    if (!installer || !confirm('Are you sure you want to delete this notification?')) return

    try {
      const response = await fetch(`/api/installers/${installer.id}/notifications/${notificationId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setNotifications(notifications.filter(n => n.id !== notificationId))
      }
    } catch (err: any) {
      console.error('Error deleting notification:', err)
    }
  }

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('File size must be less than 10MB. Please compress or use a smaller file.')
      setTimeout(() => setError(''), 5000)
      return
    }

    setSelectedFile(file)
    setError('')

    if (file.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onloadend = () => setFilePreview(reader.result as string)
      reader.readAsDataURL(file)
    } else {
      setFilePreview(null)
    }
  }

  const handleRemoveFile = () => {
    setSelectedFile(null)
    setFilePreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!installer || !installer.id) {
      setError('Installer information not loaded. Please refresh the page.')
      return
    }
    if (!messageContent.trim() && !selectedFile) return

    setIsSendingMessage(true)
    setError('')

    try {
      let attachmentUrl: string | null = null
      let attachmentName: string | null = null

      if (selectedFile) {
        setIsUploadingFile(true)
        const formData = new FormData()
        formData.append('file', selectedFile)
        formData.append('folder', 'messages')

        const uploadResponse = await fetch('/api/messages/upload', {
          method: 'POST',
          body: formData,
        })

        const uploadContentType = uploadResponse.headers.get('content-type') || ''
        const uploadData = uploadContentType.includes('application/json') ? await uploadResponse.json() : null

        if (!uploadResponse.ok) {
          throw new Error(uploadData?.error || 'Failed to upload file.')
        }

        attachmentUrl = uploadData?.url || null
        attachmentName = selectedFile.name
        setIsUploadingFile(false)
      }

      let response: Response
      try {
        response = await fetch(`/api/installers/${installer.id}/messages`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            content: messageContent.trim(),
            attachmentUrl,
            attachmentName,
          }),
        })
      } catch (fetchError: any) {
        console.error('Fetch error (network issue):', fetchError)
        throw new Error(`Network error: ${fetchError.message || 'Failed to connect to server. Please check your internet connection.'}`)
      }

      console.log('Response status:', response.status)
      console.log('Response ok:', response.ok)

      // Check if response is ok first
      if (!response.ok) {
        const contentType = response.headers.get('content-type')
        let errorData
        if (contentType && contentType.includes('application/json')) {
          errorData = await response.json()
        } else {
          const text = await response.text()
          console.error('Non-JSON error response:', text.substring(0, 500))
          errorData = { error: text.substring(0, 500) || 'Server returned an error' }
        }
        const errorMessage = errorData.error || errorData.details || errorData.message || `Failed to send message (${response.status})`
        console.error('Message send error details:', {
          status: response.status,
          statusText: response.statusText,
          errorData,
          fullError: JSON.stringify(errorData, null, 2),
        })
        throw new Error(`${errorMessage}${errorData.code ? ` (Code: ${errorData.code})` : ''}`)
      }

      const contentType = response.headers.get('content-type')
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text()
        console.error('Non-JSON success response:', text.substring(0, 500))
        throw new Error('Server returned an unexpected response. Please try again.')
      }

      const data = await response.json()
      console.log('Message sent successfully:', data)

      // Clear input and refresh messages
      setMessageContent('')
      handleRemoveFile()
      await loadNotifications()
      
      // Scroll to bottom to show new message
      setTimeout(() => {
        scrollToBottom()
      }, 100)
    } catch (err: any) {
      console.error('=== CATCH BLOCK ERROR ===')
      console.error('Error sending message:', err)
      console.error('Error details:', {
        message: err.message,
        response: err.response,
        stack: err.stack,
        name: err.name,
        cause: err.cause,
      })
      const errorMessage = err.message || 'Failed to send message. Please try again.'
      console.error('Setting error message:', errorMessage)
      setError(errorMessage)
      // Clear error after 10 seconds (longer so user can read it)
      setTimeout(() => setError(''), 10000)
    } finally {
      setIsSendingMessage(false)
      setIsUploadingFile(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('installerToken')
    localStorage.removeItem('installerId')
    router.push('/installer/login')
  }

  const filteredNotifications = notifications.filter((n) => {
    if (activeTab === 'notification') return n.type === 'notification'
    if (activeTab === 'message') return n.type === 'message'
    if (activeTab === 'news') return n.type === 'news'
    return false
  })

  const unreadCount = {
    notification: notifications.filter(n => n.type === 'notification' && !n.isRead).length,
    message: notifications.filter(n => n.type === 'message' && !n.isRead).length,
    news: notifications.filter(n => n.type === 'news' && !n.isRead).length,
  }

  if (isLoading) {
    return (
      <div className="min-h-screen interview-gradient flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-brand-green animate-spin mx-auto mb-4" />
          <p className="text-primary-600">Loading notifications...</p>
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
            className="flex items-center gap-3 px-4 py-3 bg-white/20 text-white rounded-xl font-medium"
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

      {/* Mobile Sidebar Toggle */}
      <div className="lg:hidden fixed top-4 left-4 z-40">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 bg-white rounded-lg shadow-lg border border-slate-200"
        >
          {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/50 z-30"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <aside className={`lg:hidden fixed left-0 top-0 h-full bg-brand-green border-r border-brand-green-dark transition-transform duration-300 z-40 flex flex-col ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} w-64 shadow-lg`}>
        <div className="p-6 border-b border-slate-200 bg-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10">
              <Image
                src={logo}
                alt="Logo"
                width={40}
                height={40}
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <h1 className="font-bold text-primary-900 text-sm">Installer Portal</h1>
              <p className="text-xs text-primary-500">Dashboard</p>
            </div>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-primary-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          <Link href="/installer/dashboard" className="flex items-center gap-3 px-4 py-3 text-white/90 hover:bg-white/10 rounded-xl transition-colors">
            <LayoutDashboard className="w-5 h-5" />
            <span>Dashboard</span>
          </Link>
          <Link href="/installer/profile" className="flex items-center gap-3 px-4 py-3 text-white/90 hover:bg-white/10 rounded-xl transition-colors">
            <User className="w-5 h-5" />
            <span>Profile</span>
          </Link>
          <Link href="/installer/attachments" className="flex items-center gap-3 px-4 py-3 text-white/90 hover:bg-white/10 rounded-xl transition-colors">
            <Paperclip className="w-5 h-5" />
            <span>Attachments</span>
          </Link>
          <Link href="/installer/payment" className="flex items-center gap-3 px-4 py-3 text-white/90 hover:bg-white/10 rounded-xl transition-colors">
            <CreditCard className="w-5 h-5" />
            <span>Account</span>
          </Link>
          <Link href="/installer/referrals" className="flex items-center gap-3 px-4 py-3 text-white/90 hover:bg-white/10 rounded-xl transition-colors">
            <ExternalLink className="w-5 h-5" />
            <span>Referrals</span>
          </Link>
          <Link href="/installer/notifications" className="flex items-center gap-3 px-4 py-3 bg-white/20 text-white rounded-xl font-medium">
            <Bell className="w-5 h-5" />
            <span>Notifications</span>
          </Link>
        </nav>
        <div className="p-4 border-t border-slate-200 bg-white">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-brand-green/10 rounded-full flex items-center justify-center">
              <User className="w-5 h-5 text-brand-green" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-primary-900 text-sm truncate">
                {installer.firstName || installer.lastName 
                  ? `${installer.firstName || ''} ${installer.lastName || ''}`.trim()
                  : installer.email.split('@')[0]
                }
              </p>
              <p className="text-xs text-primary-500 truncate">{installer.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 text-primary-600 hover:bg-slate-100 rounded-xl transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className={`flex-1 transition-all duration-300 ${sidebarOpen ? 'lg:ml-64' : 'lg:ml-20'} w-full`}>
        {/* Header */}
        <header className="bg-white/80 backdrop-blur-md border-b border-slate-200/50 sticky top-0 z-20 shadow-sm">
          <div className="px-4 lg:px-6 py-6 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 mb-1">Notifications</h1>
              <p className="text-sm text-slate-500">Stay updated with notifications, messages, and news</p>
            </div>
            <button
              onClick={() => loadNotifications()}
              className="flex items-center gap-2 px-4 py-2 bg-brand-green text-white rounded-xl font-medium hover:bg-brand-green-dark transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Refresh</span>
            </button>
          </div>
        </header>

        {/* Content Area */}
        <main className="p-6 lg:p-8">
          {/* Tabs */}
          <div className="bg-white rounded-2xl shadow-lg border border-slate-200/60 p-2 mb-6 backdrop-blur-sm">
            <div className="flex gap-2">
              <button
                onClick={() => setActiveTab('notification')}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium transition-all ${
                  activeTab === 'notification'
                    ? 'bg-brand-green text-white shadow-md'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Bell className="w-5 h-5" />
                <span>Notifications</span>
                {unreadCount.notification > 0 && (
                  <span className="bg-white text-brand-green text-xs font-bold px-2 py-0.5 rounded-full">
                    {unreadCount.notification}
                  </span>
                )}
              </button>
              <button
                onClick={() => setActiveTab('message')}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium transition-all ${
                  activeTab === 'message'
                    ? 'bg-brand-green text-white shadow-md'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <MessageSquare className="w-5 h-5" />
                <span>Messages</span>
                {unreadCount.message > 0 && (
                  <span className="bg-white text-brand-green text-xs font-bold px-2 py-0.5 rounded-full">
                    {unreadCount.message}
                  </span>
                )}
              </button>
              <button
                onClick={() => setActiveTab('news')}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium transition-all ${
                  activeTab === 'news'
                    ? 'bg-brand-green text-white shadow-md'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Newspaper className="w-5 h-5" />
                <span>News</span>
                {unreadCount.news > 0 && (
                  <span className="bg-white text-brand-green text-xs font-bold px-2 py-0.5 rounded-full">
                    {unreadCount.news}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Notifications List */}
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

          {activeTab === 'message' ? (
            // Chat UI for Messages
            <div className="bg-white rounded-2xl shadow-lg border border-slate-200/60 flex flex-col" style={{ height: 'calc(100vh - 300px)', minHeight: '500px' }}>
              {/* Messages Area */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
                {filteredNotifications.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <MessageSquare className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                      <p className="text-slate-500">No messages yet. Start the conversation!</p>
                    </div>
                  </div>
                ) : (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="space-y-4"
                  >
                    {filteredNotifications.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()).map((message) => {
                      const isFromAdmin = !message.senderId || message.senderId === 'admin' || message.senderType === 'admin'
                      const attachmentUrl = message.attachmentUrl || null
                      const attachmentName = message.attachmentName || null
                      const isImageAttachment = Boolean(
                        attachmentUrl &&
                          (/\.(png|jpe?g|gif|webp|svg)$/i.test(attachmentName || '') ||
                            /\.(png|jpe?g|gif|webp|svg)(\?|#|$)/i.test(attachmentUrl))
                      )
                      return (
                        <motion.div
                          key={message.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className={`flex ${isFromAdmin ? 'justify-start' : 'justify-end'}`}
                        >
                          <div className={`max-w-[70%] ${!isFromAdmin ? '' : 'flex items-start gap-3'}`}>
                            {isFromAdmin && (
                              <div className="relative w-10 h-10 rounded-full overflow-hidden flex-shrink-0 ring-2 ring-brand-green/20 bg-brand-green">
                                <User className="w-6 h-6 text-white m-auto mt-2" />
                              </div>
                            )}
                            <div>
                              <div className={`rounded-3xl px-6 py-5 shadow-lg ${
                                isFromAdmin
                                  ? 'bg-gradient-to-br from-slate-100 to-slate-50 text-slate-900 border-2 border-slate-200 rounded-tl-sm hover:border-slate-300 transition-colors'
                                  : 'bg-gradient-to-br from-brand-green to-brand-green-dark text-white rounded-tr-sm'
                              }`}>
                                <p className={`text-lg leading-relaxed whitespace-pre-wrap font-medium ${
                                  isFromAdmin ? 'text-slate-900' : 'text-white'
                                }`}>{message.content}</p>

                                {attachmentUrl && (
                                  <div className={`mt-4 rounded-2xl p-4 border ${
                                    isFromAdmin
                                      ? 'bg-white/70 border-slate-200'
                                      : 'bg-white/15 border-white/25'
                                  }`}>
                                    <div className="flex items-center gap-2">
                                      <Paperclip className={`w-4 h-4 ${isFromAdmin ? 'text-slate-700' : 'text-white/90'}`} />
                                      <span className={`text-sm font-semibold truncate ${isFromAdmin ? 'text-slate-800' : 'text-white'}`}>
                                        {attachmentName || 'Attachment'}
                                      </span>
                                    </div>

                                    {isImageAttachment && (
                                      <a
                                        href={attachmentUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        className={`mt-3 inline-block rounded-xl overflow-hidden border hover:opacity-95 transition-opacity ${
                                          isFromAdmin ? 'border-slate-200' : 'border-white/20'
                                        }`}
                                        title="Open image"
                                      >
                                        {/* Use <img> instead of next/image so external attachment hosts don't crash the page */}
                                        <img
                                          src={attachmentUrl}
                                          alt={attachmentName || 'Attachment'}
                                          className="w-44 max-w-[176px] h-32 max-h-[128px] object-cover"
                                          loading="lazy"
                                          referrerPolicy="no-referrer"
                                        />
                                      </a>
                                    )}

                                    <div className="mt-3 flex items-center gap-2">
                                      <a
                                        href={attachmentUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        className={`inline-flex items-center justify-center px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                                          isFromAdmin
                                            ? 'bg-slate-900 text-white hover:bg-slate-800'
                                            : 'bg-white text-brand-green hover:bg-white/90'
                                        }`}
                                      >
                                        View
                                      </a>
                                      <a
                                        href={attachmentUrl}
                                        download={attachmentName || undefined}
                                        className={`inline-flex items-center justify-center px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                                          isFromAdmin
                                            ? 'bg-white text-slate-900 border border-slate-200 hover:bg-slate-50'
                                            : 'bg-white/15 text-white border border-white/25 hover:bg-white/20'
                                        }`}
                                      >
                                        Download
                                      </a>
                                    </div>
                                  </div>
                                )}
                              </div>
                              <div className={`flex items-center gap-2 mt-2 px-3 ${isFromAdmin ? 'justify-start' : 'justify-end'}`}>
                                <span className="text-sm text-slate-500 font-medium">
                                  {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )
                    })}
                  </motion.div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              <div className="border-t border-slate-200 p-4 bg-slate-50 rounded-b-2xl">
                {error && (
                  <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                    <p className="text-sm text-red-800">{error}</p>
                  </div>
                )}
                <form onSubmit={handleSendMessage} className="flex items-end gap-3">
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    onChange={handleFileSelect}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center justify-center w-12 h-12 bg-white border border-slate-300 text-slate-700 rounded-xl hover:bg-slate-50 transition-colors flex-shrink-0"
                    title="Attach a file"
                    disabled={isSendingMessage || isUploadingFile}
                  >
                    <Paperclip className="w-5 h-5" />
                  </button>
                  <div className="flex-1">
                    {selectedFile && (
                      <div className="mb-3 p-3 bg-white border border-slate-200 rounded-xl">
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-slate-900 truncate">{selectedFile.name}</p>
                            <p className="text-xs text-slate-500">
                              {(selectedFile.size / 1024).toFixed(1)} KB
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={handleRemoveFile}
                            className="text-xs font-bold text-red-600 hover:text-red-700"
                          >
                            Remove
                          </button>
                        </div>
                        {filePreview && (
                          <div className="mt-3 rounded-lg overflow-hidden border border-slate-200">
                            <img
                              src={filePreview}
                              alt="Preview"
                              className="w-full h-auto object-cover"
                              loading="lazy"
                            />
                          </div>
                        )}
                      </div>
                    )}
                    <textarea
                      value={messageContent}
                      onChange={(e) => setMessageContent(e.target.value)}
                      placeholder="Type a message..."
                      rows={1}
                      className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-green focus:border-brand-green resize-none"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault()
                          handleSendMessage(e)
                        }
                      }}
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isSendingMessage || isUploadingFile || (!messageContent.trim() && !selectedFile)}
                    className="flex items-center justify-center w-12 h-12 bg-brand-green text-white rounded-xl hover:bg-brand-green-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                  >
                    {isSendingMessage || isUploadingFile ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Send className="w-5 h-5" />
                    )}
                  </button>
                </form>
              </div>
            </div>
          ) : filteredNotifications.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl shadow-lg border border-slate-200/60 p-12 text-center"
            >
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                {activeTab === 'notification' && <Bell className="w-8 h-8 text-slate-400" />}
                {activeTab === 'news' && <Newspaper className="w-8 h-8 text-slate-400" />}
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">No {activeTab === 'notification' ? 'Notifications' : 'News'}</h3>
              <p className="text-slate-500">You don't have any {activeTab === 'notification' ? 'notifications' : 'news'} yet.</p>
            </motion.div>
          ) : (
            <div className="space-y-4">
              {filteredNotifications.map((notification) => (
                <motion.div
                  key={notification.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`bg-white rounded-2xl shadow-lg border border-slate-200/60 p-6 backdrop-blur-sm ${
                    !notification.isRead ? 'border-l-4 border-l-brand-green' : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-bold text-slate-900">{notification.title}</h3>
                        {!notification.isRead && (
                          <span className="w-2 h-2 bg-brand-green rounded-full"></span>
                        )}
                        {notification.priority === 'urgent' && (
                          <span className="text-xs font-semibold text-danger-600 bg-danger-50 px-2 py-0.5 rounded-full">
                            Urgent
                          </span>
                        )}
                        {notification.priority === 'high' && (
                          <span className="text-xs font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                            High Priority
                          </span>
                        )}
                      </div>
                      <p className="text-slate-700 mb-3 leading-relaxed">{notification.content}</p>
                      <div className="flex items-center gap-4 text-xs text-slate-500">
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          <span>{new Date(notification.createdAt).toLocaleDateString('en-US', { 
                            year: 'numeric', 
                            month: 'short', 
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}</span>
                        </div>
                        {notification.link && (
                          <a 
                            href={notification.link}
                            className="text-brand-green hover:underline font-medium"
                          >
                            View Details →
                          </a>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {!notification.isRead && (
                        <button
                          onClick={() => handleMarkAsRead(notification.id)}
                          disabled={isMarkingRead === notification.id}
                          className="p-2 text-brand-green hover:bg-brand-green/10 rounded-lg transition-colors"
                          title="Mark as read"
                        >
                          {isMarkingRead === notification.id ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                          ) : (
                            <Check className="w-5 h-5" />
                          )}
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(notification.id)}
                        className="p-2 text-slate-400 hover:text-danger-600 hover:bg-danger-50 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
