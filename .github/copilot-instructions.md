# Copilot Instructions for Tarteel Tots

## Development Commands

**Dev server** (watch mode with HMR):
```bash
npm run dev
```

**Build for production** (minified bundle with PWA):
```bash
npm run build
```

**Preview production build** (local server for testing built app):
```bash
npm run preview
```

**Lint code**:
```bash
npm run lint
```
ESLint uses flat config with React Hooks and React Refresh plugins. Fix common issues with `eslint . --fix`.

## Architecture Overview

### Offline-First + Cloud Sync Pattern

The app is **built around offline-first principles**:
- **Local DB (Dexie.js)**: IndexedDB wrapper storing all user data (profiles, children, progress, sessions, events)
- **Cloud Sync (Supabase)**: PostgreSQL backend syncs data when online; Realtime subscriptions push updates to connected clients
- **Dual Context Pattern**: `AuthContext` (auth state + local mode fallback) and `SyncContext` (Dexie↔Supabase orchestration)

Key tables in Dexie:
- `profiles`: Parent data (family_id, email, role, created_at)
- `children`: Child profiles (age, name, family_id)
- `progress`: Memorization tracking (Surah, Ayah chunks, grades, next review schedule)
- `sessions`: Quran study sessions (screen_time, audio_only_time, duration, mode)
- `events`: Analytics events (synced flag for offline batching)
- `audio_cache`: Cached Quran audio files for offline playback
- `settings`: App settings (default_qari, screen_time_limit, default_loops)

### Component Organization

```
src/
  components/
    AudioPlayer/      # Core audio loop engine (plays Ayah + loops)
    ChildMode/        # Child-friendly play interface
    Garden/           # Streak-based gamification (visual palm tree stages)
    GradingPanel/     # Parent grading UI (🔴🟡🟢 buttons)
    LiveGuide/        # Zero-screen parent-led mode
    common/           # Shared UI (InstallPrompt, etc.)
  contexts/
    AuthContext.jsx   # Auth state, local mode flag, profile loading
    SyncContext.jsx   # Sync orchestration between Dexie and Supabase
  pages/
    Auth/             # Login, Signup
    Onboarding/       # Child profile creation
    ChildPlay/        # ChildPlayPage, LiveGuidePage (routing handles mode)
    ParentDashboard/  # Main dashboard, settings
  db/
    dexie.js          # Dexie schema definition + helpers
    supabase.js       # Supabase client + sync functions
  hooks/
    useAuth.js        # Auth state consumer
    useScreenTime.js  # Screen time tracking + radio mode dimming
    useSpacedRepetition.js # Review scheduling algorithm
  utils/
    audioEngine.js    # Web Audio API wrapper + Islamic Network CDN helpers
    spacedRepetition.js # SR algorithm + garden growth logic
  App.jsx             # Route definitions, ProtectedRoute, OnboardingCheck
```

### Routing & Authentication

