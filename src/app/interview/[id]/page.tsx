'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import {
  Mic,
  MicOff,
  Square,
  Volume2,
  CheckCircle2,
  XCircle,
  Loader2,
  MessageSquare,
} from 'lucide-react'
import Image from 'next/image'
import MessageBubble from '@/components/MessageBubble'
import SpeakingAnimation from '@/components/SpeakingAnimation'
import { getInterviewQuestions } from '@/lib/questions'
import interviewerImage from '@/images/27f1f909-0d63-4757-88e4-0e76f939f363.jpeg'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

export default function InterviewPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])

  const [isLoading, setIsLoading] = useState(true)
  const [interviewData, setInterviewData] = useState<any>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [conversationHistory, setConversationHistory] = useState<any[]>([])
  const [language, setLanguage] = useState<'en' | 'es'>('en')
  
  // Get questions based on language
  const questions = getInterviewQuestions(language)

  const [isRecording, setIsRecording] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [audioLevel, setAudioLevel] = useState(0)

  const [isComplete, setIsComplete] = useState(false)
  const [result, setResult] = useState<any>(null)

  const [inputMode, setInputMode] = useState<'voice' | 'text'>('voice')
  const [textInput, setTextInput] = useState('')
  
  // Pending response for review/edit
  const [pendingResponse, setPendingResponse] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState(false)

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Initialize interview
  useEffect(() => {
    const initInterview = async () => {
      try {
        // Try to get stored interview data
        const stored = sessionStorage.getItem('interviewData')
        if (stored) {
          const data = JSON.parse(stored)
          setInterviewData(data)
          setCurrentQuestionIndex(data.currentQuestion.index)
          
          // Set language from stored data
          if (data.language) {
            setLanguage(data.language)
          }

          // Add first AI message
          const firstMessage: Message = {
            id: crypto.randomUUID(),
            role: 'assistant',
            content: data.currentQuestion.text,
            timestamp: new Date(),
          }
          setMessages([firstMessage])
          setConversationHistory([{ role: 'assistant', content: data.currentQuestion.text }])

          // Play audio if available
          if (data.audioBase64) {
            playAudio(data.audioBase64)
          }
        }
      } catch (error) {
        console.error('Error initializing interview:', error)
      } finally {
        setIsLoading(false)
      }
    }

    initInterview()
  }, [])

  const playAudio = useCallback((base64Audio: string) => {
    setIsSpeaking(true)
    const audio = new Audio(`data:audio/mp3;base64,${base64Audio}`)
    audioRef.current = audio
    audio.onended = () => setIsSpeaking(false)
    audio.play().catch((err) => {
      console.error('Error playing audio:', err)
      setIsSpeaking(false)
    })
  }, [])

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })

      mediaRecorderRef.current = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
      })

      chunksRef.current = []

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data)
        }
      }

      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' })
        stream.getTracks().forEach((track) => track.stop())
        // Transcribe audio first and show for review
        await transcribeAndPreview(audioBlob)
      }

      mediaRecorderRef.current.start()
      setIsRecording(true)
    } catch (error) {
      console.error('Error accessing microphone:', error)
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
    }
  }

  // Transcribe audio and show for review
  const transcribeAndPreview = async (audioBlob: Blob) => {
    setIsProcessing(true)
    try {
      const formData = new FormData()
      formData.append('audio', audioBlob, 'audio.webm')
      formData.append('language', language)

      const response = await fetch('/api/interview/transcribe', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()
      if (data.text) {
        setPendingResponse(data.text)
        setIsEditing(false)
      } else {
        console.error('Transcription failed:', data.error)
        setPendingResponse('')
        setIsEditing(true)
      }
    } catch (error) {
      console.error('Error transcribing:', error)
      setPendingResponse('')
      setIsEditing(true)
    } finally {
      setIsProcessing(false)
    }
  }

  // Confirm and send the response
  const confirmResponse = async () => {
    if (!pendingResponse?.trim()) return
    const text = pendingResponse
    setPendingResponse(null)
    setIsEditing(false)
    await processResponse(undefined, text)
  }

  // Cancel pending response
  const cancelPendingResponse = () => {
    setPendingResponse(null)
    setIsEditing(false)
  }

  const processResponse = async (audioBlob?: Blob, text?: string) => {
    setIsProcessing(true)

    try {
      const formData = new FormData()
      formData.append('interviewId', params.id)
      formData.append('questionIndex', currentQuestionIndex.toString())
      formData.append('conversationHistory', JSON.stringify(conversationHistory))
      formData.append('language', language)

      if (audioBlob) {
        formData.append('audio', audioBlob)
      }
      if (text) {
        formData.append('textResponse', text)
      }

      const response = await fetch('/api/interview/respond', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (data.success) {
        // Add user message
        const userMessage: Message = {
          id: crypto.randomUUID(),
          role: 'user',
          content: data.userTranscript,
          timestamp: new Date(),
        }

        // Add AI message
        const aiMessage: Message = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: data.aiResponse,
          timestamp: new Date(),
        }

        setMessages((prev) => [...prev, userMessage, aiMessage])
        setConversationHistory(data.conversationHistory)
        setCurrentQuestionIndex(data.nextQuestionIndex)

        // Play AI response
        if (data.audioBase64) {
          playAudio(data.audioBase64)
        }

        // Check if complete
        if (data.isComplete) {
          await completeInterview()
        }
      }
    } catch (error) {
      console.error('Error processing response:', error)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleTextSubmit = async () => {
    if (!textInput.trim()) return
    const text = textInput
    setTextInput('')
    await processResponse(undefined, text)
  }

  const completeInterview = async () => {
    try {
      const response = await fetch('/api/interview/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ interviewId: params.id }),
      })

      const data = await response.json()

      if (data.success) {
        setResult(data.result)
        setIsComplete(true)
      }
    } catch (error) {
      console.error('Error completing interview:', error)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen interview-gradient flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-brand-green animate-spin mx-auto mb-4" />
          <p className="text-primary-600">Loading interview...</p>
        </div>
      </div>
    )
  }

  if (!interviewData) {
    return (
      <div className="min-h-screen interview-gradient flex items-center justify-center p-4">
        <div className="text-center bg-white rounded-3xl shadow-xl p-8 max-w-md">
          <div className="w-16 h-16 bg-danger-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <XCircle className="w-8 h-8 text-danger-600" />
          </div>
          <h2 className="text-xl font-bold text-primary-900 mb-2">Interview Not Found</h2>
          <p className="text-primary-500 mb-6">
            The interview session could not be loaded. Please start a new interview.
          </p>
          <button
            onClick={() => router.push('/interview')}
            className="px-6 py-3 bg-brand-green text-white rounded-xl font-medium hover:bg-brand-green-dark transition-colors"
          >
            Start New Interview
          </button>
        </div>
      </div>
    )
  }

  if (isComplete && result) {
    return (
      <div className="min-h-screen interview-gradient grid-pattern flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-lg bg-white rounded-3xl shadow-xl shadow-primary-900/5 p-8 md:p-12 text-center"
        >
          {result.passed ? (
            <>
              <div className="w-20 h-20 bg-success-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="w-10 h-10 text-success-600" />
              </div>
              <h1 className="text-2xl font-bold text-primary-900 mb-2">
                Congratulations!
              </h1>
              <p className="text-primary-500 mb-6">
                You have successfully passed the prescreening interview.
              </p>
            </>
          ) : (
            <>
              <div className="w-20 h-20 bg-danger-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <XCircle className="w-10 h-10 text-danger-600" />
              </div>
              <h1 className="text-2xl font-bold text-primary-900 mb-2">
                Thank You for Your Time
              </h1>
              <p className="text-primary-500 mb-6">
                Unfortunately, you did not meet the minimum requirements at this time.
              </p>
            </>
          )}

          <div className="bg-primary-50 rounded-2xl p-6 mb-6 text-left">
            <h3 className="font-medium text-primary-900 mb-3">Interview Summary</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-primary-500">Score</span>
                <span className="font-medium text-primary-900">{result.score}/100</span>
              </div>
              <div className="flex justify-between">
                <span className="text-primary-500">Status</span>
                <span
                  className={`font-medium ${
                    result.passed ? 'text-success-600' : 'text-danger-600'
                  }`}
                >
                  {result.passed ? 'Passed' : 'Not Qualified'}
                </span>
              </div>
              {result.reason && (
                <div className="pt-2 border-t border-primary-200">
                  <span className="text-primary-500 block mb-1">Notes</span>
                  <span className="text-primary-700">{result.reason}</span>
                </div>
              )}
            </div>
          </div>

          <button
            onClick={() => router.push('/')}
            className="w-full py-4 bg-brand-green text-white rounded-xl font-medium hover:bg-brand-green-dark transition-colors"
          >
            Return Home
          </button>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen interview-gradient flex flex-col">
      {/* Header */}
      <header className="border-b border-primary-100 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="font-bold text-primary-900">Prescreening Interview</h1>
            <p className="text-sm text-primary-500">
              Question {Math.min(currentQuestionIndex + 1, questions.length)} of{' '}
              {questions.length}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isSpeaking && (
              <div className="flex items-center gap-1 text-primary-500">
                <Volume2 className="w-4 h-4" />
                <span className="text-xs">Speaking...</span>
              </div>
            )}
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-primary-100">
          <motion.div
            className="h-full bg-brand-green"
            initial={{ width: 0 }}
            animate={{
              width: `${((currentQuestionIndex + 1) / questions.length) * 100}%`,
            }}
            transition={{ duration: 0.5 }}
          />
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
          <AnimatePresence>
            {messages.map((message) => (
              <MessageBubble
                key={message.id}
                role={message.role}
                content={message.content}
                timestamp={message.timestamp}
              />
            ))}
          </AnimatePresence>

          {/* Speaking animation */}
          {isSpeaking && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-3"
            >
              <div className="w-10 h-10 rounded-full overflow-hidden ring-2 ring-brand-green/20">
                <Image
                  src={interviewerImage}
                  alt="Interviewer"
                  width={40}
                  height={40}
                  className="w-full h-full object-cover"
                />
              </div>
              <SpeakingAnimation isActive={true} />
            </motion.div>
          )}

          {/* Processing indicator */}
          {isProcessing && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-3 text-primary-500"
            >
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-sm">Processing your response...</span>
            </motion.div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input area */}
      <div className="border-t border-primary-100 bg-white sticky bottom-0">
        <div className="max-w-3xl mx-auto px-4 py-6">
          
          {/* Pending Response Preview - for editing before sending */}
          {pendingResponse !== null ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <div className="bg-primary-50 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-primary-700">Your Response</span>
                  <button
                    onClick={() => setIsEditing(!isEditing)}
                    className="text-sm text-brand-green hover:text-brand-green-dark font-medium"
                  >
                    {isEditing ? 'Done Editing' : 'Edit'}
                  </button>
                </div>
                {isEditing ? (
                  <textarea
                    value={pendingResponse}
                    onChange={(e) => setPendingResponse(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-primary-200 focus:border-brand-green focus:ring-0 outline-none transition-colors resize-none"
                    rows={3}
                    autoFocus
                  />
                ) : (
                  <p className="text-primary-900">{pendingResponse}</p>
                )}
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={cancelPendingResponse}
                  className="flex-1 px-4 py-3 border border-primary-200 text-primary-700 rounded-xl font-medium hover:bg-primary-50 transition-colors"
                >
                  Re-record
                </button>
                <button
                  onClick={confirmResponse}
                  disabled={!pendingResponse?.trim()}
                  className="flex-1 px-4 py-3 bg-brand-green text-white rounded-xl font-medium hover:bg-brand-green-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Send Response
                </button>
              </div>
            </motion.div>
          ) : (
            <>
              {/* Mode toggle */}
              <div className="flex justify-center mb-4">
                <div className="inline-flex bg-primary-100 rounded-lg p-1">
                  <button
                    onClick={() => setInputMode('voice')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      inputMode === 'voice'
                        ? 'bg-white text-primary-900 shadow-sm'
                        : 'text-primary-500'
                    }`}
                  >
                    <Mic className="w-4 h-4 inline mr-1" />
                    Voice
                  </button>
                  <button
                    onClick={() => setInputMode('text')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      inputMode === 'text'
                        ? 'bg-white text-primary-900 shadow-sm'
                        : 'text-primary-500'
                    }`}
                  >
                    <MessageSquare className="w-4 h-4 inline mr-1" />
                    Text
                  </button>
                </div>
              </div>

              {inputMode === 'voice' ? (
                <div className="flex flex-col items-center">
                  <motion.button
                    onClick={isRecording ? stopRecording : startRecording}
                    disabled={isProcessing || isSpeaking}
                    className={`w-20 h-20 rounded-full flex items-center justify-center transition-all ${
                      isRecording
                        ? 'bg-danger-500 recording-pulse'
                        : 'bg-brand-green hover:bg-brand-green-dark'
                    } ${(isProcessing || isSpeaking) && 'opacity-50 cursor-not-allowed'}`}
                    whileTap={{ scale: 0.95 }}
                  >
                    {isRecording ? (
                      <Square className="w-8 h-8 text-white fill-white" />
                    ) : (
                      <Mic className="w-8 h-8 text-white" />
                    )}
                  </motion.button>

                  <p className="mt-4 text-sm text-primary-500">
                    {isRecording
                      ? 'Click to stop recording'
                      : isSpeaking
                      ? 'Listening to AI response...'
                      : isProcessing
                      ? 'Transcribing...'
                      : 'Click to start recording'}
                  </p>

                  {/* Recording indicator */}
                  {isRecording && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex items-center gap-2 mt-2 text-danger-500"
                    >
                      <span className="w-2 h-2 rounded-full bg-danger-500 animate-pulse" />
                      <span className="text-sm font-medium">Recording...</span>
                    </motion.div>
                  )}
                </div>
              ) : (
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={textInput}
                    onChange={(e) => setTextInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleTextSubmit()}
                    placeholder="Type your response..."
                    disabled={isProcessing || isSpeaking}
                    className="flex-1 px-4 py-3 rounded-xl border border-primary-200 focus:border-primary-900 focus:ring-0 outline-none transition-colors disabled:opacity-50"
                  />
                  <button
                    onClick={handleTextSubmit}
                    disabled={!textInput.trim() || isProcessing || isSpeaking}
                    className="px-6 py-3 bg-brand-green text-white rounded-xl font-medium hover:bg-brand-green-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Send
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

