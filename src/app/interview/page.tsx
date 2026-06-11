'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight, Loader2, Globe } from 'lucide-react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import logo from '@/images/freepik_br_649d627d-2016-4108-ab09-0d2a0ad903d9.png'

export default function InterviewStartPage() {
  const router = useRouter()
  const [step, setStep] = useState<'welcome' | 'language' | 'email'>('welcome')
  const [language, setLanguage] = useState<'en' | 'es'>('en')
  const [email, setEmail] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleStartInterview = async () => {
    if (!email) {
      setError(language === 'es' ? 'Por favor ingrese su correo electrónico' : 'Please enter your email address')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      const response = await fetch('/api/interview/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, firstName, lastName, language }),
      })

      const data = await response.json()
      console.log('API Response:', data)

      if (data.success) {
        // Store interview data and redirect
        sessionStorage.setItem('interviewData', JSON.stringify({ ...data, language }))
        console.log('Stored data, redirecting to:', `/interview/${data.interviewId}`)
        router.push(`/interview/${data.interviewId}`)
      } else {
        console.error('API Error:', data.error)
        setError(data.error || (language === 'es' ? 'Error al iniciar la entrevista. Inténtalo de nuevo.' : 'Failed to start interview. Please try again.'))
      }
    } catch (err: any) {
      console.error('Fetch Error:', err)
      setError(err.message || (language === 'es' ? 'Algo salió mal. Inténtalo de nuevo.' : 'Something went wrong. Please try again.'))
    } finally {
      setIsLoading(false)
    }
  }

  // Text content based on language
  const content = {
    en: {
      title: 'Installer Prescreening',
      subtitle: 'Complete your interview in just a few minutes',
      feature1: 'Voice-Powered Interview',
      feature1Desc: 'Simply speak your answers naturally',
      feature2: 'Quick & Easy',
      feature2Desc: 'Takes about 5-10 minutes to complete',
      feature3: 'Instant Results',
      feature3Desc: 'Get feedback immediately after completion',
      getStarted: 'Get Started',
      selectLanguage: 'Select Your Language',
      selectLanguageDesc: 'Choose the language for your interview',
      english: 'English',
      spanish: 'Español',
      continue: 'Continue',
      back: 'Back',
      letsGetStarted: "Let's get started",
      enterDetails: 'Enter your details to begin the interview',
      firstName: 'First Name',
      lastName: 'Last Name',
      email: 'Email Address',
      beginInterview: 'Begin Interview',
      starting: 'Starting...',
      terms: 'By continuing, you agree to our Terms of Service and Privacy Policy',
    },
    es: {
      title: 'Preselección de Instaladores',
      subtitle: 'Complete su entrevista en solo unos minutos',
      feature1: 'Entrevista por Voz',
      feature1Desc: 'Simplemente hable sus respuestas naturalmente',
      feature2: 'Rápido y Fácil',
      feature2Desc: 'Toma aproximadamente 5-10 minutos',
      feature3: 'Resultados Instantáneos',
      feature3Desc: 'Obtenga retroalimentación inmediatamente',
      getStarted: 'Comenzar',
      selectLanguage: 'Seleccione su Idioma',
      selectLanguageDesc: 'Elija el idioma para su entrevista',
      english: 'English',
      spanish: 'Español',
      continue: 'Continuar',
      back: 'Atrás',
      letsGetStarted: 'Comencemos',
      enterDetails: 'Ingrese sus datos para comenzar la entrevista',
      firstName: 'Nombre',
      lastName: 'Apellido',
      email: 'Correo Electrónico',
      beginInterview: 'Comenzar Entrevista',
      starting: 'Iniciando...',
      terms: 'Al continuar, acepta nuestros Términos de Servicio y Política de Privacidad',
    },
  }

  const t = content[language]

  return (
    <div className="min-h-screen interview-gradient grid-pattern flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg"
      >
        <AnimatePresence mode="wait">
          {step === 'welcome' ? (
            <motion.div
              key="welcome"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="bg-white rounded-3xl shadow-xl shadow-primary-900/5 p-8 md:p-12"
            >
              {/* Logo/Header */}
              <div className="text-center mb-8">
                <div className="w-20 h-20 mx-auto mb-6">
                  <Image
                    src={logo}
                    alt="Logo"
                    width={80}
                    height={80}
                    className="w-full h-full object-contain"
                  />
                </div>
                <h1 className="text-2xl md:text-3xl font-bold text-primary-900 mb-2">
                  {t.title}
                </h1>
                <p className="text-primary-500">
                  {t.subtitle}
                </p>
              </div>

              {/* Features */}
              <div className="space-y-4 mb-8">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-success-50 text-success-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-primary-900">{t.feature1}</p>
                    <p className="text-sm text-primary-500">{t.feature1Desc}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-success-50 text-success-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-primary-900">{t.feature2}</p>
                    <p className="text-sm text-primary-500">{t.feature2Desc}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-success-50 text-success-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-primary-900">{t.feature3}</p>
                    <p className="text-sm text-primary-500">{t.feature3Desc}</p>
                  </div>
                </div>
              </div>

              {/* Start Button */}
              <button
                onClick={() => setStep('language')}
                className="w-full py-4 bg-brand-green text-white rounded-xl font-medium hover:bg-brand-green-dark transition-colors flex items-center justify-center gap-2"
              >
                {t.getStarted}
                <ArrowRight className="w-5 h-5" />
              </button>
            </motion.div>
          ) : step === 'language' ? (
            <motion.div
              key="language"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="bg-white rounded-3xl shadow-xl shadow-primary-900/5 p-8 md:p-12"
            >
              <button
                onClick={() => setStep('welcome')}
                className="text-primary-500 hover:text-primary-900 transition-colors mb-6 flex items-center gap-1"
              >
                <ArrowRight className="w-4 h-4 rotate-180" />
                {t.back}
              </button>

              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-brand-green/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Globe className="w-8 h-8 text-brand-green" />
                </div>
                <h2 className="text-2xl font-bold text-primary-900 mb-2">
                  {t.selectLanguage}
                </h2>
                <p className="text-primary-500">
                  {t.selectLanguageDesc}
                </p>
              </div>

              {/* Language Options */}
              <div className="space-y-3 mb-8">
                <button
                  onClick={() => setLanguage('en')}
                  className={`w-full p-4 rounded-xl border-2 transition-all flex items-center gap-4 ${
                    language === 'en'
                      ? 'border-brand-green bg-brand-green/5'
                      : 'border-primary-200 hover:border-primary-300'
                  }`}
                >
                  <span className="text-2xl">🇺🇸</span>
                  <div className="text-left">
                    <p className="font-medium text-primary-900">English</p>
                    <p className="text-sm text-primary-500">Interview in English</p>
                  </div>
                  {language === 'en' && (
                    <div className="ml-auto w-6 h-6 rounded-full bg-brand-green flex items-center justify-center">
                      <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                </button>

                <button
                  onClick={() => setLanguage('es')}
                  className={`w-full p-4 rounded-xl border-2 transition-all flex items-center gap-4 ${
                    language === 'es'
                      ? 'border-brand-green bg-brand-green/5'
                      : 'border-primary-200 hover:border-primary-300'
                  }`}
                >
                  <span className="text-2xl">🇪🇸</span>
                  <div className="text-left">
                    <p className="font-medium text-primary-900">Español</p>
                    <p className="text-sm text-primary-500">Entrevista en Español</p>
                  </div>
                  {language === 'es' && (
                    <div className="ml-auto w-6 h-6 rounded-full bg-brand-green flex items-center justify-center">
                      <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                </button>
              </div>

              <button
                onClick={() => setStep('email')}
                className="w-full py-4 bg-brand-green text-white rounded-xl font-medium hover:bg-brand-green-dark transition-colors flex items-center justify-center gap-2"
              >
                {t.continue}
                <ArrowRight className="w-5 h-5" />
              </button>
            </motion.div>
          ) : (
            <motion.div
              key="email"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="bg-white rounded-3xl shadow-xl shadow-primary-900/5 p-8 md:p-12"
            >
              <button
                onClick={() => setStep('language')}
                className="text-primary-500 hover:text-primary-900 transition-colors mb-6 flex items-center gap-1"
              >
                <ArrowRight className="w-4 h-4 rotate-180" />
                {t.back}
              </button>

              <h2 className="text-2xl font-bold text-primary-900 mb-2">
                {t.letsGetStarted}
              </h2>
              <p className="text-primary-500 mb-8">
                {t.enterDetails}
              </p>

              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  handleStartInterview()
                }}
                className="space-y-4"
              >
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-primary-700 mb-1">
                      {t.firstName}
                    </label>
                    <input
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder={language === 'es' ? 'Juan' : 'John'}
                      className="w-full px-4 py-3 rounded-xl border border-primary-200 focus:border-primary-900 focus:ring-0 outline-none transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-primary-700 mb-1">
                      {t.lastName}
                    </label>
                    <input
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder={language === 'es' ? 'García' : 'Smith'}
                      className="w-full px-4 py-3 rounded-xl border border-primary-200 focus:border-primary-900 focus:ring-0 outline-none transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-primary-700 mb-1">
                    {t.email} *
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={language === 'es' ? 'juan@ejemplo.com' : 'john@example.com'}
                    required
                    className="w-full px-4 py-3 rounded-xl border border-primary-200 focus:border-primary-900 focus:ring-0 outline-none transition-colors"
                  />
                </div>

                {error && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-danger-500 text-sm"
                  >
                    {error}
                  </motion.p>
                )}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-4 bg-brand-green text-white rounded-xl font-medium hover:bg-brand-green-dark transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      {t.starting}
                    </>
                  ) : (
                    <>
                      {t.beginInterview}
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </button>
              </form>

              <p className="text-xs text-primary-400 text-center mt-6">
                {t.terms}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}
