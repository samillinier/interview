'use client'

import { useState, useEffect, useRef, type ChangeEvent } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  MessageSquare, 
  Send, 
  Users, 
  LayoutDashboard,
  Settings,
  ShieldAlert,
  Menu,
  X,
  LogOut,
  User,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Search,
  Bell,
  Clock,
  Mail,
  Paperclip,
  Image as ImageIcon,
  BarChart3,
  StickyNote,
  FileCheck,
  Building2,
  Activity,
  ClipboardList,
  ClipboardCheck,
  FileText,
  Megaphone
} from 'lucide-react'
import { signOut } from 'next-auth/react'
import Image from 'next/image'
import Link from 'next/link'
import logo from '@/images/freepik_br_649d627d-2016-4108-ab09-0d2a0ad903d9.png'
import { AdminMobileMenu } from '@/components/AdminMobileMenu'
import { AdminSidebar } from '@/components/AdminSidebar'
import { useSidebarOpen } from '@/hooks/useSidebarOpen'
import { LogoHeartbeatLoader } from '@/components/LogoHeartbeatLoader'

interface Installer {
  id: string
  firstName: string
  lastName: string
  email: string
  status: string
  photoUrl?: string
}

interface Message {
  id: string
  installerId: string
  type: string
  title: string
  content: string
  priority: string
  link?: string
  isRead: boolean
  createdAt: string
  senderId?: string
  senderType?: string
  attachmentUrl?: string
  attachmentName?: string
  installer: {
    id: string
    firstName: string
    lastName: string
    email: string
    photoUrl?: string
  }
}

interface Conversation {
  installer: Installer
  lastMessage?: Message
  unreadCount: number
}

