import OpenAI from 'openai'
import { getInterviewQuestions } from './questions'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function generateSpeech(text: string): Promise<Buffer> {
  const voice = 'nova'
  console.log('🔊 ===== GENERATING SPEECH =====')
  console.log('🔊 Voice setting:', voice)
  console.log('🔊 Model: tts-1')
  console.log('🔊 Text length:', text.length)
  
  // Check if API key is configured
  if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'sk-your-openai-api-key-here') {
    const error = 'OpenAI API key is not configured. Please set OPENAI_API_KEY in your environment variables.'
    console.error('❌', error)
    throw new Error(error)
  }
  
  try {
    const response = await openai.audio.speech.create({
      model: 'tts-1',
      voice: voice,
      input: text,
    })
    console.log('🔊 Speech generated successfully with voice:', voice)
    console.log('🔊 ===== END SPEECH GENERATION =====')

    const arrayBuffer = await response.arrayBuffer()
    return Buffer.from(arrayBuffer)
  } catch (error: any) {
    console.error('❌ Error generating speech:', error.message || error)
    if (error.status === 401) {
      throw new Error('Invalid OpenAI API key. Please check your OPENAI_API_KEY environment variable.')
    } else if (error.status === 429) {
      throw new Error('OpenAI API rate limit exceeded. Please try again later.')
    } else if (error.message) {
      throw new Error(`OpenAI API error: ${error.message}`)
    }
    throw error
  }
}

