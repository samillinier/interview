import { create } from 'zustand'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  audioUrl?: string
}

interface InterviewState {
  // Interview status
  isInterviewActive: boolean
  currentQuestionIndex: number
  isRecording: boolean
  isProcessing: boolean
  isSpeaking: boolean
  
  // Messages
  messages: Message[]
  
  // Extracted data
  extractedData: Record<string, any>
  
  // Interview metadata
  interviewId: string | null
  installerId: string | null
  
  // Actions
  startInterview: (installerId: string) => void
  endInterview: () => void
  addMessage: (message: Omit<Message, 'id' | 'timestamp'>) => void
  setRecording: (isRecording: boolean) => void
  setProcessing: (isProcessing: boolean) => void
  setSpeaking: (isSpeaking: boolean) => void
  nextQuestion: () => void
  updateExtractedData: (data: Record<string, any>) => void
  setInterviewId: (id: string) => void
  reset: () => void
}

const initialState = {
  isInterviewActive: false,
  currentQuestionIndex: 0,
  isRecording: false,
  isProcessing: false,
  isSpeaking: false,
  messages: [],
  extractedData: {},
  interviewId: null,
  installerId: null,
}

export const useInterviewStore = create<InterviewState>((set) => ({
  ...initialState,
  
  startInterview: (installerId) => set({
    isInterviewActive: true,
    installerId,
    currentQuestionIndex: 0,
    messages: [],
    extractedData: {},
  }),
  
  endInterview: () => set({
    isInterviewActive: false,
  }),
  
  addMessage: (message) => set((state) => ({
    messages: [
      ...state.messages,
      {
        ...message,
        id: crypto.randomUUID(),
        timestamp: new Date(),
      },
    ],
  })),
  
  setRecording: (isRecording) => set({ isRecording }),
  
  setProcessing: (isProcessing) => set({ isProcessing }),
  
  setSpeaking: (isSpeaking) => set({ isSpeaking }),
  
  nextQuestion: () => set((state) => ({
    currentQuestionIndex: state.currentQuestionIndex + 1,
  })),
  
  updateExtractedData: (data) => set((state) => ({
    extractedData: { ...state.extractedData, ...data },
  })),
  
  setInterviewId: (interviewId) => set({ interviewId }),
  
  reset: () => set(initialState),
}))

// Dashboard filters store
interface FilterState {
  searchQuery: string
  statusFilter: string
  experienceFilter: string
  specialtyFilter: string
  locationFilter: string
  
  setSearchQuery: (query: string) => void
  setStatusFilter: (status: string) => void
  setExperienceFilter: (experience: string) => void
  setSpecialtyFilter: (specialty: string) => void
  setLocationFilter: (location: string) => void
  resetFilters: () => void
}

const initialFilterState = {
  searchQuery: '',
  statusFilter: 'all',
  experienceFilter: 'all',
  specialtyFilter: 'all',
  locationFilter: 'all',
}

export const useFilterStore = create<FilterState>((set) => ({
  ...initialFilterState,
  
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setStatusFilter: (statusFilter) => set({ statusFilter }),
  setExperienceFilter: (experienceFilter) => set({ experienceFilter }),
  setSpecialtyFilter: (specialtyFilter) => set({ specialtyFilter }),
  setLocationFilter: (locationFilter) => set({ locationFilter }),
  resetFilters: () => set(initialFilterState),
}))