export default function MessagesPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const pathname = usePathname()
  const normalizedRole = String((session?.user as any)?.role || '').toUpperCase()
  const { sidebarOpen } = useSidebarOpen()
  const [installers, setInstallers] = useState<Installer[]>([])
  const [selectedInstaller, setSelectedInstaller] = useState<Installer | null>(null)
  const [notificationCount, setNotificationCount] = useState(0)
  const [pendingApprovalsCount, setPendingApprovalsCount] = useState(0)
  const [signatureNotSignedCount, setSignatureNotSignedCount] = useState(0)
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0)
  const [updatesCount, setUpdatesCount] = useState(0)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [isSending, setIsSending] = useState(false)
  const [isUploadingFile, setIsUploadingFile] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [filePreview, setFilePreview] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [messageContent, setMessageContent] = useState('')
  const [showComposer, setShowComposer] = useState(false)
  const [composerMode, setComposerMode] = useState<'installer' | 'email'>('installer')
  const [composerSearchQuery, setComposerSearchQuery] = useState('')
  const [composerInstaller, setComposerInstaller] = useState<Installer | null>(null)
  const [composerEmail, setComposerEmail] = useState('')
  const [composerSubject, setComposerSubject] = useState('Message from Floor Interior Services')
  const [composerContent, setComposerContent] = useState('')
  const [isComposerSending, setIsComposerSending] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const chatContainerRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    } else if (status === 'authenticated') {
      fetchInstallers()
      fetchNotificationCount()
      fetchPendingApprovalsCount()
      fetchSignatureNotSignedCount()
      fetchUpdatesCount()
      // Refresh count every 30 seconds
      const interval = setInterval(() => {
        fetchNotificationCount()
        fetchPendingApprovalsCount()
        fetchSignatureNotSignedCount()
        fetchUpdatesCount()
      }, 30000)
      return () => clearInterval(interval)
    }
  }, [status, router])

  const fetchNotificationCount = async () => {
    try {
      const response = await fetch('/api/notifications/count')
      if (response.ok) {
        const data = await response.json()
        setNotificationCount(data.count || 0)
      }
    } catch (error) {
      console.error('Error fetching notification count:', error)
    }
  }

  const fetchPendingApprovalsCount = async () => {
    try {
      const res = await fetch('/api/admin/change-requests/count')
      if (res.status === 401) {
        setPendingApprovalsCount(0)
        return
      }
      if (res.ok) {
        const data = await res.json()
        setPendingApprovalsCount(data.count || 0)
      }
    } catch {
      // ignore
    }
  }

  const fetchSignatureNotSignedCount = async () => {
    try {
      const res = await fetch('/api/admin/signatures/independent-contractor-services/count', { cache: 'no-store' })
      if (res.status === 401) {
        setSignatureNotSignedCount(0)
        return
      }
      if (res.ok) {
        const data = await res.json()
        setSignatureNotSignedCount(data?.count || 0)
      }
    } catch {
      // ignore
    }
  }

  const fetchUpdatesCount = async () => {
    try {
      const res = await fetch('/api/admin/updates/count', { cache: 'no-store' })
      if (!res.ok) return
      const data = await res.json().catch(() => ({}))
      setUpdatesCount(Number(data?.count || 0))
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    if (status === 'authenticated') {
      fetchAllMessages()
    }
  }, [status])

  useEffect(() => {
    if (selectedInstaller) {
      fetchMessagesForInstaller(selectedInstaller.id)
      // Mark messages as read when admin views them
      markMessagesAsRead(selectedInstaller.id)
    }
  }, [selectedInstaller])

  const markMessagesAsRead = async (installerId: string) => {
    try {
      const response = await fetch(`/api/installers/${installerId}/notifications/mark-all-read`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'message' }),
      })
      if (response.ok) {
        // Refresh messages and update badge count
        await fetchMessagesForInstaller(installerId)
        await fetchAllMessages()
      }
    } catch (error) {
      console.error('Error marking messages as read:', error)
    }
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const fetchInstallers = async () => {
    try {
      // Fetch all installers by requesting a large limit
      const response = await fetch('/api/installers?limit=1000')
      const data = await response.json()
      const installersList = data.installers || []
      setInstallers(installersList)
      return installersList
    } catch (error) {
      console.error('Error fetching installers:', error)
      return []
    }
  }

  const fetchAllMessages = async () => {
    try {
      // Always fetch fresh installers to ensure we have the latest data
      const installersList = await fetchInstallers()
      
      // Create a Set of accessible installer IDs for quick lookup
      // This ensures moderators only see messages from installers they have access to
      const accessibleInstallerIds = new Set(installersList.map((i: any) => i.id))
      
      const response = await fetch('/api/notifications?type=message')
      const data = await response.json()
      const allMessages: Message[] = data.notifications || []
      
      // Filter messages to only include those from accessible installers
      // This is important for moderators who can only see certain installer statuses
      const filteredMessages = allMessages.filter((message) => 
        accessibleInstallerIds.has(message.installerId)
      )
      
      // Group messages by installer and create conversations
      const conversationMap = new Map<string, Conversation>()
      
      filteredMessages.forEach((message) => {
        const installerId = message.installerId
        // Only count unread messages FROM installers (not from admin)
        const isFromInstaller = !message.senderId || message.senderId !== 'admin' && message.senderType !== 'admin'
        const isUnreadFromInstaller = !message.isRead && isFromInstaller
        
        if (!conversationMap.has(installerId)) {
          const installer = installersList.find((i: any) => i.id === installerId) || {
            id: message.installer.id,
            firstName: message.installer.firstName,
            lastName: message.installer.lastName,
            email: message.installer.email,
            status: 'pending',
            photoUrl: message.installer.photoUrl
          }
          conversationMap.set(installerId, {
            installer,
            lastMessage: message,
            unreadCount: isUnreadFromInstaller ? 1 : 0
          })
        } else {
          const conv = conversationMap.get(installerId)!
          if (!conv.lastMessage || new Date(message.createdAt) > new Date(conv.lastMessage.createdAt)) {
            conv.lastMessage = message
          }
          if (isUnreadFromInstaller) {
            conv.unreadCount++
          }
        }
      })
      
      // Add installers who don't have messages yet
      installersList.forEach((installer: any) => {
        if (!conversationMap.has(installer.id)) {
          conversationMap.set(installer.id, {
            installer,
            unreadCount: 0
          })
        }
      })
      
      const sortedConversations = Array.from(conversationMap.values()).sort((a, b) => {
        if (!a.lastMessage && !b.lastMessage) return 0
        if (!a.lastMessage) return 1
        if (!b.lastMessage) return -1
        return new Date(b.lastMessage!.createdAt).getTime() - new Date(a.lastMessage!.createdAt).getTime()
      })
      
      setConversations(sortedConversations)
      
      // Calculate total unread message count - only count messages FROM installers (not from admin)
      const totalUnread = sortedConversations.reduce((sum, conv) => sum + conv.unreadCount, 0)
      setUnreadMessagesCount(totalUnread)
    } catch (error) {
      console.error('Error fetching messages:', error)
    }
  }

  const fetchMessagesForInstaller = async (installerId: string) => {
    try {
      // Verify that the installer is accessible (important for moderators)
      const installerExists = installers.find((i) => i.id === installerId)
      if (!installerExists) {
        console.error('Installer not accessible:', installerId)
        setMessages([])
        return
      }
      
      const response = await fetch(`/api/installers/${installerId}/notifications?type=message`)
      const data = await response.json()
      // Sort messages by creation time (oldest first for chat view)
      const sortedMessages = (data.notifications || []).sort((a: Message, b: Message) => 
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      )
      setMessages(sortedMessages)
    } catch (error) {
      console.error('Error fetching messages for installer:', error)
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

    // Create preview for images
    if (file.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setFilePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    } else {
      setFilePreview(null)
    }
  }

  const handleRemoveFile = () => {
    setSelectedFile(null)
    setFilePreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedInstaller || (!messageContent.trim() && !selectedFile)) return

    setError('')
    setIsSending(true)
    let attachmentUrl: string | null = null
    let attachmentName: string | null = null

    try {
      // Upload file if one is selected
      if (selectedFile) {
        setIsUploadingFile(true)
        const formData = new FormData()
        formData.append('file', selectedFile)
        formData.append('folder', 'messages')

        const uploadResponse = await fetch('/api/messages/upload', {
          method: 'POST',
          body: formData,
        })

        if (!uploadResponse.ok) {
          const errorData = await uploadResponse.json()
          throw new Error(errorData.error || 'Failed to upload file.')
        }

        const uploadData = await uploadResponse.json()
        attachmentUrl = uploadData.url
        attachmentName = selectedFile.name
        setIsUploadingFile(false)
      }

      // Send message with attachment
      const response = await fetch('/api/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          installerIds: [selectedInstaller.id],
          type: 'message',
          title: 'Message',
          content: messageContent.trim() || (selectedFile ? `Sent ${selectedFile.name}` : ''),
          priority: 'normal',
          senderId: 'admin',
          senderType: 'admin',
          attachmentUrl,
          attachmentName,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send message.')
      }

      setMessageContent('')
      setSelectedFile(null)
      setFilePreview(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      setSuccess('Message sent!')
      setTimeout(() => setSuccess(''), 3000)
      
      // Refresh messages
      await fetchMessagesForInstaller(selectedInstaller.id)
      await fetchAllMessages()
    } catch (err: any) {
      console.error('Error sending message:', err)
      setError(err.message || 'Failed to send message.')
      setTimeout(() => setError(''), 5000)
      setIsUploadingFile(false)
    } finally {
      setIsSending(false)
    }
  }

  const resetComposer = () => {
    setShowComposer(false)
    setComposerMode('installer')
    setComposerSearchQuery('')
    setComposerInstaller(null)
    setComposerEmail('')
    setComposerSubject('Message from Floor Interior Services')
    setComposerContent('')
  }

  const handleSendComposerMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!composerContent.trim()) {
      setError('Please write a message.')
      setTimeout(() => setError(''), 5000)
      return
    }

    if (composerMode === 'installer' && !composerInstaller) {
      setError('Please choose an installer.')
      setTimeout(() => setError(''), 5000)
      return
    }

    if (composerMode === 'email' && (!composerEmail.trim() || !composerSubject.trim())) {
      setError('Please add an email address and subject.')
      setTimeout(() => setError(''), 5000)
      return
    }

    setError('')
    setSuccess('')
    setIsComposerSending(true)

    try {
      const response = await fetch(composerMode === 'installer' ? '/api/notifications' : '/api/admin/messages/email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(
          composerMode === 'installer'
            ? {
                installerIds: [composerInstaller!.id],
                type: 'message',
                title: 'Message',
                content: composerContent.trim(),
                priority: 'normal',
                senderId: 'admin',
                senderType: 'admin',
              }
            : {
                email: composerEmail.trim(),
                subject: composerSubject.trim(),
                content: composerContent.trim(),
              }
        ),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send message.')
      }

      const sentInstaller = composerInstaller
      resetComposer()
      if (composerMode === 'installer' && sentInstaller) {
        setSelectedInstaller(sentInstaller)
        await fetchMessagesForInstaller(sentInstaller.id)
        await fetchAllMessages()
      }
      setSuccess(composerMode === 'installer' ? 'Message and email sent!' : 'Email sent!')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err: any) {
      console.error('Error sending composer message:', err)
      setError(err.message || 'Failed to send message.')
      setTimeout(() => setError(''), 5000)
    } finally {
      setIsComposerSending(false)
    }
  }

  const handleLogout = () => {
    signOut({ callbackUrl: '/login' })
  }

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase()
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return 'Just now'
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    if (days < 7) return `${days}d ago`
    return date.toLocaleDateString()
  }

  const filteredConversations = conversations.filter(conv => {
    const name = `${conv.installer.firstName} ${conv.installer.lastName}`.toLowerCase()
    const email = conv.installer.email.toLowerCase()
    const query = searchQuery.toLowerCase()
    return name.includes(query) || email.includes(query)
  })

  const filteredComposerInstallers = installers
    .filter((installer) => {
      const query = composerSearchQuery.trim().toLowerCase()
      if (!query) return true
      const name = `${installer.firstName} ${installer.lastName}`.toLowerCase()
      const email = (installer.email || '').toLowerCase()
      return name.includes(query) || email.includes(query)
    })
    .slice(0, 25)

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <LogoHeartbeatLoader />
      </div>
    )
  }

  if (status === 'unauthenticated') {
    return null
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Desktop Sidebar */}
      <AdminSidebar pathname={pathname} />

      <AdminMobileMenu pathname={pathname} />

      <AnimatePresence>
        {showComposer && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4 py-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.form
              onSubmit={handleSendComposerMessage}
              className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden"
              initial={{ opacity: 0, y: 24, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 24, scale: 0.98 }}
            >
              <div className="flex items-center justify-between px-6 py-5 border-b border-slate-200">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Compose Message</h2>
                  <p className="text-sm text-slate-500">
                    Send to an installer or directly to an outside email address.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={resetComposer}
                  className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
                  aria-label="Close composer"
                >
                  <X className="w-5 h-5 text-slate-600" />
                </button>
              </div>

              <div className="p-6 space-y-5">
                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-red-600" />
                    <p className="text-sm text-red-800">{error}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2 rounded-2xl bg-slate-100 p-1">
                  <button
                    type="button"
                    onClick={() => setComposerMode('installer')}
                    className={`flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition-colors ${
                      composerMode === 'installer'
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Users className="w-4 h-4" />
                    Installer
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setComposerMode('email')
                      setComposerInstaller(null)
                    }}
                    className={`flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition-colors ${
                      composerMode === 'email'
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Mail className="w-4 h-4" />
                    Email Address
                  </button>
                </div>

                {composerMode === 'installer' ? (
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      To
                    </label>
                    {composerInstaller ? (
                      <div className="flex items-center justify-between gap-3 p-3 rounded-2xl border border-brand-green/30 bg-brand-green/5">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-full bg-brand-green text-white flex items-center justify-center font-semibold flex-shrink-0">
                            {getInitials(composerInstaller.firstName, composerInstaller.lastName)}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-slate-900 truncate">
                              {composerInstaller.firstName} {composerInstaller.lastName}
                            </p>
                            <p className="text-sm text-slate-500 truncate">{composerInstaller.email}</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setComposerInstaller(null)}
                          className="text-sm font-semibold text-slate-600 hover:text-slate-900"
                        >
                          Change
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                          <input
                            type="text"
                            value={composerSearchQuery}
                            onChange={(e) => setComposerSearchQuery(e.target.value)}
                            placeholder="Search installer by name or email..."
                            className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-green focus:border-brand-green"
                            autoFocus
                          />
                        </div>
                        <div className="max-h-56 overflow-y-auto rounded-2xl border border-slate-200 divide-y divide-slate-100">
                          {filteredComposerInstallers.length === 0 ? (
                            <p className="p-4 text-sm text-slate-500 text-center">No installers found</p>
                          ) : (
                            filteredComposerInstallers.map((installer) => (
                              <button
                                key={installer.id}
                                type="button"
                                onClick={() => setComposerInstaller(installer)}
                                className="w-full p-3 flex items-center gap-3 text-left hover:bg-slate-50 transition-colors"
                              >
                                <div className="w-10 h-10 rounded-full bg-brand-green text-white flex items-center justify-center font-semibold flex-shrink-0">
                                  {getInitials(installer.firstName, installer.lastName)}
                                </div>
                                <div className="min-w-0">
                                  <p className="font-semibold text-slate-900 truncate">
                                    {installer.firstName} {installer.lastName}
                                  </p>
                                  <p className="text-sm text-slate-500 truncate">{installer.email}</p>
                                </div>
                              </button>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">
                        Email Address
                      </label>
                      <input
                        type="email"
                        value={composerEmail}
                        onChange={(e) => setComposerEmail(e.target.value)}
                        placeholder="name@example.com"
                        className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-green focus:border-brand-green"
                        autoFocus
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">
                        Subject
                      </label>
                      <input
                        type="text"
                        value={composerSubject}
                        onChange={(e) => setComposerSubject(e.target.value)}
                        placeholder="Subject"
                        className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-green focus:border-brand-green"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Message
                  </label>
                  <textarea
                    value={composerContent}
                    onChange={(e) => setComposerContent(e.target.value)}
                    placeholder="Write your message..."
                    rows={6}
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-green focus:border-brand-green resize-none"
                  />
                </div>
              </div>

              <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={resetComposer}
                  className="px-4 py-2 rounded-xl font-semibold text-slate-700 hover:bg-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={
                    isComposerSending ||
                    !composerContent.trim() ||
                    (composerMode === 'installer' && !composerInstaller) ||
                    (composerMode === 'email' && (!composerEmail.trim() || !composerSubject.trim()))
                  }
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-brand-green text-white rounded-xl font-semibold hover:bg-brand-green-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isComposerSending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Sending...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Send Message</span>
                    </>
                  )}
                </button>
              </div>
            </motion.form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className={`flex-1 transition-all duration-300 ${sidebarOpen ? 'lg:ml-64' : 'lg:ml-20'} w-full flex h-screen overflow-hidden`}>
        {/* Conversations List */}
        <div className="w-full md:w-96 border-r border-slate-200 bg-white flex flex-col h-full">
          {/* Header */}
          <div className="border-b border-slate-200 flex-shrink-0 pr-4 pl-16 pt-16 pb-4 lg:p-4">
            <h1 className="text-2xl font-bold text-slate-900 mb-4">Messages</h1>
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search installers..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-green focus:border-brand-green"
                />
              </div>
              <button
                type="button"
                onClick={() => {
                  setComposerInstaller(selectedInstaller)
                  setShowComposer(true)
                  setError('')
                  setSuccess('')
                }}
                className="inline-flex items-center justify-center w-12 h-12 bg-brand-green text-white rounded-xl hover:bg-brand-green-dark transition-colors shadow-sm flex-shrink-0"
                title="Compose email"
                aria-label="Compose email"
              >
                <Mail className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Conversations */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar">
            {filteredConversations.length === 0 ? (
              <div className="p-8 text-center">
                <MessageSquare className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500">No conversations found</p>
              </div>
            ) : (
              filteredConversations.map((conversation) => (
                <div
                  key={conversation.installer.id}
                  onClick={() => setSelectedInstaller(conversation.installer)}
                  className={`p-4 border-b border-slate-100 cursor-pointer hover:bg-slate-50 transition-colors ${
                    selectedInstaller?.id === conversation.installer.id ? 'bg-brand-green/5 border-l-4 border-l-brand-green' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="relative w-12 h-12 rounded-full overflow-hidden flex-shrink-0 ring-2 ring-brand-green/20 bg-brand-green">
                      {conversation.installer.photoUrl ? (
                        <Image
                          src={conversation.installer.photoUrl}
                          alt={`${conversation.installer.firstName} ${conversation.installer.lastName}`}
                          width={48}
                          height={48}
                          className="w-full h-full object-cover relative z-10"
                          onError={(e) => {
                            const parent = e.currentTarget.parentElement
                            if (parent) {
                              const initialsDiv = parent.querySelector('.initials-fallback')
                              if (initialsDiv) {
                                (initialsDiv as HTMLElement).style.display = 'flex'
                              }
                            }
                            e.currentTarget.style.display = 'none'
                          }}
                        />
                      ) : null}
                      <div className={`w-full h-full flex items-center justify-center initials-fallback ${
                        conversation.installer.photoUrl ? 'absolute inset-0 z-0' : ''
                      }`} style={{ display: conversation.installer.photoUrl ? 'none' : 'flex' }}>
                        <span className="text-white font-semibold text-sm">
                          {getInitials(conversation.installer.firstName, conversation.installer.lastName)}
                        </span>
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className="font-semibold text-slate-900 truncate">
                          {conversation.installer.firstName} {conversation.installer.lastName}
                        </p>
                        {conversation.lastMessage && (
                          <span className="text-xs text-slate-500 flex-shrink-0 ml-2">
                            {formatTime(conversation.lastMessage.createdAt)}
                          </span>
                        )}
                      </div>
                      {conversation.lastMessage ? (
                        <p className="text-sm text-slate-600 truncate">
                          {conversation.lastMessage.content}
                        </p>
                      ) : (
                        <p className="text-sm text-slate-400 italic">No messages yet</p>
                      )}
                      {conversation.unreadCount > 0 && (
                        <span className="inline-block mt-1 px-2 py-0.5 bg-brand-green text-white text-xs font-semibold rounded-full">
                          {conversation.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Chat Window */}
        <div className="flex-1 flex flex-col bg-slate-50 h-full overflow-hidden">
          {selectedInstaller ? (
            <>
              {/* Chat Header */}
              <div className="bg-white border-b border-slate-200 p-4 flex items-center gap-3 flex-shrink-0">
                <div className="relative w-10 h-10 rounded-full overflow-hidden flex-shrink-0 ring-2 ring-brand-green/20 bg-brand-green">
                  {selectedInstaller.photoUrl ? (
                    <Image
                      src={selectedInstaller.photoUrl}
                      alt={`${selectedInstaller.firstName} ${selectedInstaller.lastName}`}
                      width={40}
                      height={40}
                      className="w-full h-full object-cover relative z-10"
                      onError={(e) => {
                        const parent = e.currentTarget.parentElement
                        if (parent) {
                          const initialsDiv = parent.querySelector('.initials-fallback')
                          if (initialsDiv) {
                            (initialsDiv as HTMLElement).style.display = 'flex'
                          }
                        }
                        e.currentTarget.style.display = 'none'
                      }}
                    />
                  ) : null}
                  <div className={`w-full h-full flex items-center justify-center initials-fallback ${
                    selectedInstaller.photoUrl ? 'absolute inset-0 z-0' : ''
                  }`} style={{ display: selectedInstaller.photoUrl ? 'none' : 'flex' }}>
                    <span className="text-white font-semibold text-xs">
                      {getInitials(selectedInstaller.firstName, selectedInstaller.lastName)}
                    </span>
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-900">
                    {selectedInstaller.firstName} {selectedInstaller.lastName}
                  </p>
                  <p className="text-sm text-slate-500">{selectedInstaller.email}</p>
                </div>
              </div>

              {/* Messages */}
              <div
                ref={chatContainerRef}
                className="flex-1 overflow-y-auto overflow-x-hidden px-6 py-6 custom-scrollbar bg-gradient-to-b from-slate-50 via-white to-slate-50"
              >
                {messages.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <MessageSquare className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                      <p className="text-slate-500">No messages yet. Start the conversation!</p>
                    </div>
                  </div>
                ) : (
                  <AnimatePresence>
                    {messages.map((message, index) => {
                      const isFromAdmin = !message.senderId || message.senderId === 'admin'
                      const showAvatar = index === 0 || 
                        (isFromAdmin && messages[index - 1].senderId !== message.senderId) ||
                        (!isFromAdmin && messages[index - 1].senderId !== message.senderId)
                      return (
                        <motion.div
                          key={message.id}
                          initial={{ opacity: 0, y: 20, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          transition={{ 
                            duration: 0.3,
                            ease: [0.4, 0, 0.2, 1]
                          }}
                          className={`flex items-end gap-3 mb-4 ${isFromAdmin ? 'justify-end' : 'justify-start'}`}
                        >
                          {/* Avatar for admin messages (company logo) */}
                          {isFromAdmin && (
                            <div className={`flex-shrink-0 transition-opacity ${showAvatar ? 'opacity-100' : 'opacity-0 w-8'}`}>
                              <div className="relative w-10 h-10 rounded-full overflow-hidden ring-2 ring-white shadow-md bg-white">
                                <Image
                                  src={logo}
                                  alt="Company Logo"
                                  width={40}
                                  height={40}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    e.currentTarget.style.display = 'none'
                                  }}
                                />
                              </div>
                            </div>
                          )}

                          {/* Avatar for installer messages */}
                            {!isFromAdmin && (
                            <div className={`flex-shrink-0 transition-opacity ${showAvatar ? 'opacity-100' : 'opacity-0 w-8'}`}>
                              <div className="relative w-10 h-10 rounded-full overflow-hidden ring-2 ring-white shadow-md bg-gradient-to-br from-brand-green to-brand-green-dark">
                                {message.installer?.photoUrl ? (
                                  <Image
                                    src={message.installer.photoUrl}
                                    alt={`${message.installer.firstName} ${message.installer.lastName}`}
                                    width={40}
                                    height={40}
                                    className="w-full h-full object-cover relative z-10"
                                    onError={(e) => {
                                      const parent = e.currentTarget.parentElement
                                      if (parent) {
                                        const initialsDiv = parent.querySelector('.initials-fallback')
                                        if (initialsDiv) {
                                          (initialsDiv as HTMLElement).style.display = 'flex'
                                        }
                                      }
                                      e.currentTarget.style.display = 'none'
                                    }}
                                  />
                                ) : null}
                                <div className={`w-full h-full flex items-center justify-center initials-fallback ${
                                  message.installer?.photoUrl ? 'absolute inset-0 z-0' : ''
                                }`} style={{ display: message.installer?.photoUrl ? 'none' : 'flex' }}>
                                  <span className="text-white font-bold text-sm">
                                    {message.installer ? getInitials(message.installer.firstName, message.installer.lastName) : 'I'}
                                  </span>
                                </div>
                              </div>
                            </div>
                            )}

                          {/* Message Bubble */}
                          <div className={`flex flex-col ${isFromAdmin ? 'items-end' : 'items-start'} max-w-[75%] sm:max-w-[65%]`}>
                            <motion.div
                              whileHover={{ scale: 1.02 }}
                              transition={{ duration: 0.2 }}
                              className={`relative rounded-2xl px-5 py-3.5 shadow-xl ${
                                isFromAdmin
                                  ? 'bg-gradient-to-br from-brand-green via-brand-green to-brand-green-dark text-white rounded-br-md'
                                  : 'bg-white text-slate-800 border border-slate-200/80 rounded-bl-md shadow-slate-200/50'
                              }`}
                              style={{
                                boxShadow: isFromAdmin
                                  ? '0 4px 12px rgba(34, 197, 94, 0.25), 0 2px 4px rgba(34, 197, 94, 0.15)'
                                  : '0 2px 8px rgba(0, 0, 0, 0.08), 0 1px 3px rgba(0, 0, 0, 0.05)'
                              }}
                            >
                              {/* Message Tail */}
                              {isFromAdmin ? (
                                <div className="absolute -right-2 bottom-0 w-0 h-0 border-l-[12px] border-l-brand-green border-t-[8px] border-t-transparent border-b-[8px] border-b-transparent" />
                              ) : (
                                <div className="absolute -left-2 bottom-0 w-0 h-0 border-r-[12px] border-r-white border-t-[8px] border-t-transparent border-b-[8px] border-b-transparent" />
                              )}
                              
                              {message.content && (
                                <p className={`text-[15px] leading-relaxed whitespace-pre-wrap ${
                              isFromAdmin
                                    ? 'text-white font-medium' 
                                    : 'text-slate-800 font-normal'
                                }`}>
                                  {message.content}
                                </p>
                              )}
                              
                              {message.attachmentUrl && (
                                <div className={`mt-3 ${message.content ? 'mt-3' : ''}`}>
                                  {message.attachmentUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                                    <a
                                      href={message.attachmentUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-block rounded-lg overflow-hidden border-2 border-white/20 hover:border-white/40 transition-colors"
                                    >
                                      <img
                                        src={message.attachmentUrl}
                                        alt={message.attachmentName || 'Attachment'}
                                        className="w-40 max-w-[160px] h-28 max-h-[112px] object-cover"
                                        loading="lazy"
                                      />
                                    </a>
                                  ) : (
                                    <a
                                      href={message.attachmentUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-colors ${
                                        isFromAdmin
                                          ? 'bg-white/20 hover:bg-white/30 text-white'
                                          : 'bg-slate-100 hover:bg-slate-200 text-slate-800'
                                      }`}
                                    >
                                      <Paperclip className="w-4 h-4" />
                                      <span className="text-sm">{message.attachmentName || 'Download File'}</span>
                                    </a>
                                  )}
                                </div>
                              )}
                              
                              {message.link && (
                                <a
                                  href={message.link}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className={`text-sm mt-3 inline-flex items-center gap-1.5 font-semibold transition-colors ${
                                    isFromAdmin 
                                      ? 'text-white/95 hover:text-white' 
                                      : 'text-brand-green hover:text-brand-green-dark'
                                  }`}
                                >
                                  <span>View Link</span>
                                  <span className="text-xs">→</span>
                                </a>
                              )}
                            </motion.div>

                            {/* Timestamp and Read Status */}
                            <div className={`flex items-center gap-2 mt-1.5 px-2 ${isFromAdmin ? 'flex-row-reverse' : ''}`}>
                              <span className="text-xs text-slate-500 font-medium">
                                {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                              {isFromAdmin && message.isRead && (
                                <CheckCircle2 className="w-3.5 h-3.5 text-brand-green" />
                              )}
                            </div>
                          </div>

                          {/* Spacer for admin messages to align properly */}
                          {isFromAdmin && (
                            <div className="w-10 flex-shrink-0" />
                          )}
                        </motion.div>
                      )
                    })}
                  </AnimatePresence>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              <div className="bg-white border-t border-slate-200 p-4 flex-shrink-0">
                {error && (
                  <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-red-600" />
                    <p className="text-sm text-red-800">{error}</p>
                  </div>
                )}
                {success && (
                  <div className="mb-3 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                    <p className="text-sm text-green-800">{success}</p>
                  </div>
                )}
                
                {/* File Preview */}
                {selectedFile && (
                  <div className="mb-3 p-3 bg-slate-50 border border-slate-200 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        {filePreview ? (
                          <img
                            src={filePreview}
                            alt="Preview"
                            className="w-12 h-12 object-cover rounded-lg"
                          />
                        ) : (
                          <div className="w-12 h-12 bg-slate-200 rounded-lg flex items-center justify-center">
                            <Paperclip className="w-6 h-6 text-slate-500" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-900 truncate">{selectedFile.name}</p>
                          <p className="text-xs text-slate-500">
                            {(selectedFile.size / 1024).toFixed(1)} KB
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleRemoveFile}
                        className="ml-3 p-1.5 hover:bg-slate-200 rounded-lg transition-colors"
                      >
                        <X className="w-4 h-4 text-slate-600" />
                      </button>
                    </div>
                  </div>
                )}

                <form onSubmit={handleSendMessage} className="flex items-end gap-3">
                  <input
                    ref={fileInputRef}
                    type="file"
                    onChange={handleFileSelect}
                    className="hidden"
                    accept="image/*,.pdf,.doc,.docx,.txt"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center justify-center w-12 h-12 border-2 border-slate-300 rounded-xl hover:bg-slate-50 transition-colors flex-shrink-0"
                    title="Attach file"
                  >
                    <Paperclip className="w-5 h-5 text-slate-600" />
                  </button>
                  <div className="flex-1">
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
                    disabled={isSending || isUploadingFile || (!messageContent.trim() && !selectedFile)}
                    className="flex items-center justify-center w-12 h-12 bg-brand-green text-white rounded-xl hover:bg-brand-green-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                  >
                    {isSending || isUploadingFile ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Send className="w-5 h-5" />
                    )}
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <MessageSquare className="w-20 h-20 text-slate-300 mx-auto mb-4" />
                <h2 className="text-xl font-semibold text-slate-900 mb-2">Select a conversation</h2>
                <p className="text-slate-500">Choose an installer from the list to start messaging</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
