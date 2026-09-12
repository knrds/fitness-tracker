# Backend

## Lokaler Coach – Stand 13.09.2026

Die ignorierte Datei .env.coach.local enthält ausschließlich serverseitig OPENROUTER_API_KEY und OPENROUTER_MODEL. pnpm dev erstellt einen aktuellen Webexport und startet App/API auf localhost:8081; nach Quelltext- oder Environment-Änderungen neu starten. pnpm coach:local verwendet den vorhandenen Webexport auf Port 8096. api/.env.example dokumentiert die Konfiguration ohne Schlüsselwerte.

Text verwendet das konfigurierte Modell, aktuell deepseek/deepseek-v4-flash. Dieses Modell unterstützt nur Text. Bilder verwenden OPENROUTER_VISION_MODEL (Standard google/gemini-2.5-flash), Sprachtranskription OPENROUTER_TRANSCRIPTION_MODEL (Standard openai/whisper-large-v3), jeweils über denselben OpenRouter-Schlüssel. Die beiden Standards wurden real erfolgreich aufgerufen. Kein zusätzlicher Schlüssel im Client nötig.

Der lokale Server bindet nur 127.0.0.1 und prüft Host/Origin. Er setzt die lokale Identität als interne Request-Eigenschaft; ein Clientheader kann sie nicht nachbilden. Diese Vorschau ist vom iPhone nicht erreichbar. Native Apps brauchen EXPO_PUBLIC_COACH_CHAT_ENDPOINT mit einer bereitgestellten HTTPS-URL. Der öffentliche CommonJS-Handler prüft eine nicht-anonyme Supabase-Session mittels SUPABASE_URL und SUPABASE_ANON_KEY. Es wurde kein öffentliches Backend bereitgestellt; die Datei ist keine Supabase Edge Function.

## Vertrag und Grenzen

POST /api/coach-chat: 1–10 user/assistant-Nachrichten, zuletzt user, höchstens 50.000 Zeichen pro Nachricht (inklusive strukturierter Planhistorie), context-Objekt; maximal 8,5 MB Request. Optional ein Bild als JPEG/PNG/WebP-data-URL bis 5,5 Mio. Zeichen oder audio:{data,format} bis 8 Mio. Base64-Zeichen. Fremde Bild-URLs sind nicht zugelassen. Client begrenzt Fragen auf 4000 Zeichen und Aufnahmen auf 60 Sekunden. EXPO_PUBLIC-Konfiguration enthält niemals den OpenRouter-Key.

Antwort: {reply,model}, optional plan, sources und researchCheckedAt. Audio liefert den Transkripttext in reply. Der Client fügt ihn nur ins bearbeitbare Eingabefeld ein. Bilder werden nicht dauerhaft im Chat gespeichert und beim erfolgreichen Senden aus dem Arbeitsspeicher entfernt; nach einem Fehler bleiben sie für Retry verfügbar. Aufnahme-Dateien werden nach Verwendung freigegeben.

Normalantworten haben 1800 Tokens Budget; strukturierte Pläne 5000. Ein zweiter Versuch erhält höchstens 8000 Tokens. Reasoning ist deaktiviert. Maximal zwei Provideraufrufe pro Request, gemeinsamer 65-s-Servertimeout, 75-s-Clienttimeout. Ein length-Abbruch wird nie als vollständige Antwort dargestellt. Provider-5xx, leere oder ungültige Ausgaben erhalten einen begrenzten Wiederholungsversuch. Guthaben-, Auth- und Modellfehler bleiben unterscheidbar. Rate-Limit: zehn Requests pro Nutzer/Minute im Prozess; verteilte Limits, Gesamtkostenquoten und öffentliche Abuse-Abnahme fehlen.

Planmodus bei expliziter Erstellung oder createPlan:true: striktes JSON-Schema, kompakte Katalogschlüssel, serverseitige Rückübersetzung in echte Übungs-UUIDs und Bereichsprüfung. Unbekannte Übungen und unvollständige Pläne werden abgelehnt. Der Coach schlägt nur vor; erst der Speicherknopf erstellt ein inaktives, editierbares Ein-Wochen-Programm und Templates für alle Tage. Aktive Workouts werden nicht verändert. Wiederholtes Speichern erzeugt keine Duplikate. SQLite speichert Programm, Templates, Outbox und Chatmarkierung atomar. Web-KV hat weiterhin keine gleichwertige Mehrfachspeicher-Transaktion.

Hypertrophie-/Studienfragen und Planerstellung erhalten einen aktuellen Abstract-Ausschnitt über Europe PMC, bei Ausfall direkt über PubMed E-utilities. Feste Suchbegriffe enthalten keine persönlichen Nutzerdaten. Sechs Stunden Cache; bei Ausfall aller Quellen darf der Coach keine aktuelle Literaturprüfung behaupten. Abstracts sind Daten, keine Instruktionen. Das ist keine vollständige Evidenzrecherche oder Garantie optimaler Ergebnisse. Fachfremde Fragen werden auf Training zurückgeführt; Standardantworten bleiben kurz.

Reale Nachweise: DeepSeek-Vier-Tage-Plan, Gemini-Bildplan und Whisper-Transkription mit HTTP 200; Backend-Schemafehler/Abbruch/Retries zusätzlich isoliert geprüft. Schlüssel-Preflight bestätigt Modell und Auth, nicht das vollständige Account-Guthaben. HTTP 402 erfordert weiterhin ausreichendes Guthaben bzw. Schlüssellimit.

## Weitere Backend-Arbeit

Supabase-Schema/RLS unter docs/schema.sql wurde nicht auf ein externes Projekt angewendet. Vor Freigabe fehlen versionierte Migrationen, passende Übungsseeds, NULL-DTOs, reale RLS-Prüfungen, atomare Cloud-RPCs, Revisionen/Tombstones und verteilte Quoten. Host-Laufzeit und Requestgrößen für Medien müssen beim Deployment explizit passend eingestellt werden.

Quellen: [OpenRouter Reasoning](https://openrouter.ai/docs/guides/best-practices/reasoning-tokens), [Bildinputs](https://openrouter.ai/docs/guides/overview/multimodal/image-understanding), [Transkription](https://openrouter.ai/docs/guides/overview/multimodal/stt), [Europe PMC API](https://europepmc.org/RestfulWebService), [Supabase Auth](https://supabase.com/docs/reference/javascript/auth-getuser).
