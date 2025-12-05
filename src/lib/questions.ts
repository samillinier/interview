// Interview questions configuration - client-safe file

export const INTERVIEW_QUESTIONS_EN = [
  {
    id: 'intro',
    text: "Hello! Thank you for your interest in joining our flooring installation team. I'm going to ask you a few questions to learn more about your experience and qualifications. Let's get started! First, could you please tell me your full name?",
    field: 'name',
    required: true,
  },
  {
    id: 'contact',
    text: "Great to meet you! What's the best phone number to reach you?",
    field: 'contact',
    required: true,
  },
  {
    id: 'experience',
    text: 'How many years of experience do you have in flooring installation?',
    field: 'yearsOfExperience',
    required: true,
  },
  {
    id: 'specialties',
    text: 'What types of flooring are you experienced with? For example: hardwood, laminate, vinyl, tile, carpet, or others.',
    field: 'flooringSpecialties',
    required: true,
  },
  {
    id: 'crew',
    text: 'Do you have your own crew or do you work independently? If you have a crew, how many people are on your team?',
    field: 'crew',
    required: true,
  },
  {
    id: 'tools',
    text: 'Do you have your own tools and equipment for flooring installation? Please briefly describe what you have.',
    field: 'tools',
    required: true,
  },
  {
    id: 'vehicle',
    text: 'Do you have a vehicle suitable for transporting materials and equipment to job sites?',
    field: 'hasVehicle',
    required: false,
  },
  {
    id: 'service_areas',
    text: 'What cities or areas are you able to service? Are you willing to travel for jobs?',
    field: 'serviceAreas',
    required: true,
  },
  {
    id: 'availability',
    text: 'Are you looking for full-time, part-time, or contract work? When would you be available to start?',
    field: 'availability',
    required: true,
  },
  {
    id: 'insurance',
    text: "Do you currently have liability insurance? If so, what type of coverage do you have?",
    field: 'insurance',
    required: true,
  },
  {
    id: 'license',
    text: 'Do you have any relevant licenses or certifications for flooring installation?',
    field: 'license',
    required: false,
  },
  {
    id: 'closing',
    text: "Thank you for sharing all that information! Is there anything else you'd like us to know about your experience or qualifications?",
    field: 'additionalInfo',
    required: false,
  },
]

export const INTERVIEW_QUESTIONS_ES = [
  {
    id: 'intro',
    text: "¡Hola! Gracias por su interés en unirse a nuestro equipo de instalación de pisos. Voy a hacerle algunas preguntas para conocer más sobre su experiencia y calificaciones. ¡Comencemos! Primero, ¿podría decirme su nombre completo?",
    field: 'name',
    required: true,
  },
  {
    id: 'contact',
    text: "¡Mucho gusto! ¿Cuál es el mejor número de teléfono para contactarlo?",
    field: 'contact',
    required: true,
  },
  {
    id: 'experience',
    text: '¿Cuántos años de experiencia tiene en instalación de pisos?',
    field: 'yearsOfExperience',
    required: true,
  },
  {
    id: 'specialties',
    text: '¿Con qué tipos de pisos tiene experiencia? Por ejemplo: madera dura, laminado, vinilo, azulejo, alfombra u otros.',
    field: 'flooringSpecialties',
    required: true,
  },
  {
    id: 'crew',
    text: '¿Tiene su propio equipo de trabajo o trabaja de forma independiente? Si tiene un equipo, ¿cuántas personas lo conforman?',
    field: 'crew',
    required: true,
  },
  {
    id: 'tools',
    text: '¿Tiene sus propias herramientas y equipo para la instalación de pisos? Por favor describa brevemente lo que tiene.',
    field: 'tools',
    required: true,
  },
  {
    id: 'vehicle',
    text: '¿Tiene un vehículo adecuado para transportar materiales y equipo a los sitios de trabajo?',
    field: 'hasVehicle',
    required: false,
  },
  {
    id: 'service_areas',
    text: '¿En qué ciudades o áreas puede trabajar? ¿Está dispuesto a viajar por trabajo?',
    field: 'serviceAreas',
    required: true,
  },
  {
    id: 'availability',
    text: '¿Busca trabajo de tiempo completo, medio tiempo o por contrato? ¿Cuándo estaría disponible para comenzar?',
    field: 'availability',
    required: true,
  },
  {
    id: 'insurance',
    text: "¿Actualmente tiene seguro de responsabilidad civil? Si es así, ¿qué tipo de cobertura tiene?",
    field: 'insurance',
    required: true,
  },
  {
    id: 'license',
    text: '¿Tiene alguna licencia o certificación relevante para la instalación de pisos?',
    field: 'license',
    required: false,
  },
  {
    id: 'closing',
    text: "¡Gracias por compartir toda esa información! ¿Hay algo más que le gustaría que supiéramos sobre su experiencia o calificaciones?",
    field: 'additionalInfo',
    required: false,
  },
]

// Helper function to get questions by language
export function getInterviewQuestions(language: 'en' | 'es' = 'en') {
  return language === 'es' ? INTERVIEW_QUESTIONS_ES : INTERVIEW_QUESTIONS_EN
}

// Default export for backwards compatibility
export const INTERVIEW_QUESTIONS = INTERVIEW_QUESTIONS_EN
