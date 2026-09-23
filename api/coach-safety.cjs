// EVARO AI Coach – Deterministic Safety Guardrails & Emergency Screen
// Protects athletes, prevents dangerous advice, and intercepts harmful queries before upstream LLM calls.
// Provides bilingual (DE / EN) safety notices for all emergency, medical, and security categories.

const SAFETY_RULES = [
  {
    id: 'EMERGENCY_CHEST_PAIN',
    category: 'emergency',
    pattern: /\b(brustschmerz\w*|stechen\w* (?:in der )?brust|druck auf der brust|herzrasen|herzschmerz\w*|chest pain|tightness in chest|heart pain|stabbing chest pain|crushing chest pain|angina)\b/i,
    reply:
      'WICHTIGER NOTFALL-HINWEIS: Akute Brustschmerzen, Engegefühl in der Brust oder Herzbeschwerden sind potenzielle medizinische Notfälle. Bitte brich jedes Training sofort ab und kontaktiere unverzüglich den Rettungsdienst (112 in der EU / 911 in den USA) oder einen Notarzt. Als Fitness-App kann EVARO keine medizinische Hilfe leisten.\n\nIMPORTANT EMERGENCY NOTICE: Acute chest pain, tightness in the chest, or cardiac discomfort are potential medical emergencies. Stop exercising immediately and contact emergency medical services (911 in the US / 112 in the EU) or a physician immediately. EVARO is a fitness app and cannot provide medical assistance.',
  },
  {
    id: 'EMERGENCY_DYSPNEA',
    category: 'emergency',
    pattern: /\b(atemnot\w*|akute atemnot|keine luft (?:mehr )?bekommen|kurzatmigkeit im ruhezustand|dyspnea|shortness of breath|difficulty breathing|gasping for air|can\'?t breathe|cannot breathe)\b/i,
    reply:
      'WICHTIGER NOTFALL-HINWEIS: Akute Atemnot oder das Gefühl, keine Luft mehr zu bekommen, sind potenzielle medizinische Notfälle. Bitte brich jedes Training sofort ab und wende dich unverzüglich an den Rettungsdienst (112 in der EU / 911 in den USA) oder einen Notarzt.\n\nIMPORTANT EMERGENCY NOTICE: Acute shortness of breath, dyspnea, or difficulty breathing are potential medical emergencies. Stop exercising immediately and contact emergency medical services (911 in the US / 112 in the EU) or a physician immediately.',
  },
  {
    id: 'EMERGENCY_UNCONSCIOUSNESS',
    category: 'emergency',
    pattern: /\b(ohnm[äa]chtig\w*|bewusstlos\w*|umgekippt|blackout|passed out|fainted|loss of consciousness|unconscious|blacked out)\b/i,
    reply:
      'WICHTIGER NOTFALL-HINWEIS: Bewusstlosigkeit oder Ohnmachtsanfälle beim oder nach dem Training müssen umgehend ärztlich abgeklärt werden. Trainiere keinesfalls weiter und begib dich in medizinische Behandlung.\n\nIMPORTANT EMERGENCY NOTICE: Loss of consciousness, fainting, or blacking out during or after exercise must be evaluated by a physician immediately. Do not continue training and seek immediate medical attention.',
  },
  {
    id: 'SEVERE_INJURY',
    category: 'medical',
    pattern: /\b(knochenbruch\w*|sehnenriss\w*|kreuzbandriss\w*|muskelabriss\w*|gelenk ausgekugelt|torn ligament|bone fracture|torn tendon|broken bone|muscle tear|dislocated joint|acl tear)\b/i,
    reply:
      'Bei Verdacht auf schwere Verletzungen wie Sehnenrisse, Bänderrisse oder Knochenbrüche darf kein Training fortgesetzt werden. Bitte wende dich umgehend an einen Arzt oder die Notaufnahme, um Folgeschäden zu vermeiden.\n\nIf a severe injury such as a torn tendon, ligament rupture, bone fracture, or joint dislocation is suspected, discontinue training immediately. Please consult a physician or visit an emergency room to avoid permanent damage.',
  },
  {
    id: 'DANGEROUS_NUTRITION_EXTREME',
    category: 'nutrition_safety',
    pattern: /\b(unter 500\s*kcal|under 500\s*(?:kcal|calories)|0\s*kalorien di[äa]t|0\s*calorie diet|starvation diet|extreme dry fast|dry fasting|wasserentzug|water deprivation|starving myself)\b/i,
    reply:
      'EVARO unterstützt keine extremen, gesundheitsgefährdenden Diäten wie Nulldiäten oder extreme Dehydrierungsphasen. Nachhaltiger Fettabbau und Muskelaufbau erfordern ein moderates Defizit (z. B. 300–500 kcal) bei ausreichender Nährstoff- und Wasserzufuhr.\n\nEVARO does not support extreme, hazardous diets such as zero-calorie starvation diets or extreme dehydration and dry fasting phases. Sustainable fat loss and muscle preservation require a moderate deficit (e.g. 300–500 kcal) with adequate nutrient and water intake.',
  },
  {
    id: 'STEROID_PED_REQUEST',
    category: 'substance_safety',
    pattern: /\b(testosteron[\s-]*(?:kur|dosierung|enantat)\w*|trenbolon\w*|sarm[\s-]*cycle|anabolika\w* kur|steroid cycle dosage|testosterone cycle dosage|trenbolone dosage|sarms stack dosage|how much anavar|dbol dose)\b/i,
    reply:
      'Als evidenzbasierter Fitness-Coach gibt EVARO keinerlei Dosierungsempfehlungen oder Anleitungen zur Einnahme von anabolen Steroiden, SARMs oder verschreibungspflichtigen Dopingmitteln. Für deine Gesundheit und langfristige Progression konzentrieren wir uns auf evidenzbasiertes, natürliches Training und optimierte Ernährung.\n\nAs an evidence-based fitness coach, EVARO does not provide dosage advice or instructions for anabolic steroids, SARMs, or prescription performance-enhancing drugs. For your long-term health and progression, we focus exclusively on natural training and evidence-based nutrition.',
  },
  {
    id: 'MEDICAL_DIAGNOSIS_REQUEST',
    category: 'medical',
    pattern: /\b(welche krankheit habe ich|diagnostiziere\w*|diagnose my illness|was fehlt mir medizinisch|what disease do i have|diagnose me|medical diagnosis|do i have cancer)\b/i,
    reply:
      'Als digitaler Fitness-Coach kann und darf EVARO keine medizinischen Diagnosen stellen oder Krankheiten beurteilen. Bitte wende dich bei gesundheitlichen Beschwerden oder unklaren Symptomen an einen qualifizierten Facharzt.\n\nAs a digital fitness coach, EVARO cannot and does not provide medical diagnoses or evaluate medical conditions. Please consult a qualified healthcare professional for symptoms or health concerns.',
  },
  {
    id: 'PROMPT_INJECTION_SYSTEM_LEAK',
    category: 'system_security',
    pattern: /\b(ignore all previous instructions|disregard (?:all )?previous guidelines|override system (?:prompt|rules)|reveal (?:your )?system prompt|systemanweisungen\w* (?:an)?zeigen|systemanweisungen\w* ausgeben|print internal instructions|show system prompt|what are your system instructions|vergiss deine instruktionen|ignoriere alle vorherigen anweisungen)\b/i,
    reply:
      'EVARO Coach konzentriert sich ausschließlich auf dein Krafttraining, deine Progression und deine Fitnessziele. Interne Systemanweisungen und Prompts werden nicht ausgegeben.\n\nEVARO Coach focuses exclusively on your strength training, progression, and fitness goals. Internal system instructions and developer prompts are confidential and cannot be revealed.',
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
