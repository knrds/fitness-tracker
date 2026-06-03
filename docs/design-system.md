# Design System: Volt Performance Fitness

## Ästhetik & Ausrichtung
- **Stil**: Modern, kraftvoll, premium, kompromisslos
- **Referenz**: Zwischen Whoop, Oura und Strava (Dark Mode)
- **Kernprinzipien**: 
  - Keine Drop-Shadows. Tiefe entsteht nur durch Oberflächenfarben-Hierarchie und scharfe 1px-Rahmen (`#2A2B31`).
  - "Floating"-Ästhetik durch großzügiges Padding (24px) um die Cards.

## Farbpalette (Dark Mode Primär)
| Farbe | Hex-Code | Verwendung |
| :--- | :--- | :--- |
| **Primary** | `#C6FF00` | Buttons, aktive States, Progress Bars, zentrale Datenpunkte |
| **Background** | `#0B0B0F` | App-Hintergrund, Deep Canvas |
| **Surface** | `#1A1C23` | Cards, Bottom Sheet Modals, Sticky Headers |
| **Text** | `#F4F5F7` | Primärer Fließtext, aktive Werte |
| **Muted** | `#2A2B31` | Sekundärtext, 1px Card-Rahmen, inaktive Icons |
| **Accent (Danger)** | `#FF3366` | Destruktive Aktionen, High-Heart-Rate Alerts |

*(Hinweis: Für einen zukünftigen Light Mode werden diese Werte systemisch invertiert bzw. separat definiert, der Fokus liegt aber zu 100% auf diesem Dark-Mode-Premium-Look.)*

## Typografie
Eine unverwechselbare, technische Ästhetik. 

- **Display/Numerals**: `Space Grotesk` (tabular numerals enabled) - für große Zahlen (Gewichte, Level, Streak).
- **Headings**: `Space Grotesk`, 700, 24-32px, Uppercase - für Screen-Titel.
- **Body**: `Manrope`, 500, 16px, +0.2px Letter Spacing - für Listen, Beschreibungen.
- **Buttons**: `Space Grotesk`, 600, 16px, Uppercase.
- **Caption/Small Text**: `Space Grotesk`, 400, 12px, Uppercase, +1px Letter Spacing - für Labels, Metadaten.

## Spacing-System
Das Layout basiert auf einem strikten Grid:
- `4px` / `8px` (sm)
- `12px`
- `16px` (md)
- `24px` (lg) - Standard-Padding für den Floating-Look
- `32px`
- `48px`

## Komponenten-Stil
- **Border-Radius-Skala**: 
  - `16px` für primäre Cards/Container.
  - `12px` für innere Elemente und Buttons.
  - `8px` für kleine Hit-Areas (z.B. Checkboxen).
- **Schatten-Stufen**: Keine Drop-Shadows! Flat, modern, abgetrennt durch 1px Borders (`#2A2B31`).
- **Card-Stil**: `#1A1C23` Surface-Color, 1px Border (`#2A2B31`), 16px Radius, 24px Padding.
- **Button-Varianten**:
  - *Primary*: Background `#C6FF00`, Text `#0B0B0F`.
  - *Secondary*: Surface `#1A1C23`, Border `#2A2B31`, Text `#F4F5F7`.
  - *Ghost*: Transparent, Text `#F4F5F7` oder `#C6FF00` bei Hover/Active.
  - *Danger*: Background `#FF3366` oder Text `#FF3366` in Ghost/Secondary-Variante.

## Micro-Interactions & Animationen
- Press-Scale `0.96` via Reanimated bei Buttons und interaktiven Cards.
- Haptisches Feedback (expo-haptics) bei Set-Abschluss, Button-Klicks.
- Checkbox füllt sich `#C6FF00`, Set-Zeile wird auf 50% Opacity gedimmt.
- Skeletons (`#1A1C23` pulsierend) statt klassischer Lade-Spinner.
