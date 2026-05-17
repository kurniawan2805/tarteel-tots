# Product Requirements Document (PRD): Quran Tikrar (Repetition) PWA

## 1. Product Vision & Strategy
**Product Name:** (Working Title) Tarteel Tots / Little Mufassir
**Platform:** Progressive Web App (PWA) optimized for mobile/tablets.
**Objective:** To build an engaging, continuous, and child-friendly platform that assists toddlers and young children in memorizing the Quran through spaced repetition (Tikrar), while providing parents with seamless, real-time tracking and management tools.

## 2. Target Audience & User Personas
### Primary User: The Child (Ages 3 - 7)
* **Traits:** Highly visual, short attention span, motivated by immediate rewards and continuity rather than abstract goals.
* **Needs:** Large, obvious touch targets, minimal reading required, instant auditory and visual feedback.

### Secondary User: The Parents
* **Traits:** Busy, managing multiple children, wanting to nurture their children's Islamic education without it feeling like a chore.
* **Needs:** Easy onboarding, cross-device real-time syncing, flexible curriculum management, offline capability.

## 3. Core Features & Specifications

### 3.1. Parent & Child Onboarding
* **Parent Auth:** Individual logins for mother and father (tied to the same family group).
* **Child Profiles:** Create individual profiles for each child with age, avatar, and current memorization baseline.
* **Target Setting:** Flexible goals focusing on *time spent* or *streaks* rather than *number of ayahs* to prevent burnout.

### 3.2. The "Tikrar" (Repetition) Engine
* **Audio Player:** High-quality, clear recitation from famous Qaris (e.g., Minshawi with child repeating, Husary) or custom recorded audio from the parent.
* **Flexible Loops:** Ability to set looping parameters (e.g., repeat Ayah 1 five times, then Ayah 2 five times, then both together).

### 3.3. Spaced Repetition & Murojaah (Review) Logic
* **Smart Suggestions:** The app dynamically suggests whether today's session should focus on *Hifz* (new memorization) or *Murojaah* (review).
* **Grading System:** Parents evaluate recitation (e.g., 3 buttons: "Needs Work", "Good", "Perfect"). 
* **Algorithm:** "Needs Work" triggers more frequent repetition in the coming days.

### 3.4. Toddler-Optimized UI (The "Play" Mode)
* **Giant Controls:** Massive 'Play', 'Pause', and 'Next' buttons.
* **Child Input:** A large physical-style button on the screen the child can tap every time they complete a repetition, filling up a visual progress bar or growing a virtual item.

### 3.5. Gamification System
* **The "Growth" Mechanic:** Completing a daily session grows a virtual element (e.g., a date palm tree, a virtual garden, or feeding a friendly animal). Continuity keeps the garden alive.
* **Milestone Badges:** Earning visual badges for completing a Surah.

### 3.6. Offline-First PWA & Real-Time Sync
* **Local Storage:** All current audio and progress data are cached using IndexedDB to ensure the app works flawlessly in offline or poor-network conditions (like during a car ride).
* **Cloud Sync:** Background sync pushes local grades and progress to the cloud.
* **Real-time Updates:** If a mother grades a session at home, the father's dashboard is updated instantly via WebSocket connections.

## 4. Technical Constraints & Architecture
* **Frontend:** React / Vite for fast, modular PWA development.
* **Offline DB:** Dexie.js (wrapper for IndexedDB) for local data management.
* **Backend/Database:** Supabase (PostgreSQL + Auth + Realtime).
* **Hosting:** Vercel or Netlify.
