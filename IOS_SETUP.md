# iPhone / iOS

Benutzerstatus: Expo-Konto und iPhone vorhanden; Apple-Developer-Mitgliedschaft fehlt noch. Unter Windows kein lokales Xcode und kein iOS-Simulator. Die Mitgliedschaft wird für signierte EAS-Gerätebuilds und TestFlight benötigt.

Nach Dev-Client-Konfiguration aus apps/mobile: npx eas-cli login; npx eas-cli build:configure; npx eas-cli device:create; npx eas-cli build --platform ios --profile development. Build auf registriertem iPhone installieren, Developer Mode aktivieren, Metro über pnpm exec expo start --dev-client --host lan verbinden.

TestFlight: production-Profil bauen, anschließend npx eas-cli submit --platform ios --profile production. Ein Upload ist keine Veröffentlichung. Eindeutiger Bundle-Identifier und App Store Connect müssen eingerichtet werden. Keine Zertifikate in Git. Reale Tests: Tastatur, Safe Area, Offline, Sperren, Kill/Recovery, Auth-Links.

Quelle: https://docs.expo.dev/develop/development-builds/introduction/
