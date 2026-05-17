# Tarteel Tots - Quran Memorization PWA for Toddlers

An offline-first Progressive Web App that helps children (ages 3-7) memorize the Quran through spaced repetition (Tikrar), while keeping parents engaged and controlling screen time.

## Features

- **Offline-First**: Works without internet using IndexedDB (Dexie.js)
- **Cloud Sync**: Seamless Supabase sync when online with real-time WebSocket updates
- **Spaced Repetition Engine**: Smart Murojaah suggestions based on parent grades
- **Audio Loop Player**: Customizable repetition per Ayah with Islamic Network CDN
- **Child Play Mode**: Full-screen, locked viewport with giant tactile controls
- **Live Guide Mode**: Zero screen time - parent recites face-to-face, logs on device
- **Radio Mode**: Auto-dims screen after configured time, continues audio-only
- **Date Palm Garden**: Visual streak-based gamification (no abstract points)
- **Parent Dashboard**: Real-time sync, screen time balance chart, progress tracking
- **Multi-Parent Support**: Mother & father linked via shared family_id

## Tech Stack

- **Frontend**: React 19 + Vite 8
- **Styling**: Tailwind CSS v4 (custom design tokens)
- **Local DB**: Dexie.js (IndexedDB wrapper)
- **Cloud**: Supabase (PostgreSQL, Auth, Realtime)
- **PWA**: vite-plugin-pwa (Service Worker, offline caching)
- **Routing**: React Router v7
- **Audio**: Web Audio API + HTML5 Audio

## Quick Start

```bash
cd tarteel-tots
npm install
```

### 1. Set up environment variables

```bash
cp .env.example .env.local
```

Edit `.env.local` with your Supabase credentials:
```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key
```

### 2. Set up Supabase

Run the migration file in your Supabase SQL editor:
```
src/supabase/migrations/001_initial_schema.sql
```

This creates:
- `families` table
- `profiles` (parents) table with RLS
- `children` table
- `progress` table (Tikrar log)
- `sessions` table
- `garden_state` table
- Realtime subscriptions on progress, sessions, garden_state

### 3. Run development server

```bash
npm run dev
```

### 4. Build for production

```bash
npm run build
npm run preview
```

## Project Structure

```
tarteel-tots/
├── src/
│   ├── components/
│   │   ├── AudioPlayer/     # Audio loop engine component
│   │   ├── Garden/          # Date Palm gamification
│   │   ├── GradingPanel/    # Parent grading UI (🔴🟡🟢)
│   │   ├── LiveGuide/       # Parent-led zero-screen mode
│   │   └── ChildMode/       # Child interactive play interface
│   ├── contexts/
│   │   ├── AuthContext.jsx  # Auth state (local + Supabase)
│   │   └── SyncContext.jsx  # Dexie ↔ Supabase sync layer
│   ├── db/
│   │   ├── dexie.js         # Local IndexedDB schema
│   │   └── supabase.js      # Supabase client + sync functions
│   ├── hooks/
│   │   ├── useScreenTime.js # Screen time tracking + dimming
│   │   └── useSpacedRepetition.js # Grading + review scheduling
│   ├── pages/
│   │   ├── Auth/            # Login, Signup
│   │   ├── Onboarding/      # Child profile setup
│   │   ├── ParentDashboard/ # Dashboard + Settings
│   │   └── ChildPlay/       # Play mode + Live Guide
│   ├── utils/
│   │   ├── audioEngine.js   # AudioLoopEngine + chimes + Quran API
│   │   └── spacedRepetition.js # SR algorithm + garden stages
│   ├── supabase/
│   │   └── migrations/      # SQL migration files
│   ├── App.jsx              # Router + protected routes
│   ├── main.jsx             # Entry point
│   └── index.css            # Tailwind + design tokens
├── public/
│   ├── favicon.svg
│   └── icons/               # PWA icons
├── vite.config.js           # Vite + PWA + Tailwind config
└── package.json
```

## Design Tokens

| Token | Value | Usage |
|-------|-------|-------|
| Primary Green | `#48C78E` | Play buttons, primary actions |
| Gold | `#F4D06F` | Stars, gamification, tap button |
| Background | `#FDFBF7` | Soft sand off-white |
| Review Blue | `#5ABCB9` | Review sessions, secondary actions |
| Text | `#3A405A` | Slate grey/blue body text |
| Night Sky | `#1A1A2E` | Radio mode dimmed background |

## Screen Time Mitigation

1. **Live Guide Mode**: Device faces parent, child has zero screen exposure
2. **Radio Mode**: After configurable limit (default 15min), screen dims to night-sky aesthetic, disables interactive elements, audio continues
3. **Parent Dashboard**: Visual chart comparing "Active Screen Time" vs "Audio-Only Time" with celebratory rewards when audio-only exceeds screen time

## Spaced Repetition Algorithm

| Grade | Next Review | Effect |
|-------|-------------|--------|
| 🔴 Needs Help | 1 day | High repetition weight |
| 🟡 Good | 3 days | Standard review interval |
| 🟢 Perfect | 7 days | Extended interval, weight reduced |

## Garden Growth Stages

| Streak | Stage | Visual |
|--------|-------|--------|
| 0 | Empty Plot | 🌱 |
| 1-2 | Seed Planted | 🌰 |
| 3-6 | Sprout | 🌿 |
| 7-13 | Small Tree | 🌳 |
| 14-29 | Growing Palm | 🌴 |
| 30+ | Producing Date Palm | 🌴✨ |

## Audio Sources

Uses Islamic Network CDN (https://cdn.islamic.network/) for Quran recitations:
- Mishary Alafasy (`ar.alafasy`)
- Minshawi with child repeat (`ar.minshawi`)
- Husary (`ar.husary`)

Audio is cached in IndexedDB for offline playback.

## License

MIT
