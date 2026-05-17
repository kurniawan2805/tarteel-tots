# UI/UX & Design Specification: Quran Tikrar PWA

## 1. Design Principles
1.  **Continuity over Quantity:** Visual language should reward showing up every day rather than memorizing a large volume.
2.  **Cognitive Ease for Kids:** No complex navigation in the child's view. One action per screen.
3.  **Parental Efficiency:** Dashboards must be scannable in seconds.

## 2. Color Palette (Child-Friendly & Calm)
*Avoid harsh neons or high-contrast pure whites/blacks. Use soft, inviting colors that are gentle on young eyes.*
* **Primary Action (Mint Green):** `#48C78E` - Used for the main "Go/Play" buttons. Calming but actionable.
* **Secondary/Accent (Warm Sun):** `#F4D06F` - Used for stars, gamification elements, and highlights.
* **Background (Soft Sand):** `#FDFBF7` - A warm off-white that reduces eye strain compared to stark white.
* **Murojaah/Review (Sky Blue):** `#5ABCB9` - Used to visually distinguish review sessions from new memorization.
* **Text/Typography (Slate):** `#3A405A` - Soft dark blue/grey instead of black for readable, friendly text.

## 3. Typography
* **Font Family:** `Nunito` or `Quicksand`. These are highly legible, rounded, sans-serif fonts that feel playful yet clean.
* **Arabic Font:** `KFGQPC Uthman Taha Naskh` or a clear, thick Indo-Pak script depending on the region's preference. Must be rendered at a very large size (e.g., 32pt+).

## 4. User Interface Architecture

### 4.1. The Parent Dashboard (Protected Route)
* **Layout:** Bottom tab navigation (Home, Children, Settings).
* **Cards:** Each child has a summary card displaying their current streak (e.g., "🔥 5 Days"), today's suggested task, and a quick-action button to "Start Session".
* **Grading View:** A simple list of ayahs with three distinct, color-coded buttons:
    * 🔴 Needs Help (Retry tomorrow)
    * 🟡 Good (Review in 3 days)
    * 🟢 Perfect (Review in 7 days)

### 4.2. The Child "Play" Interface (Immersive Mode)
* **Layout:** Full-screen landscape or portrait with navigation hidden/locked to prevent accidental exits.
* **Centerpiece:** The Arabic text of the single Ayah currently being memorized (if they can read) or an engaging animation (e.g., a pulsing sound wave or a growing flower).
* **Controls:** * A massive, central "Play/Repeat" button.
    * A "Tap when you said it!" button that fills a progress ring around the screen.
* **Audio Feedback:** Soft, encouraging UI sounds (chimes, bubbles) when interacting with the screen.

## 5. Gamification Mechanics (Ages 3-7)
* **The Date Palm Garden:** Instead of complex point systems, children grow a visual garden. Completing a 5-minute repetition session waters a seed. Over a week, it becomes a tree. 
* **Audio Rewards:** After completing a milestone, unlock a special celebratory sound or short, culturally appropriate animation.

## 6. Marketing & Positioning Edge
* **Value Proposition:** "Guilt-free, tear-free Quran memorization for your toddlers."
* **Focus:** Market the app based on *habit-building* rather than *speed of memorization*.
* **Onboarding:** Allow parents to try the app without creating an account (save locally first), then prompt to create an account to "Sync and Save Progress."
