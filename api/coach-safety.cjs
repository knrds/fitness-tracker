// EVARO AI Coach – Deterministic Safety Guardrails & Emergency Screen
// Protects athletes, prevents dangerous advice, and intercepts harmful queries before upstream LLM calls.

const SAFETY_RULES = [
  {
    id: 'EMERGENCY_CHEST_PAIN',
    category: 'emergency',
    pattern: /\b(brustschmerz\w*|stechen\w* (?:in der )?brust|druck auf der brust|herzrasen|herzschmerz\w*|chest pain|tightness in chest|heart pain)\b/i,
    reply:
      'WICHTIGER NOTFALL-HINWEIS: Akute Brustschmerzen, Engegefühl in der Brust oder Herzbeschwerden sind potenzielle medizinische Notfälle. Bitte brich jedes Training sofort ab und kontaktiere unverzüglich den Rettungsdienst (112 in der EU / 911 in den USA) oder einen Notarzt. Als Fitness-App kann EVARO keine medizinische Hilfe leisten.',
  },
  {
    id: 'EMERGENCY_UNCONSCIOUSNESS',
    category: 'emergency',
    pattern: /\b(ohnm[äa]chtig\w*|bewusstlos\w*|umgekippt|blackout|passed out|fainted|loss of consciousness)\b/i,
    reply:
      'WICHTIGER NOTFALL-HINWEIS: Bewusstlosigkeit oder Ohnmachtsanfälle beim oder nach dem Training müssen umgehend ärztlich abgeklärt werden. Trainiere keinesfalls weiter und begib dich in medizinische Behandlung.',
  },
  {
    id: 'SEVERE_INJURY',
    category: 'medical',
    pattern: /\b(knochenbruch\w*|sehnenriss\w*|kreuzbandriss\w*|muskelabriss\w*|gelenk ausgekugelt|torn ligament|bone fracture|torn tendon)\b/i,
    reply:
      'Bei Verdacht auf schwere Verletzungen wie Sehnenrisse, Bänderrisse oder Knochenbrüche darf kein Training fortgesetzt werden. Bitte wende dich umgehend an einen Arzt oder die Notaufnahme, um Folgeschäden zu vermeiden.',
  },
  {
    id: 'DANGEROUS_NUTRITION_EXTREME',
    category: 'nutrition_safety',
    pattern: /\b(unter 500\s*kcal|0\s*kalorien di[äa]t|extreme dry fast|dry fasting 3 days|wasserentzug 3 tage)\b/i,
    reply:
      'EVARO unterstützt keine extremen, gesundheitsgefährdenden Diäten wie Nulldiäten oder extreme Dehydrierungsphasen. Nachhaltiger Fettabbau und Muskelaufbau erfordern ein moderates Defizit (z. B. 300–500 kcal) bei ausreichender Nährstoff- und Wasserzufuhr.',
  },
  {
    id: 'STEROID_PED_REQUEST',
    category: 'substance_safety',
    pattern: /\b(testosteron[\s-]*(?:kur|dosierung|enantat)\w*|trenbolon\w*|sarm[\s-]*cycle|anabolika\w* kur|steroid cycle dosage)\b/i,
    reply:
      'Als evidenzbasierter Fitness-Coach gibt EVARO keinerlei Dosierungsempfehlungen oder Anleitungen zur Einnahme von anabolen Steroiden, SARMs oder verschreibungspflichtigen Dopingmitteln. Für deine Gesundheit und langfristige Progression konzentrieren wir uns auf evidenzbasiertes, natürliches Training und optimierte Ernährung.',
  },
  {
    id: 'MEDICAL_DIAGNOSIS_REQUEST',
    category: 'medical',
    pattern: /\b(welche krankheit habe ich|diagnostiziere\w*|diagnose my illness|was fehlt mir medizinisch)\b/i,
    reply:
      'Als digitaler Fitness-Coach kann und darf EVARO keine medizinischen Diagnosen stellen oder Krankheiten beurteilen. Bitte wende dich bei gesundheitlichen Beschwerden oder unklaren Symptomen an einen qualifizierten Facharzt.',
  },
  {
    id: 'PROMPT_INJECTION_SYSTEM_LEAK',
    category: 'system_security',
    pattern: /\b(ignore all previous instructions|reveal (?:your )?system prompt|systemanweisungen\w* (?:an)?zeigen|systemanweisungen\w* ausgeben|print internal instructions)\b/i,
    reply:
      'EVARO Coach konzentriert sich ausschließlich auf dein Krafttraining, deine Progression und deine Fitnessziele. Interne Systemanweisungen und Prompts werden nicht ausgegeben.',
  },
];

/**
 * Screens user input for emergency medical conditions, severe injuries, illegal substances,
 * or prompt exfiltration attempts.
 *
 * @param {string} text - User message content
 * @returns {{ isBlocked: boolean, ruleId?: string, category?: string, reply?: string }}
 */
function screenCoachSafety(text) {
  if (typeof text !== 'string' || !text.trim()) {
    return { isBlocked: false };
  }

  for (const rule of SAFETY_RULES) {
    if (rule.pattern.test(text)) {
      return {
        isBlocked: true,
        ruleId: rule.id,
        category: rule.category,
        reply: rule.reply,
      };
    }
  }

  return { isBlocked: false };
}

module.exports = {
  screenCoachSafety,
  SAFETY_RULES,
};