- **App.jsx**: Defines all routes with `ProtectedRoute` and `OnboardingCheck` wrappers
- **Auth flow**: Login → Signup → Onboarding (child profile) → Dashboard/ChildPlay
- **Local Mode**: If Supabase unavailable, app falls back to local-only mode (no sync, in-memory auth)
- **Route structure**:
  - `/login`, `/signup`: Public (redirect to dashboard if already auth'd)
  - `/onboarding`: Auth'd users only, must complete before dashboard access
  - `/dashboard`, `/settings`: Parent-only pages
  - `/child-play`, `/live-guide`: Child pages (full-screen, locked viewport)

### Data Sync Flow

1. **Offline changes**: Written to Dexie with `synced: 0` flag
2. **Online detection**: SyncContext listens for connection → triggers sync
3. **Sync function**: Calls Supabase to write unsynced progress/sessions/events
4. **Realtime subscription**: Supabase changes pushed back to Dexie via WebSocket
5. **Multi-parent sync**: Both parents see real-time updates via family_id RLS policies

## Design Tokens

All colors defined in Tailwind config. Use semantic names, not raw hex:

| Token | CSS Class | Usage |
|-------|-----------|-------|
| Primary Green | `bg-primary / text-primary` | Play buttons, primary actions |
| Gold | `bg-accent / text-accent` | Stars, tap button, gamification highlights |
| Background Sand | `bg-bg / text-bg-dark` | Page backgrounds, app theme |
| Review Blue | `bg-secondary` | Secondary buttons, review mode |
| Text | `text-text` | Body text (slate grey) |
| Night Sky | `bg-night` | Radio mode dimmed background |

**Tailwind config**: `@tailwindcss/vite` plugin in vite.config.js. Custom tokens in `src/index.css` or inline Tailwind classes.

## Spaced Repetition Algorithm

Located in `src/utils/spacedRepetition.js` and `src/hooks/useSpacedRepetition.js`.

**Grading grades**:
- 🔴 Needs Help → Review in 1 day (weight: high)
- 🟡 Good → Review in 3 days (weight: standard)
- 🟢 Perfect → Review in 7 days (weight: reduced)

**Garden stages** (streak-based progression):
- 0 streaks: Empty (🌱)
- 1-2: Seed (🌰)
- 3-6: Sprout (🌿)
- 7-13: Small Tree (🌳)
- 14-29: Growing Palm (🌴)
- 30+: Producing Date Palm (🌴✨)

## Supabase Setup

**Required tables** (see `src/supabase/migrations/001_initial_schema.sql`):
- `families`: Family groups (RLS enabled)
- `profiles`: Parent accounts with RLS (only see own family data)
- `children`: Child profiles
- `progress`: Tikrar log (grade + next review timestamp)
- `sessions`: Study session metadata
- `garden_state`: Streak + stage (denormalized for fast reads)

**Realtime subscriptions**: Progress, sessions, garden_state tables have realtime enabled.

**RLS Policies**: All tables filtered by family_id. Use `auth.uid()` in policies to enforce multi-parent read/write isolation.

## Environment Variables

Set in `.env.local` (copy from `.env.example`):
- `VITE_SUPABASE_URL`: Supabase project URL
- `VITE_SUPABASE_ANON_KEY`: Supabase anonymous key (public, safe in frontend)
- `VITE_SUPABASE_PUBLISHABLE_KEY`: Supabase publishable key

**Local mode**: If env vars are missing, app runs local-only (no cloud sync).

## PWA Configuration

**vite.config.js** defines:
- **Service Worker**: Auto-update on refresh
- **Offline caching**: Static assets (js, css, html) + Quran audio CDN + API responses
- **Audio cache strategy**:
  - Quran audio from `cdn.alquran.cloud`: CacheFirst (30 days, max 100 files)
  - Word-by-word audio from `audios.quranwbw.com`: CacheFirst (30 days, max 500 files)
  - Quran API from `api.alquran.cloud`: StaleWhileRevalidate (7 days, max 200 files)
- **Manifest**: App name, icons (192×192, 512×512, maskable), display mode standalone

**Icons**: Add PWA icons to `public/icons/` (icon-192.png, icon-512.png, icon-maskable.png).

## Common Patterns

### Using Dexie Queries

```javascript
// Fetch unsynced progress
const unsynced = await db.progress.where('synced').equals(0).toArray();

// Query by family_id
const familyProgress = await db.progress.where('family_id').equals(familyId).toArray();

// Batch update
await db.progress.bulkUpdate(updates);
```

### Accessing Auth State

Use the `useAuth()` hook in any component:
```javascript
const { user, isLocalMode, loading, onboardingComplete } = useAuth();
```

### Triggering Sync

The `SyncContext` automatically syncs on connection. To manually sync:
```javascript
const { triggerSync } = useSync();
await triggerSync();
```

### Audio Playback

The `AudioPlayer` component wraps `audioEngine.js`:
- Plays Quran from Islamic Network CDN
- Loops per Ayah (configurable loop count)
- Caches audio in Dexie for offline use

## Testing Strategy

No test framework configured yet. When adding tests:
- Use Vitest (better Vite integration) over Jest
- Focus on sync logic (Dexie↔Supabase) and SR algorithm
- Mock Supabase client and Dexie in unit tests
- Test offline → online → offline transitions

## Coding Standards

- **Component files**: Named exports with PascalCase (e.g., `export function ChildMode() {}`)
- **Hooks**: Use `useAuth()`, `useSync()`, `useScreenTime()` from custom hooks directory
- **Styling**: Prefer Tailwind classes; use design tokens (primary, accent, bg, text, etc.)
- **Async code**: Use async/await; handle sync failures gracefully (show toast, retry logic)
- **Error handling**: Log errors to console in dev; show user-friendly messages in UI
