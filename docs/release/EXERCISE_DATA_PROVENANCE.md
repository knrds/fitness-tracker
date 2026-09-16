# EVARO – Exercise Data Provenance & Technical License Inventory

**Dokumentversion:** 1.0 (Post-ExerciseDB Consolidation)  
**Datum:** 16. September 2026  
**Auditor:** Gemini Hardening Agent (im Auftrag von Konrad)  
**Status:** `PARTIAL` (Dataset Unlicense: VERIFIED; Image Media Commercial Title: UNVERIFIED)

---

## 1. Executive Summary

Mit Commit `92aae8f` wurde die kommerzielle ExerciseDB-Abhängigkeit vollständig aus der EVARO-Codebasis entfernt:
- Die unlizenzierte 1.492-URL-Hotlink-Datei `exerciseGifs.json` wurde gelöscht.
- Die ungenutzte 38.665-Zeilen-Datei `exercisedb-v1.json` wurde gelöscht.
- Das verbliebene lokale Übungsdaten-JSON wurde von `exercisedb.json` in `free-exercise-db.json` umbenannt.
- `gifUrl` wurde aus Domain-Typen, Zod-Schemas und UI-Komponenten entfernt.
- Exercise-Media wurde auf die statischen zwei Positionsfotos (`0.jpg` / `1.jpg`) zurückgeführt.

Dieses Dokument liefert den lückenlosen technischen und lizenzrechtlichen Nachweis für den verbleibenden Datensatz.

---

## 2. Technische Provenienz

| Eigenschaft | Wert |
|---|---|
| **Aktuelle lokale Datei** | `packages/domain/src/data/raw/free-exercise-db.json` |
| **Übungsanzahl** | 873 Übungen |
| **Upstream-Projekt** | `yuhonas/free-exercise-db` |
| **Upstream-URL** | `https://github.com/yuhonas/free-exercise-db` |
| **Historische Vorläufer** | `wrkout/exercises.json` / Bodybuilding.com Scrape |
| **Bildstruktur** | Zwei statische JPEG-Fotos pro Übung: `0.jpg` (Startposition) und `1.jpg` (Endposition) |
| **Bild-Hosting-URL** | `https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/${raw.images[0]}` |
| **Lokale Bundling-Strategie** | JSON-Katalog liegt lokal im App-Bundle; Bilder werden bedarfsweise via HTTPS geladen oder fallen auf `barbell-outline` / `AnatomyFigure` zurück |

---

## 3. Lizenznachweis & Rechtliche Einstufung

