// Interview questions configuration - client-safe file

export const INTERVIEW_QUESTIONS_EN = [
  {
    id: 'intro',
    text: "Hello, I'm Anna from Floor Interior Service. Thank you for your interest in becoming an installer with us. I'll be conducting a brief qualification screening to learn about your experience, certifications, equipment, installation capabilities, and availability. This will take just a few minutes. Let's begin with your first and last name.",
    field: 'name',
    required: true,
  },
  {
    id: 'contact',
    text: "Thank you. What is the best phone number where we can reach you for follow-up communications?",
    field: 'contact',
    required: true,
  },
  {
    id: 'experience',
    text: 'How many years of professional experience do you have in flooring installation?',
    field: 'yearsOfExperience',
    required: true,
  },
  {
    id: 'skills',
    text: 'Which flooring types are you skilled in installing? Please indicate all that apply: Carpet, Vinyl Sheet Roll, LVP (Luxury Vinyl Plank), LVT (Luxury Vinyl Tile), VCT (Vinyl Composition Tile), Hardwood, Engineered Hardwood, Bamboo, Laminate, Ceramic Tile, Porcelain Tile, Stone Tile, or Carpet Tile.',
    field: 'flooringSkills',
    required: true,
    type: 'flooring_skills', // Special type for interactive UI
  },
  {
    id: 'general_liability',
    text: 'Do you currently carry General Liability Insurance coverage for your business operations?',
    field: 'hasGeneralLiability',
    required: true,
  },
  {
    id: 'auto_liability',
    text: 'Do you maintain Commercial Auto Liability Insurance for vehicles used in your business?',
    field: 'hasAutoLiability',
    required: true,
  },
  {
    id: 'workers_comp',
    text: "Do you have Worker's Compensation Insurance coverage?",
    field: 'hasWorkersComp',
    required: true,
  },
  {
    id: 'crew',
    text: 'Do you work with a crew or helper?',
    field: 'hasCrew',
    required: true,
  },
  {
    id: 'crew_size',
    text: 'How many team members do you typically employ?',
    field: 'crewSize',
    required: false,
  },
  {
    id: 'workers_comp_exemption',
    text: "If you work independently without employees, do you have a Worker's Compensation Exemption on file?",
    field: 'hasWorkersCompExemption',
    required: true,
  },
  {
    id: 'sunbiz_registered',
    text: 'Is your business currently registered with the Florida Department of State through SunBiz?',
    field: 'isSunbizRegistered',
    required: true,
  },
  {
    id: 'sunbiz_active',
    text: 'Is your SunBiz business registration currently in active status?',
    field: 'isSunbizActive',
    required: true,
  },
  {
    id: 'business_license',
    text: 'Do you possess a valid Business Tax Receipt, also known as a Business License, for your operating jurisdiction?',
    field: 'hasBusinessLicense',
    required: true,
  },
  {
    id: 'background_check',
    text: 'Are you able to successfully pass a comprehensive background check?',
    field: 'canPassBackgroundCheck',
    required: true,
  },
  {
    id: 'background_details',
    text: 'If you answered no or maybe to the background check question, please provide details including the nature of the matter, location, and year of occurrence.',
    field: 'backgroundCheckDetails',
    required: false,
  },
  {
    id: 'vehicle',
    text: 'What type of vehicle do you use to transport materials and equipment to job sites? Please describe the make, model, and cargo capacity.',
    field: 'vehicleDescription',
    required: true,
  },
  {
    id: 'work_schedule',
    text: 'Regarding your work schedule, are you available to work Monday through Friday on a regular basis?',
    field: 'availableMondayToFriday',
    required: true,
  },
  {
    id: 'saturday_availability',
    text: 'Are you available to work on Saturdays? If so, please indicate your typical Saturday availability.',
    field: 'saturdayAvailability',
    required: true,
  },
  {
    id: 'open_to_travel',
    text: 'Are you open to traveling for work assignments in different locations?',
    field: 'openToTravel',
    required: true,
  },
  {
    id: 'travel_locations',
    text: 'Which of the following locations would you be willing to travel to for work? Please indicate all that apply: Albany, Dothan, Gainesville, Lakeland, Naples, Panama City, Sarasota, Tallahassee, Tampa, or Wildwood.',
    field: 'travelLocations',
    required: false,
    type: 'travel_availability', // Special type for interactive UI
  },
  {
    id: 'closing',
    text: "Thank you for completing this qualification screening. We appreciate your time and interest in partnering with Floor Interior Service. Our team will review your responses and contact you regarding next steps. Is there anything else you would like to add about your qualifications?",
    field: 'additionalInfo',
    required: false,
  },
]

