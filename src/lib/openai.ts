import OpenAI from 'openai'
import { INTERVIEW_QUESTIONS, getInterviewQuestions } from './questions'

// Re-export questions for other files
export { INTERVIEW_QUESTIONS, getInterviewQuestions }

// Initialize OpenAI client
export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// System prompt for the AI interviewer
export const INTERVIEWER_SYSTEM_PROMPT = `You are a professional, friendly AI interviewer conducting a prescreening interview for flooring installer positions. Your role is to:

1. Ask questions clearly and conversationally
2. Listen carefully to responses and ask follow-up questions if needed
3. Keep the conversation professional but warm
4. Extract key information from responses
5. Guide the conversation naturally through all required topics

Key information to collect:
- Full name
- Contact information (email, phone)
- Years of flooring installation experience
- Types of flooring expertise (hardwood, laminate, vinyl, tile, carpet, etc.)
- Whether they have their own crew and crew size
- Whether they have their own tools/equipment
- Service areas (cities/regions)
- Availability (full-time, part-time, contract)
- Insurance status
- Licensing/certifications

Be conversational and natural. If an answer is unclear, politely ask for clarification. Acknowledge good responses positively.`

// Function to extract structured data from interview transcript
export async function extractInterviewData(transcript: string): Promise<{
  firstName?: string
  lastName?: string
  email?: string
  phone?: string
  yearsOfExperience?: number
  flooringSpecialties?: string[]
  flooringSkills?: string[]
  hasOwnCrew?: boolean
  crewSize?: number
  hasOwnTools?: boolean
  toolsDescription?: string
  hasVehicle?: boolean
  vehicleDescription?: string
  serviceAreas?: string[]
  willingToTravel?: boolean
  availability?: string
  canStartImmediately?: boolean
  hasInsurance?: boolean
  insuranceType?: string
  hasLicense?: boolean
  licenseInfo?: string
  // New fields
  hasGeneralLiability?: boolean
  hasCommercialAutoLiability?: boolean
  hasWorkersComp?: boolean
  hasWorkersCompExemption?: boolean
  isSunbizRegistered?: boolean
  isSunbizActive?: boolean
  hasBusinessLicense?: boolean
  canPassBackgroundCheck?: boolean
  backgroundCheckDetails?: string
  mondayToFridayAvailability?: string
  saturdayAvailability?: string
  openToTravel?: boolean
  travelLocations?: string[]
  additionalNotes?: string
}> {
  const response = await openai.chat.completions.create({
    model: 'gpt-4-turbo-preview',
    messages: [
      {
        role: 'system',
        content: `You are a data extraction assistant. Extract structured information from the interview transcript and return it as JSON. Be accurate and extract information based on what was mentioned.

IMPORTANT: For yes/no questions, interpret affirmative responses generously:
- "yes", "yeah", "yep", "sure", "I do", "I have", "correct", "that's right", "affirmative" = true
- "no", "nope", "I don't", "I don't have", "not yet", "negative" = false

Return a JSON object with these fields (only include fields that have data):
- firstName: string
- lastName: string
- email: string
- phone: string
- yearsOfExperience: number
- flooringSpecialties: string[] (e.g., ["hardwood", "laminate", "vinyl"])
- flooringSkills: string[] (e.g., ["Carpet", "LVP", "Hardwood", "Tile"])
- hasOwnCrew: boolean
- crewSize: number
- hasOwnTools: boolean
- toolsDescription: string
- hasVehicle: boolean
- vehicleDescription: string (make, model, cargo capacity)
- serviceAreas: string[] (cities/regions)
- willingToTravel: boolean
- availability: string (full-time, part-time, contract)
- canStartImmediately: boolean
- hasInsurance: boolean (set to true if they have ANY type of insurance)
- insuranceType: string
- hasLicense: boolean
- licenseInfo: string
- hasGeneralLiability: boolean (General Liability Insurance - true if answered yes)
- hasCommercialAutoLiability: boolean (Commercial Auto Liability Insurance - true if answered yes)
- hasWorkersComp: boolean (Worker's Compensation Insurance - true if answered yes)
- hasWorkersCompExemption: boolean (Worker's Comp Exemption - true if answered yes)
- isSunbizRegistered: boolean (Registered with Florida SunBiz - true if answered yes)
- isSunbizActive: boolean (SunBiz registration is active - true if answered yes)
- hasBusinessLicense: boolean (Business Tax Receipt/Business License - true if answered yes)
- canPassBackgroundCheck: boolean (can pass background check - true if answered yes)
- backgroundCheckDetails: string (details about background issues if any)
- mondayToFridayAvailability: string (e.g., "available", "full-time", "part-time")
- saturdayAvailability: string (e.g., "available", "not available", "half-day")
- openToTravel: boolean (open to traveling for work - true if answered yes)
- travelLocations: string[] (locations willing to travel to, e.g., ["Tampa", "Sarasota", "Naples"])
- additionalNotes: string

NOTE: If someone answers "yes" to General Liability, Commercial Auto, or Worker's Comp, also set hasInsurance to true.`,
      },
      {
        role: 'user',
        content: `Extract structured data from this interview transcript:\n\n${transcript}`,
      },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.1,
  })

  const content = response.choices[0]?.message?.content
  if (!content) {
    throw new Error('No response from OpenAI')
  }

  return JSON.parse(content)
}

// Function to generate AI response during interview
export async function generateInterviewResponse(
  conversationHistory: { role: 'user' | 'assistant'; content: string }[],
  currentQuestionIndex: number,
  language: 'en' | 'es' = 'en'
): Promise<{
  response: string
  shouldMoveToNextQuestion: boolean
  extractedInfo?: Record<string, any>
}> {
  const questions = getInterviewQuestions(language)
  const currentQuestion = questions[currentQuestionIndex]
  const nextQuestion = questions[currentQuestionIndex + 1]
  
  const languageInstruction = language === 'es' 
    ? 'IMPORTANT: You must respond entirely in Spanish. All your responses should be in Spanish.'
    : 'Respond in English.'

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: 'system', content: INTERVIEWER_SYSTEM_PROMPT },
    ...conversationHistory.map(msg => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
    })),
  ]

  const response = await openai.chat.completions.create({
    model: 'gpt-4-turbo-preview',
    messages: [
      ...messages,
      {
        role: 'system',
        content: `${languageInstruction}

Current question topic: ${currentQuestion?.field || 'closing'}
${nextQuestion ? `Next question to ask: "${nextQuestion.text}"` : (language === 'es' ? 'Esta es la última pregunta. Después de reconocer su respuesta, agradézcales por completar la entrevista.' : 'This is the final question. After acknowledging their response, thank them for completing the interview.')}

Analyze the candidate's last response. If they've adequately answered the current question, acknowledge their response briefly and naturally transition to the next question. If clarification is needed, ask a follow-up question.

Return JSON with:
- response: Your spoken response to the candidate (${language === 'es' ? 'in Spanish' : 'in English'})
- shouldMoveToNextQuestion: boolean (true if the current question is sufficiently answered)
- extractedInfo: object with any specific data points extracted from their response`,
      },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.7,
  })

  const content = response.choices[0]?.message?.content
  if (!content) {
    throw new Error('No response from OpenAI')
  }

  return JSON.parse(content)
}

// Function to transcribe audio using Whisper
export async function transcribeAudio(audioBlob: Blob): Promise<string> {
  const formData = new FormData()
  formData.append('file', audioBlob, 'audio.webm')
  formData.append('model', 'whisper-1')
  formData.append('language', 'en')

  const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: formData,
  })

  const data = await response.json()
  return data.text
}

// Function to generate speech from text using TTS
export async function generateSpeech(text: string): Promise<ArrayBuffer> {
  const response = await openai.audio.speech.create({
    model: 'tts-1',
    voice: 'alloy',
    input: text,
  })

  return response.arrayBuffer()
}

