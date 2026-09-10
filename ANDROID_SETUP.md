# Android

Windows unterstützt lokale Android-Builds. Android Studio, SDK, passendes JDK und Emulator installieren oder physisches Android mit USB-Debugging anschließen. Aus apps/mobile: pnpm exec expo run:android --device. Alternativ EAS development-Profil als APK bauen und auf Testgerät installieren. Danach Metro für tägliche Änderungen nutzen.

Production erstellt AAB für Google Play. Interner Test vor Veröffentlichung. Package-ID, Signing und Store-Metadaten separat konfigurieren. Debugsignaturen und lokale SDK-Pfade nicht committen.

Geräteabnahme: Back-Taste, Edge-to-edge/Safe-Area, Tastatur, Prozessbeendigung, Offline-Persistenz, Timer im Hintergrund und spätere Permission-Flows. Erfolgreicher Hermes-Export im Audit belegt nur das JS-Bundling.
