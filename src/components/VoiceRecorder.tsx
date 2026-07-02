'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Mic, MicOff, Square } from 'lucide-react'
import { cn, getSupportedMimeType, isMobile, resumeAudioContext } from '@/lib/utils'

interface VoiceRecorderProps {
  onRecordingComplete: (audioBlob: Blob) => void
  isDisabled?: boolean
  autoStart?: boolean
}

export default function VoiceRecorder({
  onRecordingComplete,
  isDisabled = false,
  autoStart = false,
}: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false)
  const [audioLevel, setAudioLevel] = useState(0)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const chunksRef = useRef<Blob[]>([])

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
      
      if (audioContextRef.current) {
        audioContextRef.current.close()
      }
    }
  }, [isRecording])

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        } 
      })
      
      // Set up audio analysis for visualization
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
      
      // Resume audio context on mobile (required for iOS)
      if (isMobile()) {
        await resumeAudioContext(audioContextRef.current)
      }
      
      analyserRef.current = audioContextRef.current.createAnalyser()
      const source = audioContextRef.current.createMediaStreamSource(stream)
      source.connect(analyserRef.current)
      analyserRef.current.fftSize = 256
      
      // Animate audio level
      const updateAudioLevel = () => {
        if (analyserRef.current) {
          const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount)
          analyserRef.current.getByteFrequencyData(dataArray)
          const average = dataArray.reduce((a, b) => a + b) / dataArray.length
          setAudioLevel(average / 255)
        }
        animationFrameRef.current = requestAnimationFrame(updateAudioLevel)
      }
      updateAudioLevel()
      
      // Get supported MIME type for this device
      const mimeType = getSupportedMimeType()
      
      // Set up media recorder with device-compatible codec
      const options: MediaRecorderOptions = {}
      if (MediaRecorder.isTypeSupported(mimeType)) {
        options.mimeType = mimeType
      }
      
      mediaRecorderRef.current = new MediaRecorder(stream, options)
      
      chunksRef.current = []
      
      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data)
        }
      }
      
      mediaRecorderRef.current.onstop = () => {
        // Use the actual MIME type from the recorder or fallback
        const blobType = mediaRecorderRef.current?.mimeType || mimeType || 'audio/webm'
        const audioBlob = new Blob(chunksRef.current, { type: blobType })
        onRecordingComplete(audioBlob)
        stream.getTracks().forEach(track => track.stop())
        setAudioLevel(0)
      }
      
      mediaRecorderRef.current.start()
      setIsRecording(true)
    } catch (error: any) {
      console.error('Error accessing microphone:', error)
      // Provide user-friendly error message
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        alert('Microphone permission denied. Please allow microphone access in your browser settings.')
      } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        alert('No microphone found. Please connect a microphone and try again.')
      } else {
        alert('Error accessing microphone. Please try again or use text input instead.')
      }
    }
  }, [onRecordingComplete])

  useEffect(() => {
    if (autoStart && !isDisabled) {
      startRecording()
    }
  }, [autoStart, isDisabled, startRecording])

  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
      if (audioContextRef.current) {
        audioContextRef.current.close()
      }
    }
  }, [])

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording()
    } else {
      startRecording()
    }
  }

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Recording button */}
      <motion.button
        onClick={toggleRecording}
        disabled={isDisabled}
        className={cn(
          'relative w-20 h-20 rounded-full flex items-center justify-center transition-all',
          isRecording
            ? 'bg-danger-500 recording-pulse'
            : 'bg-brand-green hover:bg-brand-green-dark',
          isDisabled && 'opacity-50 cursor-not-allowed'
        )}
        whileTap={{ scale: 0.95 }}
      >
        <AnimatePresence mode="wait">
          {isRecording ? (
            <motion.div
              key="stop"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
            >
              <Square className="w-8 h-8 text-white fill-white" />
            </motion.div>
          ) : (
            <motion.div
              key="mic"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
            >
              {isDisabled ? (
                <MicOff className="w-8 h-8 text-white" />
              ) : (
                <Mic className="w-8 h-8 text-white" />
              )}
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Audio level ring */}
        {isRecording && (
          <motion.div
            className="absolute inset-0 rounded-full border-4 border-danger-300"
            initial={{ scale: 1, opacity: 0.5 }}
            animate={{
              scale: 1 + audioLevel * 0.3,
              opacity: 0.3 + audioLevel * 0.4,
            }}
            transition={{ duration: 0.1 }}
          />
        )}
      </motion.button>

      {/* Recording indicator */}
      <AnimatePresence>
        {isRecording && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center gap-2 text-danger-500"
          >
            <span className="w-2 h-2 rounded-full bg-danger-500 animate-pulse" />
            <span className="text-sm font-medium">Recording...</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Voice wave visualization */}
      {isRecording && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center justify-center gap-1 h-8"
        >
          {[...Array(5)].map((_, i) => (
            <motion.div
              key={i}
              className="w-1 bg-brand-green rounded-full voice-wave-bar"
              style={{
                height: `${8 + audioLevel * 24}px`,
                animationDelay: `${i * 0.1}s`,
              }}
            />
          ))}
        </motion.div>
      )}

      {/* Instructions */}
      {!isRecording && !isDisabled && (
        <p className="text-sm text-primary-500">
          Click the microphone to start recording
        </p>
      )}
    </div>
  )
}

