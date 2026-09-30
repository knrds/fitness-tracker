# Security, Privacy und Release-Regeln

Dieser Vertrag ersetzt die früheren Guardrails. Priorität: Datenintegrität → Autorisierung/Sicherheit → Datenschutz → korrekte Berechtigungen/Abrechnung → native Stabilität → Performance → UI. Keine gesetzliche oder technische Freigabe aus einem Dokumenttitel ableiten.

## Verbindliche Engineering-Regeln

- Deny by default. Identität serverseitig verifizieren; jede Ressourcenoperation autorisieren. Client-`userId`, `ownerId`, Pro, Rolle und Beta-Flag sind keine Autorität.
- Provider-/Service-Role-/OAuth-Secrets und private Schlüssel ausschließlich serverseitig. `EXPO_PUBLIC_*` wird öffentlich gebündelt. Exponierte Credentials widerrufen/rotieren; Entfernen aus Git genügt nicht.
- RLS **und Grants** auf allen privaten Tabellen prüfen, einschließlich Views, Storage und RPCs. `SECURITY DEFINER`, `search_path`, `PUBLIC EXECUTE`, Besitzerwechsel und fremde FK-IDs ausdrücklich testen. Privilegierte Rollen umgehen RLS.
- Serverseitige Schemas, Allowlist schreibbarer Felder, feste Größen-/Zeitlimits und kontrollierte Encodingfehler. Keine Shell/Eval aus Eingaben. Upstreamfehler als redigierte 502/503; keine rohen Providerdetails.
- Migrationen sichern Originaldaten, prüfen bestehende Referenzen und rollen bei Fehlern zurück. Kein Reset/Clean/Force-Push, keine stille Löschung oder Eigentümeränderung. Verwaiste Queueaufträge nicht nach wenigen Retries verwerfen.
- Stabile Idempotenz für wiederholbare/destruktive/kostenrelevante Aktionen, transaktionale Cloud-Aggregate, ausdrückliche Multi-Device-Konfliktpolicy. Scope nach jedem Async-Schritt beachten.
- Native Tokens in OS-SecureStore mit geprüftem Write/Readback und Logoutmarker. Kein Klartext-/RAM-Fallback bei IO-Fehlern; Rollback muss den neuen Reader verstehen.
- KI-Ausgaben untrusted: kein Sicherheitsprincipal, keine autonome Löschung/Abrechnung, nur validierte Planstruktur und bewusste Bestätigung. Systemprompt ist keine Autorisierung.
- Teure API: Auth, serverseitige Entitlements, gemeinsame Quoten/Budgets, Payload-/Concurrency-Limits und Kill-Switch vor Provideraufruf. In-Memory-Limits allein reichen für öffentlichen Betrieb nicht.
- Private Uploads: begrenzte Typen/Größen/Inhalte, sichere Objectkeys, keine beliebigen Server-URL-Abrufe. Datenminimierung für externe Modelle; rohe Chat-/Audio-/Bilddaten nicht in generische Logs.
- Keine Fake-Success-UX bei Sync, Delete, Restore, Billing oder AI. Teilfehler ausdrücklich melden und sichere Wiederholung ermöglichen.
- Jede Security-/Bugkorrektur erhält eine sinnvolle Regression. Gates nicht abschalten; Frozen Lockfile und immutable CI-Action-Pins beibehalten. Neue Abhängigkeiten brauchen Herkunft-/Nutzen-/Lizenz-/Advisoryprüfung.
- Neue personenbezogene Daten/Provider benötigen Privacy-, Export-, Delete-, Retention-, DPA-/Transferreview. DE/EN und Accessibility im selben Change berücksichtigen.

## Daten und Vertrauensgrenzen

