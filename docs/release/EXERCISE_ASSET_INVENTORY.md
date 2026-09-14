# EVARO Exercise & Media Asset Provenance Inventory

Dieses Dokument dokumentiert die Herkunft, Speicherorte, Lizenzlage und kommerzielle Belastbarkeit aller im Repository vorhandenen Übungsdatenbanken, Medien- und Design-Assets.

---

## 1. Übersichtstabelle aller Asset-Gruppen

| Asset-Gruppe | Anzahl | Quelle | lokal / remote | Lizenz im Repo nachweisbar | Commercial Rights bestätigt | Status |
|---|---:|---|---|---|---|---|
| **Übungs-GIFs (`exerciseGifs.json`)** | 1.492 URLs (345 zugeordnet) | Hotlinks auf `https://static.exercisedb.dev/media/...` | remote | Nein (Keine Lizenz/Rechnung im Repo) | NO | **BLOCKED** |
| **Übungskatalog (`exercisedb.json`)** | 873 Übungen | JSON-Daten (Struktur ähnlich `free-exercise-db`) | lokal | Nein (Kein License Header / File im Datenordner) | NO | **BLOCKED** |
| **Übungskatalog V1 (`exercisedb-v1.json`)** | 1.500 Übungen | Archivierter / alternativer Datensatz | lokal | Nein | NO | **INACTIVE** |
| **Übungsbilder (`mapExercises.ts`)** | Dynamisch nach Bedarf | Fallback auf `raw.githubusercontent.com/yuhonas/free-exercise-db` | remote | Nein (Kein Lizenznachweis für Remote-Bilder) | NO | **BLOCKED** |
| **Anatomie-Vektorpfade** | 2 SVG-Figuren (Front/Back) | `HichamELBSI/react-native-body-highlighter` | lokal (Code) | Ja (`apps/mobile/src/components/anatomy/LICENSE`: MIT) | YES (MIT konform) | **CLEAR** |
| **Level Badges (`level-badges.png`)** | 1 Sprite (4 Badges) | Generiert via Higgsfield (Job `4a335c38...`) | lokal | Dokumentiert in `README.md`, aber Provider Terms ungeprüft | NO (Terms offen) | **ASTRA_REVIEW_REQUIRED** |
| **Rank Icons (`rank-01.png` - `rank-10.png`)** | 10 PNG-Grafiken | Lokale Bild-Assets | lokal | Keine Lizenzdatei beigelegt | NO | **ASTRA_REVIEW_REQUIRED** |
| **App Icons & Splash** | 4 PNGs (`icon.png`, `adaptive-icon.png`, `splash-icon.png`, `favicon.png`) | Projekt-Assets | lokal | Proprietär / Projekt-Assets | YES | **CLEAR** |
| **Marken-Emblem (`volt-emblem.png`)** | 1 PNG | Altes Volt-Branding-Emblem | lokal | Veraltetes Branding, kein Lizenzproblem | N/A | **REPLACE_BRANDING** |
| **Icons (UI)** | ~50+ Symbole | `@expo/vector-icons` (`Ionicons` / Ionic) | lokal (npm) | Ja (Ionicons: MIT) | YES | **CLEAR** |
| **Fonts (Typografie)** | 2 Schriftfamilien | `Space Grotesk`, `Manrope` via `@expo-google-fonts` | lokal (npm) | Ja (SIL Open Font License 1.1) | YES | **CLEAR** |
| **Audio / Sound-Effekte** | 0 Audio-Dateien | Keine statischen Audio-Dateien im Repo | N/A | Keine Audiodateien vorhanden | N/A | **SEE_AUDIO_AUDIT** |

---

## 2. Detaillierte Analyse der Übungs-Assets

### 2.1 Übungs-GIFs (`exerciseGifs.json`)
- **Dateipfad:** `packages/domain/src/data/raw/exerciseGifs.json`
- **Inhalt:** 1.492 Schlüssel-Wert-Paare, die normalisierte Übungsnamen auf externe Bild-URLs mappen.
- **Ziel-Domain:** 100 % der URLs verweisen auf `https://static.exercisedb.dev/media/...`
- **Laufzeit-Nutzung:** `apps/mobile/src/components/exercises/ExerciseCard.tsx` und `apps/mobile/app/exercise/[id].tsx` binden diese URLs direkt als Remote-Image (`<Image source={{ uri: previewUri }} />`) ein.
- **Befund:** Commercial usage rights could not be verified from repository evidence.
- **Risiken:**
  - Hotlinking auf fremde CDNs / Server ohne belegte Vereinbarung.
  - Ausfallrisiko: Ändert der CDN-Betreiber Pfade oder blockiert Hotlinking über Referrer-Checks, sind die Vorschaubilder in der App sofort schwarz/leer.
  - Kommerzielles Verwertungs- und Schutzrechtsrisiko.

