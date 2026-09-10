# iPhone / iOS

Expo-Konto und iPhone sind vorhanden. Apple-Developer-Mitgliedschaft fehlt. Unter Windows stehen weder Xcode noch ein lokaler iOS-Simulator zur Verfügung. Die Mitgliedschaft ist für die hier geplanten signierten EAS-Gerätebuilds/TestFlight erforderlich.

## Vorbereitet
apps/mobile/eas.json enthält development, preview, production; Development Client und expo-sqlite sind installiert. Node 24.13.0/pnpm 11.5.0 sind gepinnt. app.config.js trennt com.fitnesstracker.app.development, .preview und die bisherige Production-ID com.fitnesstracker.app. Varianten liegen in getrennten App-Sandboxes. Der Legacy-Import greift nur auf Daten derselben App-Identität zu.

## Sobald Mitgliedschaft und Projektverknüpfung eingerichtet sind
Aus apps/mobile: npx eas-cli login; EAS-Projekt verknüpfen und Bundle-ID/Team verifizieren; npx eas-cli device:create; npx eas-cli build --platform ios --profile development. EAS-Projekt-ID und Team-ID wurden nicht erfunden. Kein Build wurde bereits gestartet.

Binary auf registriertem iPhone installieren, Developer Mode aktivieren, vom Repository aus pnpm dev-client starten. Prüfen: Start, Set-Eingabe, Offline, Sperren, OS-Kill/Resume, Finish, History, Neustart, wenig Speicher und native Dialoge.

TestFlight kommt nach den Release-Gates: production bauen und anschließend submit. Ein Upload ist keine Veröffentlichung. Keine Zertifikate/Secrets in Git.

Quellen: https://docs.expo.dev/develop/development-builds/introduction/ und https://docs.expo.dev/eas/json/
