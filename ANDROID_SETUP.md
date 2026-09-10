# Android

Development-/Preview-Profile erzeugen interne APKs; production ist als App Bundle konfiguriert. Getrennte Paketnamen verhindern eine Kollision zwischen Development und Production. Expo/EAS-Projekt muss noch verknüpft werden.

Aus apps/mobile: npx eas-cli build --platform android --profile development. Dieser externe Build wurde noch nicht gestartet. Auf Emulator oder Testgerät installieren, anschließend im Repository pnpm dev-client. Ein lokaler Android-Build unter Windows benötigt zusätzlich Android Studio/SDK und passende Java-/Gradle-Konfiguration; das wurde nicht eingerichtet oder geprüft.

Abnahme: Tastatur, Android-Back, Offline, Prozess-Kill, SQLite-Migration, Recovery, Finish/History, Accessibility. Android-Hermes-JS-Export ist erfolgreich, aber kein Ersatz für eine kompilierte APK oder einen Gerätetest.