### 2.2 Übungs-Datenbank (`exercisedb.json`)
- **Dateipfad:** `packages/domain/src/data/raw/exercisedb.json`
- **Inhalt:** 873 strukturierte Übungen mit Name, Zielmuskeln, Equipment und Bewegungsanweisungen.
- **Befund:** Im Datenordner liegt keine Lizenzdatei (wie `LICENSE` oder `COPYING`). In `mapExercises.ts` findet sich der Kommentar: `// Map the raw free-exercise-db JSON array to our typed domain Exercise array`.
- **Status:** Commercial usage rights could not be verified from repository evidence.

### 2.3 Fallback-Bilder (`free-exercise-db`)
- **Dateipfad:** `packages/domain/src/data/mapExercises.ts:240`
- **URL-Muster:** `https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/${raw.images[0]}`
- **Befund:** Remote-Hotlinking auf GitHub-Rohdaten. Kein Lizenzbeleg für kommerzielle App-Nutzung im Repository hinterlegt.

---

## 3. Analyse weiterer Medien- und UI-Assets

### 3.1 Anatomie-Assets (`AnatomyFigure.tsx`)
- **Pfad:** `apps/mobile/src/components/anatomy/`
- **Evidence:** `apps/mobile/src/components/anatomy/README.md` und `LICENSE`
- **Autor/Urheber:** ELABBASSI Hicham (2022)
- **Lizenz:** MIT License (vollständiger Lizenztext im Repository vorhanden).
- **Bewertung:** Kommerzielle Nutzung im Rahmen der MIT-Lizenz zulässig, solange der Copyright-Vermerk erhalten bleibt.

### 3.2 UI-Typografie und Vektorsymbole
- **Fonts:** Space Grotesk und Manrope sind unter der SIL Open Font License (OFL) lizenziert. Kommerzielle Einbettung in mobile Apps ist gestattet.
- **Icons:** Ionicons ist unter der MIT-Lizenz lizenziert. Kommerzielle Nutzung gestattet.

### 3.3 Rank- & Gamification-Grafiken
- **Pfad:** `apps/mobile/assets/ranks/rank-01.png` bis `rank-10.png` (jeweils ca. 1,3–1,6 MB)
- **Sprite:** `apps/mobile/assets/level-badges.png`
- **Evidence:** `apps/mobile/src/components/anatomy/README.md:7` verweist auf Generierung via Higgsfield AI (Job-ID dokumentiert).
- **Bewertung:** Die kommerziellen Nutzungsrechte für über KI-Dienste generierte Grafiken hängen von den AGB des jeweiligen Accounts/Anbieters ab. Im Repository liegt keine Vertragsbestätigung vor.

---

## 4. Handlungsempfehlungen für Astra & Konrad

1. **Exercise-GIFs / Medien**:
   - **Option A (Kommerzielle API-Lizenz):** Abschluss eines offiziellen kommerziellen Abonnements bei ExerciseDB / RapidAPI mit eigenem API-Key und legalem CDN-Zugriff.
   - **Option B (Asset-Entfernung / Placeholder):** Deaktivierung von externen GIF-Hotlinks für den V1 Store Release; stattdessen Anzeige hochwertiger statischer Vektor-Icons oder anatomischer Muskel-Hervorhebungen.
   - **Option C (Eigene Medien / CC0-Datensatz):** Ersatz durch einen verifizierten Open-Source-/Public-Domain-Datensatz mit expliziter kommerzieller Freigabe.
2. **Dateibereinigung**:
   - Veraltete oder ungenutzte Datensätze wie `exercisedb-v1.json` (1,4 MB) sollten nach Freigabe aus dem finalen Bundle entfernt werden, um die App-Größe zu optimieren.
