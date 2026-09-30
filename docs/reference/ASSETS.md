# Asset- und Datenherkunft

Stand 30.09.2026. Technischer Herkunftsnachweis, keine pauschale kommerzielle Rechtefreigabe. Aktuelles Gate: [R06](../roadmap/MASTER_ROADMAP.md).

| Bestand | Quelle / Nachweis | Rechte-/Releasezustand |
| --- | --- | --- |
| Katalog: 873 Übungen | `packages/domain/src/data/raw/free-exercise-db.json`; [yuhonas/free-exercise-db](https://github.com/yuhonas/free-exercise-db), [Unlicense](https://github.com/yuhonas/free-exercise-db/blob/main/LICENSE); SHA256 `bed0e972779e5c167fbfb52f8e5b4f101d2dde93e26106c13de69a8a28c13732` | Upstream-Lizenz erklärt Nutzung; ursprünglicher Import-/Upstreamcommit noch nicht lückenlos dokumentiert. Keine vollständige Rechtekette aus Dateigröße ableiten. |
| Übungsfotos | Dynamisch über GitHub Raw `/main/exercises/...`, historisch weitere Quellen im Upstream | Fotografische Vorrechte ungeklärt; CDN main nicht immutable. Klären oder ersetzen/Anatomiefallback, IDs erhalten. |
| Männliche/weibliche Anatomie | [react-native-body-highlighter](https://github.com/HichamELBSI/react-native-body-highlighter), Commit `15df9e2dbc621450001960bed5a30e6a75357faa`; [lokale Herkunft](../../apps/mobile/src/components/anatomy/README.md) und [MIT-Lizenz](../../apps/mobile/src/components/anatomy/LICENSE) | Attribution vorhanden, Originalpfade plus lokale Änderungen. Keine Körpervermessung. |
| Premium-Embleme | `packages/ui/assets/premium/{energy,thread,coffee,cherry}.png`, 256px; Higgsfield gpt_image_2_5, 26.09.2026, Job `9a99fcc2-34ba-4021-8993-045c7ec0311f`, Projekt `24464f21-8afa-43e2-bfaa-00c58603cbb3` | Atlas lokal gesichtet/optimiert. Commercial Terms/Accountrechte prüfen; keine Runtime-Remoteabrufe. |
| Levelbadges | `apps/mobile/assets/level-badges.png`; Higgsfield gpt_image_2, Job `4a335c38-d9a9-4443-ab51-4cecabb9e5f2`, 2×2-Sprite | Generierung belegt; Commercial Terms prüfen. |
| Ränge | `apps/mobile/assets/ranks/rank-01.png` bis rank-10.png; frühere Designlieferung | Urheber-/Nutzungsnachweis fehlt. Zwanzig identische Inspokopien entfernt, Runtimekopien erhalten. |
| Hintergründe/Getränke/Accessoires | Lokaler SVG-/Komponentencode, Projektillustrationen | Herkunft projektintern dokumentieren. Verworfener Marmorjob `bb2f2569-14ae-4c50-9d14-aa0a16f6fd78` nicht ausgeliefert. |
| Appicon/Splash | Vorhandene lokale Projektdateien | Herkunft/Eigentümerbestätigung vor Store; Dateipräsenz beweist keine Rechte. |
| Fonts | Space Grotesk / Manrope via @expo-google-fonts, jeweilige OFL-Texte | Versionsgebundene Texte mit Artefakt ausliefern. |
| Icons / Audio | @expo/vector-icons mit mehreren Sets; Audioadapter/Timer | Set-/Dateirechte einzeln prüfen, kein pauschales alles MIT. |

Übungs-IDs entstehen deterministisch aus raw.id oder raw.name in mapExercises.ts. Medienaustausch darf alte Trainingsbezüge nicht verändern. Legacy unbekannte gifUrl-Felder tolerieren. exerciseCatalogCompatibility.test.ts und Defaultplan-/Schemas prüfen aktuelle GK/PPL, keine alten fünf Defaults.

Commit 92aae8f entfernte ExerciseDB-Hotlink-/Blobdateien, keine automatische Rechtefreigabe der Ersatzfotos. App verwendet statische Foto-URLs und kontrollierten Barbell-/Anatomiefallback; auch Fallbackgrafiken brauchen Lizenzhinweise.

Vor kommerziellem Release pro Asset Pfad/Hash/Quelle/Importcommit/Lizenztext/Urheber/Modification/Attribution/Commercialrechte/Receipt hinterlegen; UNKNOWN nicht ohne Beleg VERIFIED setzen. [Third-party notices](../../THIRD_PARTY_NOTICES.md) ist der Einstieg, noch kein vollständiger Dependency-SBOM.
