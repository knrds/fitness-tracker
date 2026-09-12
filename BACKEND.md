# Backend

Coach-Verhalten: Der Server-Systemauftrag beschränkt Antworten auf Training, Technik, Programmierung, Erholung, trainingsbezogene Ernährung und die eigenen Logs. Standardziel: 2–4 kurze Sätze bzw. höchstens 3 kurze Punkte, in der Nutzersprache; fachfremde Anfragen zurückweisen. Das ist ein Modellauftrag, keine deterministische Inhaltsklassifikation. Reale Tests nach Server-Neustart mit deepseek/deepseek-v4-flash haben Trainingsantwort und fachfremde Zurückweisung bestätigt. Modell/Guthaben bleiben externe Abhängigkeiten; .env-Änderungen mit Neustart von pnpm dev bzw. pnpm coach:local laden.

Aktualisierung 12.09.2026: Konfiguriertes deepseek/deepseek-v4-flash wurde real aufgerufen. Anfangs kam HTTP 402 wegen fehlendem Guthaben/Schlüssellimit; dieser Fehler wird nun als PROVIDER_CREDITS/402 statt pauschal 502 angezeigt. Späterer Browseraufruf: HTTP 200 mit korrekter metrischer Profileinheit. pnpm coach:check und der lokale Start prüfen Schlüssel/Modell read-only. Sie können das gesamte Account-Guthaben nicht garantieren, da die Credits-Verwaltung einen Management-Key erfordert. Kein Management-Key nötig oder angefordert. Wiederholen im Coach dupliziert die Frage nicht.

## Coach am 12.09.2026

Lokaler Browserbetrieb mit OpenRouter: api/.env.example nach .env.coach.local im Repository kopieren, OPENROUTER_API_KEY und OPENROUTER_MODEL setzen. Datei ist ignoriert. pnpm dev baut die Vorschau und startet App/API auf Port 8081. pnpm coach:local nutzt einen vorhandenen Export auf Port 8096. Nach Konfigurationsänderungen Server neu starten. Keine Providersecrets in Expo-Variablen.

Der lokale Server bindet nur 127.0.0.1, prüft Host/Origin und setzt eine interne lokale Identität. Nicht vom iPhone erreichbar, nicht öffentlich exponieren. Ein HTTP-Header kann den lokalen Modus nicht aktivieren.

Der öffentliche CommonJS-Handler verlangt eine über Supabase Auth geprüfte, nicht-anonyme Session und serverseitig SUPABASE_URL/SUPABASE_ANON_KEY. COACH_ALLOWED_ORIGINS erlaubt eine kommagetrennte Liste. Native Clients brauchen EXPO_PUBLIC_COACH_CHAT_ENDPOINT mit einer bereitgestellten HTTPS-URL. Die Datei stellt keine Supabase Edge Function bereit.

Vertrag: POST mit 1–10 user/assistant-Nachrichten, jeweils maximal 4000 Zeichen, zuletzt user, und context-Objekt; maximal 20 KB. Antwort {reply, model}. Serverseitiges Modell, 25 s Timeout, 10 Anfragen pro Nutzer/Minute im Prozess. Verteilte Limits/Quoten und reale Account-/Providerabnahme fehlen. Vollständige Antwort statt SSE. Fehler werden angezeigt, nicht als KI-Nachrichten gespeichert.

Kein echter Provideraufruf nachgewiesen: Schlüssel/Modell fehlen lokal. Browserpfad bis zur tatsächlichen API-Antwort 503 geprüft; Providervertrag mit isolierten Testantworten. Referenzen: https://openrouter.ai/docs/api_reference/overview und https://supabase.com/docs/reference/javascript/auth-getuser.

Referenz: Supabase JS in apps/mobile/src/utils/supabase.ts; Tabellen/RLS in docs/schema.sql; Sync-Mapping im syncStore; CommonJS-Coach-Proxy in api/coach-chat.js. Keine produktive Supabase-Verbindung im Audit verwendet. Das Schema wurde nicht auf ein externes Projekt angewendet.

Vor Cloud-Freigabe: versionierte Migrationen, Übungsseed passend zu deterministischen IDs, nullable SQL-Felder normalisieren, echte RLS-Tests. Verschachtelte Session/Template/Programm-Schreibvorgänge brauchen eine Transaktion/RPC. Authentifizierte Requests mit Operation-ID und Revision quittieren. Backend-Fehler niemals als erfolgreichen Sync melden.

Coach: Providerkey nur serverseitig, JWT prüfen, Nutzerkontingent/Rate-Limit, Timeout und Payloadgrenze. Benutzer dürfen keine system-Nachrichten injizieren. OpenRouter/Modellwahl ist Serverkonfiguration. Kein automatisches Deployment im bisherigen Stand.

11.09.2026: Pulls filtern explizit nach Besitzer und verwerfen anders zugeordnete Antworten. Generation-Checks stoppen Folge-Requests und lokale Änderungen nach einem Kontowechsel. Das ersetzt keine serverseitige Transaktion/RLS-Abnahme; NULL-Mapping, Fehlerauswertung, Dirty-Konflikte und Pagination sind weiterhin offen.
