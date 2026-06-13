# Feature Workplan 2026-06-09

Arbeitsliste fuer die aktuelle Stabilisierung/Feature-Runde. Ziel: viele kleine,
testbare Schritte statt ein grosser unuebersichtlicher Umbau.

## In Arbeit

- [x] RestTimer minimiert auf Desktop wieder sichtbar und ergonomisch machen.
- [x] Exercise-Info um Volumensteigerung in Prozent gegenueber dem letzten Training erweitern; Session Volume ohne Warmups sicherstellen.
- [x] Workout-Fun-Facts erweitern, inklusive caffeine-bezogener Varianten.
- [x] Lokales Caffeine-Tracking im Workout mit Settings-Toggle, Preset-DB und Warnhinweisen ergaenzen.
- [x] Body-Heatmap intensitaetsbasiert statt binaer darstellen.
- [x] Drinking/Hydration-Anzeige im Body-Tab mit Ziel, 250 ml / 500 ml / 1 l Quick Adds und passenden Fun-Facts ergaenzen.
- [x] Mobile-GUI auf Proportionen, Textumbrueche und kleine Screens pruefen und korrigieren.
- [x] Weitere Achievements ergaenzen.
- [x] Warmup-Exercise-Kategorie/Filter fuer Warmup/Cardio/normal anbieten, ohne Domain-Typen zu aendern.
- [x] Aktives Programm staerker auf dem Home-Screen hervorheben, inklusive anstehender Tagesuebungen.
- [x] Tests ergaenzen, Checks ausfuehren und Fehler beheben.
- [ ] Danach ohne Codeaenderung kostenlose animierte Uebungsdatenbanken im Internet recherchieren.

## Constraints

- Keine Aenderung an `docs/schema.sql`.
- Keine Domain-Type-/Enum-Aenderung ohne separate Freigabe.
- Neue lokale App-Daten bleiben mobilseitig und MMKV-persistiert.
- Warmups zaehlen nicht in Arbeitsvolumen/PRs.