export async function generateInterviewResponse(
  conversationHistory: { role: 'user' | 'assistant'; content: string }[],
  currentQuestionIndex: number,
  language: 'en' | 'es' = 'en',
  nextQuestionIndexOverride?: number
): Promise<{
  response: string
  shouldMoveToNextQuestion: boolean
  extractedInfo?: Record<string, any>
}> {
  const questions = getInterviewQuestions(language)
  const currentQuestion = questions[currentQuestionIndex]
  const actualNextIndex = nextQuestionIndexOverride !== undefined ? nextQuestionIndexOverride : currentQuestionIndex + 1
  const isLastQuestion = actualNextIndex >= questions.length

  const systemPrompt = language === 'es' 
    ? `Eres Anna, una entrevistadora profesional de Floor Interior Service. Tu trabajo es conducir una entrevista de calificación breve y eficiente.
    
REGLAS IMPORTANTES:
- Mantén tus respuestas MUY BREVES (máximo 1-2 frases)
- Siempre confirma la respuesta del candidato de manera natural antes de hacer la siguiente pregunta
- Varía tus respuestas - NO digas "Gracias" en cada respuesta. Usa diferentes respuestas como: "Sí", "Entendido", "Perfecto", "Muy bien", "De acuerdo", "Excelente", "Bien", "Ok"
- Solo di "Gracias" ocasionalmente, no en cada respuesta
- NO menciones el nombre de la persona en cada respuesta - solo ocasionalmente si es necesario
- Después de confirmar, haz la siguiente pregunta inmediatamente
- Sé profesional pero amigable y natural
- NO des cumplidos largos ni agradecimientos extensos`

    : `You are Anna, a professional interviewer for Floor Interior Service. Your job is to conduct a brief and efficient qualification screening.

IMPORTANT RULES:
- Keep your responses VERY BRIEF (maximum 1-2 sentences)
- Always naturally acknowledge the candidate's response before asking the next question
- VARY your responses - Do NOT say "Thank you" every time. Use different responses like: "Yes", "Got it", "Perfect", "Great", "Okay", "Excellent", "Sounds good", "Alright", "Good"
- Only say "Thank you" occasionally, not in every response
- Do NOT mention the person's name in every response - only occasionally if needed
- After acknowledging, immediately ask the next question
- Be professional but friendly and natural
- Do NOT give long compliments or extensive thank yous`

  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: 'system', content: systemPrompt },
    ...conversationHistory.map(msg => ({
      role: msg.role,
      content: msg.content,
    })) as OpenAI.Chat.Completions.ChatCompletionMessageParam[],
  ]

  // Check if current question is closing question
  const isClosingQuestion = currentQuestion.id === 'closing'
  
  if (isClosingQuestion) {
    // For closing question, just thank them and conclude
    messages.push({
      role: 'system',
      content: language === 'es'
        ? 'Esta es la última pregunta. Después de recibir la respuesta, agradece brevemente de manera natural mencionando que revisarán sus respuestas y se pondrán en contacto pronto. NO hagas más preguntas.'
        : 'This is the closing question. After receiving their response, naturally thank them briefly and mention that you will review their responses and be in touch soon. Do NOT ask any more questions.',
    })
  } else if (!isLastQuestion && actualNextIndex < questions.length) {
    const nextQuestion = questions[actualNextIndex]
    messages.push({
      role: 'system',
      content: language === 'es'
        ? `Primero confirma su respuesta de manera natural VARIANDO tus respuestas (di algo como "Sí", "Entendido", "Perfecto", "Muy bien", "De acuerdo" - NO siempre "Gracias") y luego haz la siguiente pregunta: "${nextQuestion.text}"`
        : `First naturally acknowledge their response by VARYING your responses (say something like "Yes", "Got it", "Perfect", "Great", "Okay" - NOT always "Thank you") and then ask the next question: "${nextQuestion.text}"`,
    })
  } else {
    messages.push({
      role: 'system',
      content: language === 'es'
        ? 'Esta es la última pregunta. Después de recibir la respuesta, agradece brevemente de manera natural (di algo como "Perfecto, gracias" o "Excelente, gracias por tu tiempo") y concluye la entrevista.'
        : 'This is the last question. After receiving the answer, naturally thank them briefly (say something like "Perfect, thank you" or "Great, thanks for your time") and conclude the interview.',
    })
  }

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages,
    temperature: 0.7,
    max_tokens: 150,
  })

  const response = completion.choices[0]?.message?.content || ''
  const shouldMoveToNextQuestion = !isLastQuestion && actualNextIndex < questions.length && !isClosingQuestion

  const extractedInfo: Record<string, any> = {}
  
  return {
    response: response.trim(),
    shouldMoveToNextQuestion,
    extractedInfo: Object.keys(extractedInfo).length > 0 ? extractedInfo : undefined,
  }
}

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
  hasInsurance?: boolean
  hasGeneralLiability?: boolean
  hasCommercialAutoLiability?: boolean
  hasWorkersComp?: boolean
  hasWorkersCompExemption?: boolean
  hasLicense?: boolean
  hasBusinessLicense?: boolean
  isSunbizRegistered?: boolean
  canPassBackgroundCheck?: boolean
  vehicleDescription?: string
  openToTravel?: boolean
  travelLocations?: string[]
}> {
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: 'Extract structured data from this interview transcript. Return only valid JSON with the following fields: firstName, lastName, email, phone, yearsOfExperience, flooringSpecialties (array), flooringSkills (array - IMPORTANT: if the user selected flooring types like "Carpet, LVP, Hardwood", parse them into an array), hasOwnCrew (boolean), crewSize (number), hasInsurance (boolean), hasGeneralLiability (boolean), hasCommercialAutoLiability (boolean), hasWorkersComp (boolean), hasWorkersCompExemption (boolean), hasLicense (boolean), hasBusinessLicense (boolean), isSunbizRegistered (boolean), canPassBackgroundCheck (boolean), vehicleDescription (string), openToTravel (boolean), travelLocations (array). Only include fields that have values. For flooringSkills, if the answer is a comma-separated list, split it into an array.',
      },
      {
        role: 'user',
        content: transcript,
      },
    ],
    temperature: 0.3,
    response_format: { type: 'json_object' },
  })

  try {
    const data = JSON.parse(completion.choices[0]?.message?.content || '{}')
    return data
  } catch {
    return {}
  }
}
