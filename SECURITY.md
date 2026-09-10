# Security und Privacy

Keine Provider-/Service-Role-Secrets im Client. EXPO_PUBLIC_ ist öffentlich. Supabase URL/Anon-Key sind öffentliche Konfiguration; Schutz entsteht durch Auth und getestete RLS. Auth-Tokens künftig in OS-geschütztem Speicher mit getesteter Migration. Kein Workout-/Body-/GPS-Payload in Fehlerlogs.

Referenzrisiken: globale lokale Stores über Kontowechsel, öffentlicher Coach ohne Auth/Limit, möglicher Client-Providerkey, unvollständige Löschfunktion. Siehe B04–B13 im Audit. Datenbankänderungen und externe Veröffentlichung nur kontrolliert; keine echten Kontodaten für Tests benutzen.

EU-Release: Verarbeitung und Rechtsgrundlage prüfen, Gesundheitsbezug/Art. 9 berücksichtigen, minimale Daten, transparente Coach-Übermittlung, Export/Löschung, Verträge und Drittlandtransfer. Keine behauptete rechtliche Freigabe. Quelle: https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX%3A32016R0679
