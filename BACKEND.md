# Backend

Referenz: Supabase JS in apps/mobile/src/utils/supabase.ts; Tabellen/RLS in docs/schema.sql; Sync-Mapping im syncStore; CommonJS-Coach-Proxy in api/coach-chat.js. Keine produktive Supabase-Verbindung im Audit verwendet. Das Schema wurde nicht auf ein externes Projekt angewendet.

Vor Cloud-Freigabe: versionierte Migrationen, Übungsseed passend zu deterministischen IDs, nullable SQL-Felder normalisieren, echte RLS-Tests. Verschachtelte Session/Template/Programm-Schreibvorgänge brauchen eine Transaktion/RPC. Authentifizierte Requests mit Operation-ID und Revision quittieren. Backend-Fehler niemals als erfolgreichen Sync melden.

Coach: Providerkey nur serverseitig, JWT prüfen, Nutzerkontingent/Rate-Limit, Timeout und Payloadgrenze. Benutzer dürfen keine system-Nachrichten injizieren. OpenRouter/Modellwahl ist Serverkonfiguration. Kein automatisches Deployment im bisherigen Stand.
