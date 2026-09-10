# Architektur

Entscheidung: Hybrid-Modernisierung im bestehenden Monorepo. apps/mobile/app enthält Expo-Routen; packages/domain bleibt React-freie Business Logic; packages/ui enthält Volt-Tokens und Primitives. Gegenwärtig persistieren Zustand-Stores in MMKV mit AsyncStorage-Fallback. Das ist ausdrücklich noch nicht die vollständige Zielarchitektur.

Ziel: features für UI-Orchestrierung, data für SQLite/Repositories/Migrationen/Outbox, services für Supabase und native Adapter. SQLite wird die einzige lokale Wahrheit für Workouts/History. Session und Outbox werden zusammen committed. Kleine Zustand-Projektionen dienen der UI; abgeleitete Werte werden berechnet. Supabase-Sync ist nachgelagert. Keine neue zweite App und kein zusätzlicher Server-Cache ohne echten Bedarf.

Transaktions- und Benutzergrenzen müssen vor dem Austausch aller Screens funktionieren. Siehe DATABASE.md und DECISIONS.md.