### 3.1 Übungsdaten (JSON-Katalog)
- **Lizenz:** The Unlicense (Public Domain Dedication)
- **Lizenznachweis Upstream:** [yuhonas/free-exercise-db LICENSE](https://github.com/yuhonas/free-exercise-db/blob/main/LICENSE)
- **Kommerzielle Nutzung:** Erlaubt ohne Einschränkungen
- **Attribution Requirement:** Keine formale Pflicht (Public Domain), freiwillige Quellenangabe empfohlen
- **Redistribution:** Erlaubt
- **Lokale Kopie gestattet:** Ja
- **Verifikationsstatus:** `VERIFIED`

### 3.2 Bildmedien (0.jpg / 1.jpg)
- **Quelle:** Upstream-Verzeichnis `exercises/` in `yuhonas/free-exercise-db`
- **Historischer Ursprung:** Historisch aus Bodybuilding.com Übungsanleitungen extrahiert
- **Lizenzstatus der Medien:** Im Upstream-Repository werden die Bilder zusammen mit dem Code unter die Unlicense gestellt; die eigentliche Urheberschaft und Rechtekette (Chain of Title) der ursprünglichen Fotografien ist jedoch juristisch nicht lückenlos belegt.
- **Kommerzielle Nutzung:** Risiko rechtlicher Abmahnungen durch ursprüngliche Rechteinhaber bei rein kommerziellen Apps nicht 100% ausgeschlossen.
- **Verifikationsstatus:** `PARTIAL` / `UNVERIFIED`
- **Technische Schutzmaßnahme in EVARO:**
  - UI-Komponenten (`ExerciseDetailScreen`, `ExerciseCard`, `ExerciseRow`) verfügen über automatische Fallbacks (`onError` schaltet deterministisch auf das neutrale Barbell-Vektor-Icon oder die MIT-lizenzierte `AnatomyFigure` um).
  - Keine App-Funktion stürzt bei Fehlen oder Blockieren der Bilder ab.

---

## 4. Entfernte Dateien & Altlasten-Bereinigung

Im Zuge der Bereinigung wurden folgende Dateien restlos entfernt:
1. `packages/domain/src/data/raw/exerciseGifs.json` (1.492 URLs, 1.494 Zeilen, Verweise auf `static.exercisedb.dev`)
2. `packages/domain/src/data/raw/exercisedb-v1.json` (1,4 MB, 38.665 Zeilen)

**Repository-Audit:**
- Treffer für `static.exercisedb.dev` in aktivem Produktcode: **0**
- Treffer für `exerciseGifs` in aktivem Produktcode: **0**
- Treffer für `gifUrl` in aktivem Produktcode: **0**
- Treffer für `exercisedb-v1` in aktivem Produktcode: **0**
- Alle verbleibenden Erwähnungen befinden sich ausschließlich in historischen Dokumentationsberichten (`docs/release/`).

---

## 5. Exercise ID Stabilität & Migrationskompatibilität

### 5.1 ID-Generierungsalgorithmus
EVARO verwendet einen deterministischen UUIDv4-Algorithmus basierend auf 4 FNV-ähnlichen Hashrunden über `raw.id || raw.name` in `packages/domain/src/data/mapExercises.ts`:
```typescript
const id = deterministicUUID(raw.id || raw.name);
```

### 5.2 Kompatibilitätsnachweis
Da `free-exercise-db.json` eine exakte 1:1-Kopie von `exercisedb.json` ohne Inhaltsänderung ist:
- **Alle 873 Exercise-UUIDs sind 100 % identisch mit allen vorherigen Beta-Versionen (`v0.1.0-beta.1` bis `v0.1.0-beta.5`).**
- **Keine einzige Exercise-ID hat sich verändert.**
- **Keine Exercise-ID ist verschwunden.**
- **Ergebnis:** `NO_BREAKING_EXERCISE_ID_MIGRATION`

### 5.3 Abdeckung bestehender Nutzerdaten
Automatisierte Verifikation über `apps/mobile/src/__tests__/exerciseCatalogCompatibility.test.ts` garantiert:
1. **Templates:** Alle Übungen aus `getDefaultTemplates()` (`Barbell Squat`, `Barbell Bench Press - Medium Grip`, `Pullups`, `Romanian Deadlift`, `Barbell Deadlift`, etc.) lösen fehlerfrei auf.
2. **Programme:** Alle 5 Standardprogramme lösen vollständig auf valide Template- und Exercise-IDs auf.
3. **Legacy `gifUrl` Toleranz:** Zod-Schema-Validierung (`ExerciseSchema.safeParse`) verwirft unbekannte Legacy-Felder (`strip`) ohne Abbruch. Gespeicherte Daten mit veraltetem `gifUrl` zerstören weder den Store-Import noch MMKV-Hydration.
4. **Custom Exercises:** Eigene Übungen von Nutzern (`isCustom: true`, mit `ownerId`) erhalten separate Zufalls-UUIDs und kollidieren zu keinem Zeitpunkt mit Katalog-IDs.

---

## 6. Offene Fragen für Astra & Konrad

1. **Option für Store-Launch:**
   - **Status Quo beibehalten:** Kostenlose Fotos (`0.jpg`/`1.jpg`) via GitHub Raw CDN laden, mit automatischem Fallback auf Barbell-Icon.
   - **Alternative (Stufe 1):** Wenn Konrad jedes Medienrisiko vor Store-Einreichung ausschließen möchte, kann der Schalter `modeOverride = 'ANATOMY_FALLBACK'` in `getExerciseMedia.ts` global aktiviert werden. Dann nutzt die App ausschließlich die 100% rechtssicheren, MIT-lizenzierten SVG-Muskelhervorhebungen.