| Datenfluss / Klasse | Risiko | Vorhanden | Offene Abnahme |
| --- | --- | --- | --- |
| Öffentlicher Übungskatalog | Manipulierte Inhalte, Medienrechte | Lokal importierter Katalog, deterministische IDs, Fallback | Versionierte Herkunft, Rechtekette externer Fotos |
| Profil/E-Mail — PERSONAL | Kontoverwechslung, unberechtigter Zugriff | Accountscope, validierte Stores | Auth-/Gastimport/Redirect-/Reauth-Tests auf realem System |
| Training/Pläne — SENSITIVE; Körperwerte/Notizen/Coach — HIGH_SENSITIVITY | Datenverlust, Offenlegung, Verknüpfbarkeit | Native Transaktionen, Originalbackups, Scopegeneration | Remote-Atomizität/RLS, Geräte-/Restorebeweis, Retention |
| Token/Key — SECRET | Credentialdiebstahl, Replay | SecureStore-Adapter, serverseitige Providerkeys, Secret-Gates | Native große Sessions, Signing-/IAM-Betrieb, Widerrufstests |
| App → Supabase | BOLA, Owner-/FK-Spoofing, Konflikte | Restriktive Migration und echte lokale SQL-Negativtests | A/B/Anonymous-HTTP-Matrix, Views/RPC/Storage, deployed Schema |
| App → Coach → Provider | Prompt Injection, gefährliche Antworten, Denial-of-Wallet | Bilinguale Safety, Tokenprüfung, Timeout, Instanzlimits | Verteiltes Ledger, serverseitige Bezahlrechte, globale Caps |
| Billing → App/API | Client-Pro-Spoofing, Replay/Refund | Providerinterface und lokale UX-Guards | Storeprovider, authentifizierte/idempotente Webhooks |
| CI/Dependencies → Bundle | Supply-Chain-/Build-Exfiltration | SHA-Pins, minimale Rechte, Scanner | SAST/Lizenz/SBOM, Required Checks, native Artefaktscan |
| Logs/Support/Backups | Gesundheits-/Tokenleaks, zu lange Speicherung | Sanitizing und outbound Allowlist | Remoteadapter, Zugriffe/Retention, echte Alerts/Restore |

Dateninventar vor jedem neuen Backendpfad ergänzen: Feldgruppe, Zweck, Speicher/Region, Empfänger, Rechtsgrundlage, Aufbewahrung, Export und Löschung. Sensitive Daten weder in Error-Messages noch Support-Dumps, CI-Outputs oder Session Replay. Für Support nur explizit ausgewählte redigierte Diagnosemetadaten.

## Prüfrahmen und Release-Sperren