export const INTERVIEW_QUESTIONS_ES = [
  {
    id: 'intro',
    text: "Hola, soy Anna de Floor Interior Service. Gracias por su interés en convertirse en instalador con nosotros. Realizaré una breve evaluación de calificación para conocer su experiencia, certificaciones, equipo, capacidades de instalación y disponibilidad. Esto tomará solo unos minutos. Comencemos con su nombre y apellido.",
    field: 'name',
    required: true,
  },
  {
    id: 'contact',
    text: "Gracias. ¿Cuál es el mejor número de teléfono donde podemos contactarlo para comunicaciones de seguimiento?",
    field: 'contact',
    required: true,
  },
  {
    id: 'experience',
    text: '¿Cuántos años de experiencia profesional tiene en instalación de pisos?',
    field: 'yearsOfExperience',
    required: true,
  },
  {
    id: 'skills',
    text: '¿En qué tipos de pisos tiene habilidad para instalar? Por favor indique todos los que apliquen: Alfombra, Rollo de Vinilo, LVP (Tablón de Vinilo de Lujo), LVT (Loseta de Vinilo de Lujo), VCT (Loseta de Composición de Vinilo), Madera Dura, Madera de Ingeniería, Bambú, Laminado, Azulejo Cerámico, Azulejo de Porcelana, Azulejo de Piedra, o Loseta de Alfombra.',
    field: 'flooringSkills',
    required: true,
    type: 'flooring_skills',
  },
  {
    id: 'general_liability',
    text: '¿Actualmente tiene cobertura de Seguro de Responsabilidad Civil General para sus operaciones comerciales?',
    field: 'hasGeneralLiability',
    required: true,
  },
  {
    id: 'auto_liability',
    text: '¿Mantiene Seguro de Responsabilidad de Auto Comercial para los vehículos utilizados en su negocio?',
    field: 'hasAutoLiability',
    required: true,
  },
  {
    id: 'workers_comp',
    text: "¿Tiene cobertura de Seguro de Compensación para Trabajadores?",
    field: 'hasWorkersComp',
    required: true,
  },
  {
    id: 'crew',
    text: '¿Trabaja con un equipo o ayudante?',
    field: 'hasCrew',
    required: true,
  },
  {
    id: 'crew_size',
    text: '¿Cuántos miembros del equipo emplea normalmente?',
    field: 'crewSize',
    required: false,
  },
  {
    id: 'workers_comp_exemption',
    text: "Si trabaja de forma independiente sin empleados, ¿tiene una Exención de Compensación para Trabajadores archivada?",
    field: 'hasWorkersCompExemption',
    required: true,
  },
  {
    id: 'sunbiz_registered',
    text: '¿Su negocio está actualmente registrado en el Departamento de Estado de Florida a través de SunBiz?',
    field: 'isSunbizRegistered',
    required: true,
  },
  {
    id: 'sunbiz_active',
    text: '¿El registro de su negocio en SunBiz está actualmente en estado activo?',
    field: 'isSunbizActive',
    required: true,
  },
  {
    id: 'business_license',
    text: '¿Posee un Recibo de Impuesto Comercial válido, también conocido como Licencia Comercial, para su jurisdicción de operación?',
    field: 'hasBusinessLicense',
    required: true,
  },
  {
    id: 'background_check',
    text: '¿Puede pasar exitosamente una verificación de antecedentes completa?',
    field: 'canPassBackgroundCheck',
    required: true,
  },
  {
    id: 'background_details',
    text: 'Si respondió no o tal vez a la pregunta de verificación de antecedentes, proporcione detalles incluyendo la naturaleza del asunto, ubicación y año de ocurrencia.',
    field: 'backgroundCheckDetails',
    required: false,
  },
  {
    id: 'vehicle',
    text: '¿Qué tipo de vehículo utiliza para transportar materiales y equipos a los sitios de trabajo? Por favor describa la marca, modelo y capacidad de carga.',
    field: 'vehicleDescription',
    required: true,
  },
  {
    id: 'work_schedule',
    text: 'Con respecto a su horario de trabajo, ¿está disponible para trabajar de lunes a viernes de manera regular?',
    field: 'availableMondayToFriday',
    required: true,
  },
  {
    id: 'saturday_availability',
    text: '¿Está disponible para trabajar los sábados? Si es así, por favor indique su disponibilidad típica los sábados.',
    field: 'saturdayAvailability',
    required: true,
  },
  {
    id: 'open_to_travel',
    text: '¿Está dispuesto a viajar para trabajos en diferentes ubicaciones?',
    field: 'openToTravel',
    required: true,
  },
  {
    id: 'travel_locations',
    text: '¿A cuáles de las siguientes ubicaciones estaría dispuesto a viajar para trabajar? Por favor indique todas las que apliquen: Albany, Dothan, Gainesville, Lakeland, Naples, Panama City, Sarasota, Tallahassee, Tampa, o Wildwood.',
    field: 'travelLocations',
    required: false,
    type: 'travel_availability', // Special type for interactive UI
  },
  {
    id: 'closing',
    text: "Gracias por completar esta evaluación de calificación. Apreciamos su tiempo e interés en asociarse con Floor Interior Service. Nuestro equipo revisará sus respuestas y se comunicará con usted sobre los próximos pasos. ¿Hay algo más que le gustaría agregar sobre sus calificaciones?",
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
