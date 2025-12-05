'use client'

import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Volume2, VolumeX, Pause, Play } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AudioPlayerProps {
  audioUrl?: string
  audioBlob?: Blob
  autoPlay?: boolean
  onEnded?: () => void
  showControls?: boolean
  className?: string
}

export default function AudioPlayer({
  audioUrl,
  audioBlob,
  autoPlay = false,
  onEnded,
  showControls = false,
  className,
}: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [progress, setProgress] = useState(0)
  const [duration, setDuration] = useState(0)

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const handleTimeUpdate = () => {
      setProgress((audio.currentTime / audio.duration) * 100 || 0)
    }

    const handleLoadedMetadata = () => {
      setDuration(audio.duration)
    }

    const handleEnded = () => {
      setIsPlaying(false)
      setProgress(0)
      onEnded?.()
    }

    const handlePlay = () => setIsPlaying(true)
    const handlePause = () => setIsPlaying(false)

    audio.addEventListener('timeupdate', handleTimeUpdate)
    audio.addEventListener('loadedmetadata', handleLoadedMetadata)
    audio.addEventListener('ended', handleEnded)
    audio.addEventListener('play', handlePlay)
    audio.addEventListener('pause', handlePause)

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate)
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata)
      audio.removeEventListener('ended', handleEnded)
      audio.removeEventListener('play', handlePlay)
      audio.removeEventListener('pause', handlePause)
    }
  }, [onEnded])

  useEffect(() => {
    if (audioBlob && audioRef.current) {
      const url = URL.createObjectURL(audioBlob)
      audioRef.current.src = url
      if (autoPlay) {
        audioRef.current.play()
      }
      return () => URL.revokeObjectURL(url)
    }
  }, [audioBlob, autoPlay])

  useEffect(() => {
    if (audioUrl && audioRef.current) {
      audioRef.current.src = audioUrl
      if (autoPlay) {
        audioRef.current.play()
      }
    }
  }, [audioUrl, autoPlay])

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause()
      } else {
        audioRef.current.play()
      }
    }
  }

  const toggleMute = () => {
    if (audioRef.current) {
      audioRef.current.muted = !isMuted
      setIsMuted(!isMuted)
    }
  }

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  if (!showControls) {
    return <audio ref={audioRef} autoPlay={autoPlay} />
  }

  return (
    <div className={cn('flex items-center gap-3 p-3 bg-primary-50 rounded-lg', className)}>
      <audio ref={audioRef} />
      
      {/* Play/Pause button */}
      <button
        onClick={togglePlay}
        className="w-10 h-10 rounded-full bg-brand-green text-white flex items-center justify-center hover:bg-brand-green-dark transition-colors"
      >
        {isPlaying ? (
          <Pause className="w-5 h-5" />
        ) : (
          <Play className="w-5 h-5 ml-0.5" />
        )}
      </button>

      {/* Progress bar */}
      <div className="flex-1 flex items-center gap-2">
        <span className="text-xs text-primary-500 w-10">
          {formatTime((progress / 100) * duration)}
        </span>
        <div className="flex-1 h-1.5 bg-primary-200 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-brand-green rounded-full"
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="text-xs text-primary-500 w-10">
          {formatTime(duration)}
        </span>
      </div>

      {/* Mute button */}
      <button
        onClick={toggleMute}
        className="p-2 text-primary-500 hover:text-primary-900 transition-colors"
      >
        {isMuted ? (
          <VolumeX className="w-5 h-5" />
        ) : (
          <Volume2 className="w-5 h-5" />
        )}
      </button>
    </div>
  )
}