[OWASP ASVS](https://owasp.org/projects/asvs) für API/Web und [MASVS](https://mas.owasp.org/MASVS/) für native Grenzen als Prüfraster verwenden. Keine Zertifizierung behaupten. Authprüfungen umfassen Reset/Verifikation/Enumeration, PKCE/state/Redirect-Allowlist bei OAuth, Replay/Expiry/Reauth und Kontowechsel. JWT-Löschung/Widerruf nicht mit sofortiger Invalidierung jedes noch gültigen Tokens gleichsetzen. [Supabase Auth-Sessions](https://supabase.com/docs/guides/auth/sessions).

Release blockiert bei offenem Critical/ungeklärtem High, Secret-Leak, unbewiesener Cross-User-Isolation, unvollständiger Kontolöschung, AI ohne belastbares Budget, clientautoritativem Premium, fehlendem Restorebeweis, widersprüchlichen Disclosures, ungeklärten ausgelieferten Assetrechten oder fehlender iOS-/Android-Geräteabnahme. Kritische Gates nicht durch unbestätigte Checkboxen freigeben.

Advisories `GHSA-w3rx-r6r6-pgpr` und `GHSA-5p2g-fcmc-qvqq`, image-size 1.2.1 über Metro, wurden am 21.09.2026 als Buildtool-Befunde triagiert (Originalbericht in Git an 39b2b3e). Die Behauptung fehlender Runtimeexposition muss bei Artefakt-/Dependencyänderungen neu geprüft werden. Aktuell sind zwei `image-size`-High-Advisories für Buildtools akzeptiert. Der Gate-Matcher prüft bisher Paket+Advisory, nicht die behauptete Version/Pfad/Exposition oder Frist. Das ist eine offene Policy-Lücke (R05), keine pauschale Runtime-Entwarnung. Ausnahme benötigt Finding, Impact, Exploitability, Mitigation, verantwortliche Person, Ablaufdatum und erneute Prüfung bei Pfad-/Versionsänderung.

## Juristische Prüfaufträge

Technik liefert Datenkarte, Lösch-/Export-/Consentbelege und reale SDK-/Netzwerkflüsse. Rechtsprüfung entscheidet Anwendbarkeit und finalen Text; keine garantierte Rechtssicherheit.

| Gebiet | Vor Release konkret klären | Primärquelle |
| --- | --- | --- |
| EU Datenschutz | Zwecke/Rechtsgrundlagen, Gesundheitsbezug/Art. 9, Einwilligung/Widerruf, DPIA-Screening, Betroffenenrechte, DPA, Empfänger/Transfers, Retention/Backups und Incidentprozess | [DSGVO](https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX%3A32016R0679) |
| Deutschland | Betreiber-/Kontaktangaben, Verbrauchervertrag/Preis/Trial/Kündigung, nicht erforderliche Endgerätespeicherung/Tracking und BFSG-Anwendbarkeit samt Ausnahmen | [DDG §5](https://www.gesetze-im-internet.de/ddg/__5.html), [TDDDG §25](https://www.gesetze-im-internet.de/ttdsg/__25.html), [BFSG](https://www.gesetze-im-internet.de/bfsg/) |
| KI / Gesundheit | KI-Interaktion erkennbar, Datenübermittlung transparent; Rollen und Art.-50-Anforderungen, Wellness-/Medizinproduktabgrenzung und zulässige Claims prüfen | [EU KI-Transparenz](https://digital-strategy.ec.europa.eu/en/policies/guidelines-ai-transparency-obligations) |
| USA | Zielbundesstaaten, Gesundheitsdaten-/Breachrecht, FTC/Verbraucherschutz, ggf. Minderjährige/CCPA und HIPAA-Anwendbarkeit prüfen; keine automatische HIPAA-Einstufung | [FTC HBNR](https://www.ftc.gov/business-guidance/resources/complying-ftcs-health-breach-notification-rule-0), [Washington Health Data](https://www.atg.wa.gov/protecting-washingtonians-personal-health-data-and-privacy) |
| Stores | Privacy/Health/Data-Safety-Angaben, AI-/Permissiondisclosure, Kontolöschung, Billing/Restore und reviewerfähige Backendfunktionen am tatsächlichen RC prüfen | [Apple Guidelines](https://developer.apple.com/app-store/review/guidelines/), [Google Health Content](https://support.google.com/googleplay/android-developer/answer/16679511?hl=en) |
| Assets | Datensatz und Fotos separat; Anatomy-Lizenz/Attribution, Schriften/Icons und generierte Grafiken mit Terms/Quelle/Version nachweisen | [Assetnachweise](../reference/ASSETS.md), [Third-party notices](../../THIRD_PARTY_NOTICES.md) |

Store-Abrechnung ist je Markt/Store/Programm zu prüfen; keine pauschale Aussage, Stripe sei überall erlaubt oder verboten. Apple verlangt bei Accountanlage die Möglichkeit, Löschung in der App einzuleiten; Google verlangt zusätzlich einen passenden externen Webpfad. [Apple Löschung](https://developer.apple.com/support/offering-account-deletion-in-your-app/), [Google Löschung](https://support.google.com/googleplay/android-developer/answer/13327111?hl=en).

Aktuell keine Social-/UGC-Funktion und kein Ad-Tracking freigeben. Werden diese später hinzugefügt, Moderation/Meldung/Blockierung, Minderjährigenschutz, DSA/US-Pflichten und ATT/Consent erneut prüfen. Sociallogin nur mit passenden Datenschutz-/Storealternativen. Nicht jede im eingefügten Artikel genannte Pflicht gilt automatisch für EVARO.

Betreiber muss Länder, Mindestalter, verantwortliche Personen, erreichbare Privacy-/Terms-/Imprint-/Support-/Deletion-URLs und Providerverträge bestätigen (`USER_ACTION_REQUIRED` / `LEGAL_REVIEW_REQUIRED`). Technische Einwilligungsflags sind noch keine freigegebenen Rechtstexte. [Experimentelle deutsche Rechtsskills](https://github.com/Klotzkette/claude-fuer-deutsches-recht) sind eine bewertbare Recherchehilfe, keine Rechtsquelle oder Freigabe.

## Supply-Chain-Korrektur dieses Checkpoints

Undici 6.28.0 im Expo-CLI-Pfad stürzte bei einem nicht angeforderten WebSocket-Subprotocol mit uncaught TypeError ab. [Upstream-Advisory](https://github.com/nodejs/undici/security/advisories/GHSA-rfgv-xxqx-mfg5) nennt 6.28.1 als kompatiblen Patch. Scoped Override und Lockfile wurden auf 6.28.1 gesetzt; übrige Auflösungen bleiben erhalten. Begrenzter Kindprozess mit Loopback-Handshakes reproduzierte den Absturz vor dem Patch und prüft danach kontrollierte Ablehnung plus gültige Verbindung. Das bestehende CRLF-/Tar-/Nanoid-Regressionsgate bleibt grün. Kein Nachweis einer ausnutzbaren Client-WebSocketroute behauptet.
