# EVARO – Physical Device Smoke Test Guide (15–25 Min.)

> **Tester:** Konrad / Quality Assurance  
> **Ziel:** Schnelle manuelle Validierung der Kern-Features auf einem echten physischen Smartphone vor Store-Submissions oder TestFlight-Builds.  
> **Dauer:** ca. 15 bis maximal 25 Minuten.

---

## 1. Testprotokoll & Prüfpunkte

Trage für jeden Schritt das Testergebnis ein:
- **`[PASS]`** – Funktioniert fehlerfrei, flüssig und wie erwartet.
- **`[FAIL]`** – Fehler, Ruckeln, Fehldarstellung oder Crash (Notiz unten anfügen).
- **`[NOT TESTED]`** – Für diesen Durchlauf übersprungen.

| # | Testschritt | Erwartetes Verhalten | Ergebnis | Notizen |
|---|---|---|---|---|
| **01** | **App starten (Cold Start)** | Splash-Screen erscheint zentriert auf `#0B0B0F`, App startet in unter 2 Sekunden ohne Flackern | `[ ] PASS` | |
| **02** | **Gastmodus (Guest Mode)** | Auf Startbildschirm "Als Gast fortfahren" wählen. Kein Registrierungszwang, Dashboard lädt sofort | `[ ] PASS` | |
| **03** | **Workout starten** | Button "Workout starten" (Leeres Training) antippen. Status wechselt zu aktiv, Stoppuhr läuft | `[ ] PASS` | |
| **04** | **Übung hinzufügen** | "Übung hinzufügen" antippen, Katalog öffnet flüssig, Suchbegriff z. B. "Bench" eingeben und auswählen | `[ ] PASS` | |
| **05** | **Gewicht & Reps eingeben** | Gewicht (z. B. `82.5`) und Reps (z. B. `8`) eingeben. Dezimalkomma/Punkt wird korrekt formatiert | `[ ] PASS` | |
| **06** | **RPE / RIR wählen** | Optional RPE (z. B. 8.5) oder RIR antippen. Wert wird ohne Layout-Verschiebung übernommen | `[ ] PASS` | |
| **07** | **Satz abschließen (Haptic)** | Auf den Satz-Haken tippen: Deutlicher haptischer Vibrationsimpuls, Satz wird als erledigt markiert | `[ ] PASS` | |
| **08** | **Rest Timer** | Pausentimer startet automatisch (z. B. 90s). Fortschrittszähler läuft rückwärts | `[ ] PASS` | |
| **09** | **Gesten & Swipe** | Satzzeile nach links wischen: Roter Löschen-Button erscheint. Antippen löscht den Satz | `[ ] PASS` | |
| **10** | **Workout minimieren** | Oben rechts auf Minimieren tippen. Kompakte Minimized-Bar dockt über der Tab-Bar an | `[ ] PASS` | |
| **11** | **App Background & Foreground** | App für 10 Sekunden in den Hintergrund legen (Home-Geste) und wieder öffnen: Stoppuhr & Timer laufen exakt weiter | `[ ] PASS` | |
| **12** | **Workout beenden** | Maximieren und "Workout beenden" wählen: Bestätigung erscheint, Zusammenfassungs-Modal mit Volumen öffnet sich | `[ ] PASS` | |
| **13** | **History öffnen** | Tab "Aktivität / Historie" antippen: Das soeben beendete Workout steht ganz oben mit korrektem Datum | `[ ] PASS` | |
| **14** | **Exercise Library** | Tab "Übungen" öffnen: Schnelles Scrollen durch die 870+ Übungen ohne Ruckler oder Nachlade-Glitches | `[ ] PASS` | |
| **15** | **Exercise Detail & Bildwechsel** | Eine Übung antippen: Start- und Endpositionsgrafik laden scharf, Detaildaten & Muskelgruppen stimmen | `[ ] PASS` | |
| **16** | **Messung hinzufügen** | Tab "Körper": Gewicht eingeben (z. B. `81.4 kg`) und speichern: Eintrag erscheint im Verlauf | `[ ] PASS` | |
| **17** | **Coach Chat** | Tab "Coach": Frage stellen (z. B. "Wie mache ich einen Deload?"): Schnelle Antwort, Plan-Mode-Card klickbar | `[ ] PASS` | |
| **18** | **Einstellungen & Theme** | Profil -> Farbschema (z. B. Amber oder Glacier) wechseln: Akzentfarben ändern sich systemweit sofort | `[ ] PASS` | |
| **19** | **App Kill & Restart (Recovery)** | Neues Workout starten, Satz eintragen, App hart beenden (Task-Manager kill) und neu starten: Workout wird wiederhergestellt | `[ ] PASS` | |

---

## 2. Plattform-spezifische Besonderheiten

### iOS Besonderheiten
- **Haptics:** Prüfe, ob Taptic Engine bei Satzabschluss und Timer-Ende präzise vibriert.
- **Silent Switch:** Ertönt der Timer-Alarmton wie gewünscht (oder stumm bei stummgeschaltetem iPhone)?
- **Keyboard Handling:** Verschiebt die iOS-Tastatur das Satz-Eingabefeld ohne Überdeckung nach oben?
- **Dynamic Type:** Bei vergrößerter iOS-Schriftart in den Systemeinstellungen: Bleiben Texte lesbar und brechen sauber um?
- **Background Audio/Timer:** Läuft der Rest-Timer weiter, wenn das Display gesperrt wird?

### Android Besonderheiten
- **Hardware/Gesture Back Button:** Führt die Zurück-Geste auf Android aus Modals heraus, ohne die App unerwartet zu schließen?
- **Gboard & Samsung Keyboard:** Funktioniert der Dezimaltrennwert (`.` bzw. `,`) auf beiden Standard-Tastaturen fehlerfrei?
- **Android Haptics:** Arbeitet das Vibrationsfeedback auf Geräten mit Standard-Haptikmotor spürbar?
- **Background Battery Saver:** Beendet das Android-Batteriemanagement die App nicht vorzeitig bei laufendem Workout?

---

## 3. Protokoll-Zusammenfassung

- **Datum:** ______________________
- **Gerät (Modell & OS):** ______________________
- **Gesamtergebnis:** `PASS` / `FAIL`
- **Gefundene Auffälligkeiten / Regressionen:**
  1. ____________________________________________________
  2. ____________________________________________________
