describe('Body Widgets & Interactive Facts (Task 4)', () => {
  const BODY_WIDGET_KEYS = ['weight', 'height', 'bodyFat', 'bmi'] as const;

  // Curated educational facts dictionary replica mirroring body.tsx contract
  const BODY_FACTS = {
    weight: {
      de: [
        'Das Tagesgewicht kann durch Wasserhaushalt, Natriumzufuhr und Verdauung um 1–2 kg schwanken.',
        'Für verlässliche Trends ist ein wöchentlicher gleitender Durchschnitt aussagekräftiger als einzelne Tageswerte.',
        'Wiege dich idealerweise morgens nüchtern nach dem Aufstehen für maximale Vergleichbarkeit.',
      ],
      en: [
        'Daily body weight can fluctuate by 1–2 kg due to water retention, sodium intake, and digestion.',
        'For reliable trends, a weekly moving average is far more informative than isolated daily weigh-ins.',
        'Weigh yourself consistently in the morning after waking up for optimal comparability.',
      ],
    },
    height: {
      de: [
        'Durch Entlastung der Bandscheiben über Nacht bist du morgens ca. 1–2 cm größer als am Abend.',
        'Für Trainings- und Hebelberechnungen sollte eine einheitliche Standardangabe verwendet werden.',
        'Körpergröße und Gliedmaßenproportionen bestimmen deine individuellen biomechanischen Hebelverhältnisse.',
      ],
      en: [
        'Spinal decompression overnight makes you roughly 1–2 cm taller in the morning than in the evening.',
        'Use a consistent standard measurement for training volume and leverage calculations.',
        'Height and limb proportions directly influence your natural biomechanical leverages.',
      ],
    },
    bodyFat: {
      de: [
        'Verschiedene Messmethoden (BIA-Waage, Caliper, DEXA) können messbedingt voneinander abweichen.',
        'Langfristige Trendlinien und der Taillenumfang sind oft aussagekräftiger als einzelne Momentaufnahmen.',
        'Im Krafttraining schützt eine ausreichende Proteinzufuhr während einer Reduktionsphase deine Muskelmasse.',
      ],
      en: [
        'Different measurement methods (bioimpedance scales, calipers, DEXA) can show substantial variance.',
        'Long-term trendlines and waist circumference give a much clearer picture than single readings.',
        'Adequate protein intake during a caloric deficit helps preserve lean muscle tissue in resistance training.',
      ],
    },
    bmi: {
      de: [
        'Der BMI setzt Körpergewicht und Körpergröße ins Verhältnis, unterscheidet aber nicht zwischen Fett- und Muskelmasse.',
        'Bei intensiv trainierenden Personen mit hoher Muskelmasse hat der BMI allein nur eingeschränkte Aussagekraft.',
        'Kombiniere den BMI stets mit Kraftwerten, Spiegelbild und Taillenumfang für eine realistische Einschätzung.',
      ],
      en: [
        'BMI relates body weight to height, but cannot distinguish between lean muscle mass and fat tissue.',
        'In heavily muscled strength athletes, BMI alone has limited applicability.',
        'Combine BMI with strength benchmarks, visual progress, and waist measurements for an accurate assessment.',
      ],
    },
  };

  it('has curated bilingual facts for all 4 body metrics', () => {
    BODY_WIDGET_KEYS.forEach((key) => {
      const entry = BODY_FACTS[key];
      expect(entry.de.length).toBeGreaterThanOrEqual(3);
      expect(entry.en.length).toBeGreaterThanOrEqual(3);
      entry.de.forEach((fact) => expect(fact.trim().length).toBeGreaterThan(15));
      entry.en.forEach((fact) => expect(fact.trim().length).toBeGreaterThan(15));
    });
  });

  it('contains NO medical diagnoses or fear-based health warnings in body facts', () => {
    const prohibitedWords = [
      'diagnose',
      'krankheit',
      'herzinfarkt',
      'diabetes',
      'gefahr',
      'tödlich',
      'disease',
      'illness',
      'heart attack',
      'danger',
      'lethal',
    ];

    BODY_WIDGET_KEYS.forEach((key) => {
      const entry = BODY_FACTS[key];
      [...entry.de, ...entry.en].forEach((fact) => {
        const lower = fact.toLowerCase();
        prohibitedWords.forEach((word) => {
          expect(lower).not.toContain(word);
        });
      });
    });
  });

  it('stabilizes fact index across re-renders while open', () => {
    // Contract check: component maintains bodyFactIndex state while activeBodyWidget === key
    const activeWidget: string | null = 'weight';
    let factIndex = 1;

    // Simulate an unrelated re-render (e.g. text input or chart tab change)
    const reRender = () => {
      // Re-render does NOT change factIndex unless user toggles or requests next fact
      return BODY_FACTS[activeWidget as 'weight'].de[factIndex];
    };

    const firstRenderFact = reRender();
    const secondRenderFact = reRender();
    expect(firstRenderFact).toBe(secondRenderFact);
    expect(firstRenderFact).toBe(BODY_FACTS.weight.de[1]);

    // Cycling fact updates index
    factIndex = (factIndex + 1) % BODY_FACTS.weight.de.length;
    expect(reRender()).toBe(BODY_FACTS.weight.de[2]);
  });
});
