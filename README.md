<p align="center">
  <img src="docs/assets/daymark-banner.svg" alt="Daymark Banner" width="100%" />
</p>

<p align="center">
  <strong>Speak your plans. Own your day.</strong>
</p>

<p align="center">
  A voice-first, offline-ready daily task companion engineered with React 19, Capacitor, and Groq GPT-OSS 20B.
</p>

<p align="center">
  <a href="#-why-daymark-why-not-just-google-tasks-or-random-play-store-apps">Why Daymark</a> •
  <a href="#-features-built-for-speed-zero-fluff">Features</a> •
  <a href="#-quick-tour--gallery">App Gallery</a> •
  <a href="#-architecture--tech-stack">Tech Stack</a> •
  <a href="#-getting-started">Getting Started</a> •
  <a href="#-building-the-android-app">Android Build</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-19.2-61DAFB?style=flat-square&logo=react&logoColor=black" alt="React 19" />
  <img src="https://img.shields.io/badge/TypeScript-5.9-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Capacitor-8.5-119EFF?style=flat-square&logo=capacitor&logoColor=white" alt="Capacitor" />
  <img src="https://img.shields.io/badge/Groq-GPT--OSS_20B-F55036?style=flat-square" alt="Groq" />
  <img src="https://img.shields.io/badge/Storage-Local_SQLite-003B57?style=flat-square&logo=sqlite&logoColor=white" alt="SQLite" />
  <img src="https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square" alt="License" />
</p>

---

## 💡 Why Daymark? (Why Not Just Google Tasks or Random Play Store Apps?)

Let's be completely honest: **typing your daily tasks on a tiny mobile keyboard is where productive momentum goes to die.**

You're walking, driving, walking between meetings, or your brain is buzzing with 4 different priorities. You open Google Tasks, Todoist, or Apple Reminders:
- You tap `+`. You type the task title with your thumbs.
- You tap the calendar icon. You scroll the date wheel.
- You tap time. You scroll the hour wheel, then the minute wheel.
- You tap Save.
- *...And now you have to repeat that entire circus 3 more times for your other thoughts.*

By the second task, you've completely lost your flow, got sidetracked by a notification, and put your phone down.

And what about the other 99% of todo apps on the Google Play Store?
They hit you with mandatory account signups, pop-up ads for mobile games, or slap a **$4.99/month subscription paywall** on basic essentials like recurring tasks, dark mode, or widgets. To top it off, your personal daily routine gets uploaded to big-tech cloud servers to fuel targeted ad profiles.

**Daymark was built to kill that friction entirely.** One breath. Zero typing. Zero subscriptions. Zero cloud tracking.

### 🥊 Google Tasks / Play Store vs. Daymark

| Friction Point | Traditional Apps (Google Tasks, Todoist, Play Store) 🥱 | Daymark ⚡ |
| :--- | :--- | :--- |
| **Input Speed** | 10+ taps, typing on keyboard, fidgeting with date pickers | **Hold mic, speak naturally for 5 seconds.** Handled. |
| **Multi-Task Brain Dump** | Must create tasks one... by... painful... one | **Decomposes 3-4 tasks from a single breath** in ~400ms via Groq LLM |
| **Privacy & Cloud Sync** | Required Google/Apple login; stored on big-tech cloud servers | **100% local SQLite database.** Your schedule never leaves your device |
| **Offline Reliability** | Spinners, sync errors, or blank screens without Wi-Fi | **Instant, zero-latency local-first.** Works in an airplane or subway |
| **Pricing & Monetization** | Ads, "Pro" subscriptions ($48/yr), paywalled widgets | **100% free, MIT open-source, zero paywalls forever** |
| **Focus Mode** | Basic timers that pause or drift when your screen locks | **Sleep-proof delta timer.** Lock phone, put in pocket, 0% drift |
| **Home Screen Action** | Static lists or clunky web views | **Interactive native Android widget with 1-tap check-off & instant mic** |

---

## ⚡ Features Built for Speed, Zero Fluff

Every single feature in Daymark was engineered around one rule: **maximum execution, zero friction.**

### 🎙️ 1. Multi-Task Voice Brain-Dump (Groq GPT-OSS 20B)
Speak naturally without robot syntax: *"Gym at 6 PM, review the pull requests for two hours, and call mom tomorrow morning at 10."* Powered by **Groq's edge inference running `openai/gpt-oss-20b`**, Daymark parses your voice in sub-second speed (~400ms), resolves start times, durations, and deadlines into separate structured cards, and lets you tap once to confirm. Supports **English, Hindi (हिंदी), Marathi (मराठी)**, and conversational Hinglish.

### 🔒 2. Zero-Surveillance, 100% Local-First SQLite
No account creation. No password reset emails. No cloud data mining. On Android, Daymark writes directly to native SQLite (`daymark_tasks.db`) via `@capacitor-community/sqlite`. On desktop web, it uses indexed local persistence. Your schedule and thoughts stay strictly on your hardware.

### 🔥 3. GitHub-Style Numbered Streak & 7-Day Pulse
Real consistency, no fake dopamine. The Pulse dashboard tracks consecutive days where you *actually completed* at least one task. Features an animated flame badge (`🔥 7`) and a 7-day visual milestone track where your consecutive streak number is embedded directly inside active completion markers. Miss a day? It resets. Earn your streak.

### ⏱️ 4. Sleep-Proof, Battery-Friendly Focus Mode
Phone screen timers that reset when your screen turns off are useless. Daymark's Focus Mode uses hardware timestamp-delta calculations (`Date.now() - sessionStart`). Start a 25-minute sprint, lock your phone, slide it into your pocket—when you pull it out, the circular SVG timer is pixel-perfect down to the millisecond without draining battery in the background.

### 📱 5. Interactive Android Home-Screen Widget
Never open the app just to tick a box. The native Android widget displays today's live tasks right on your home screen. Tap any task checkbox to complete it on the spot (syncs directly with local SQLite). Need to capture a thought? Tap the widget's mic icon to launch straight into voice capture.

### 📸 6. 1080×1920 Editorial Social Story Cards
Built-in proof of work. Turn today's completed grind into clean, aesthetic graphic cards with one click. Exports high-res PNGs in **9:16 (Instagram / Snapchat Stories)**, **1:1 (Square for WhatsApp / Threads)**, and **16:9 (X / Twitter)** with dynamic task completion rings and your active streak counter.

### 📳 7. Tactile Native Haptics
Physical sensory feedback engineered with `@capacitor/haptics`. Feel a sharp physical snap when you complete a task, a subtle pulse when voice capture kicks in, and celebration vibrations when you crush your daily goal.

### 🖤 8. Midnight Charcoal & Warm Paper Themes
No blinding white screens, and no lazy pure-black backgrounds that cause eye strain. Daymark features a custom-tuned charcoal dark mode designed specifically for contrast and OLED battery saving, paired with a warm editorial off-white paper light theme.

### 📜 9. Daily Stoic Spark
Every midnight, Daymark quietly updates with a curated philosophical or stoic insight (Marcus Aurelius, Seneca, Naval) to keep you grounded before you start executing. Zero cringe hustle bro quotes.

---

## 📱 Quick Tour & Gallery

Every screenshot below is captured directly from the live running Daymark application:

| Dark Theme Task View | Light Theme Task View |
| :---: | :---: |
| <img src="docs/assets/app-dark-main.png" alt="Dark Theme View" width="380" /> | <img src="docs/assets/app-light-main.png" alt="Light Theme View" width="380" /> |
| *Editorial typography, daily quote, and progress bar* | *Warm off-white surfaces and accessible contrast* |

| Voice Task Composer | Numbered Streak & Productivity Pulse |
| :---: | :---: |
| <img src="docs/assets/voice-composer.png" alt="Voice Task Composer" width="380" /> | <img src="docs/assets/productivity-pulse.png" alt="Productivity Pulse" width="380" /> |
| *Multilingual speech recognition with English, Hindi & Marathi* | *Numbered streak markers tracking consecutive days completed* |

| Battery-Friendly Focus Mode | Social Progress Story Card |
| :---: | :---: |
| <img src="docs/assets/focus-mode.png" alt="Focus Mode" width="380" /> | <img src="docs/assets/share-card-modal.png" alt="Share Card Modal" width="380" /> |
| *Circular animated timer ring with sleep-proof delta timing* | *Exportable PNG in Story (9:16), Square (1:1), and Twitter (16:9)* |

---

## 🛠️ Architecture & Tech Stack

```
daymark/
├── android/                   # Native Android Capacitor wrapper
│   ├── app/src/main/res/      # AppWidget XML layouts & drawables
│   └── app/src/main/java/     # DaymarkWidgetProvider.java & MainActivity.java
├── src/
│   ├── react-app/             # Frontend UI (React 19 + TypeScript + Vite)
│   │   ├── components/        # Modals (Voice, Pulse, Focus, ShareCard, Tasks)
│   │   ├── hooks/             # useTasks, useVoiceTaskFlow, useTheme
│   │   ├── storage/           # SQLite repository & widgetSync bridge
│   │   └── lib/               # Haptics, pulseUtils, dateUtils
│   ├── shared/                # Shared task schemas and Zod validators
│   └── worker/                # Edge API & Groq LLM parser (Hono)
└── tests/                     # Master test suite & feature verification
```

### Core Technologies

- **Frontend**: [React 19](https://react.dev/), [TypeScript 5.9](https://www.typescriptlang.org/), [Vite](https://vitejs.dev/)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/) with custom dark charcoal and warm off-white tokens
- **Animations**: [Motion](https://motion.dev/)
- **Mobile Runtime**: [Capacitor 8](https://capacitorjs.com/) with native SQLite, Haptics, Local Notifications, and Share plugins
- **Backend / Edge**: [Hono 4](https://hono.dev/) on Cloudflare Workers
- **AI Intelligence**: [Groq](https://groq.com/) running `openai/gpt-oss-20b` for ultra-low-latency structured JSON extraction

---

## 🔍 Technical Deep Dives

<details>
<summary><strong>🎙️ How Voice-to-Task Processing Works</strong></summary>
<br />

When you record a voice prompt:
1. Speech is transcribed on-device via `@capgo/capacitor-speech-recognition` (or browser SpeechRecognition).
2. The transcript is sent to the backend Hono route (`POST /api/parse-task`) along with the user's local reference date and timezone.
3. The server crafts a system prompt embedding ISO calendar constraints and sends it to Groq's high-speed inference engine running `openai/gpt-oss-20b`.
4. The output is strictly parsed and validated using a Zod schema (`TaskDecompositionResponseSchema`), ensuring all relative references (e.g. *"tomorrow at 10 AM"*) resolve to valid dates.
5. Structured proposals are returned to the frontend where the user reviews them before persisting to SQLite.

</details>

<details>
<summary><strong>💾 Local Storage & Android Widget Synchronization</strong></summary>
<br />

Daymark operates on a local-first philosophy:
- **Primary Database**: Tasks are saved into a SQLite database (`daymark_tasks.db`) through `@capacitor-community/sqlite`.
- **Widget Bridge**: Whenever tasks are created, modified, completed, or deleted, `widgetSync.ts` updates a cached JSON snapshot (`daymark_widget_snapshot`) in Android's `CapacitorStorage` SharedPreferences and immediately triggers `DaymarkWidgetProvider.updateAllWidgets(context)`.
- **Interactive Completion**: Tapping a task checkmark on the Android home-screen widget updates RemoteViews immediately and records the task ID in `pending_widget_toggles`. When Daymark resumes, it automatically reconciles the changes with the SQLite database.

</details>

<details>
<summary><strong>🔐 Security & API Key Isolation</strong></summary>
<br />

- Your **Groq API Key never touches the client application or Android APK bundle**.
- The Groq key is stored exclusively as an environment secret in the edge worker (`.dev.vars` locally or Cloudflare Secrets in production).
- The mobile application only communicates with your backend endpoint (`/api/parse-task`), keeping keys secure from decompilation.

</details>

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v20 or v22 LTS recommended)
- `npm` (v10+)
- A [Groq API Key](https://console.groq.com/keys) (free tier works great)

### 1. Clone the Repository

```bash
git clone https://github.com/Pruthviraj141/Tasks.git
cd Tasks
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Create `.dev.vars` in the project root:

```bash
cp .env.example .dev.vars
```

Add your Groq API key:

```ini
GROQ_API_KEY="your_groq_api_key_here"
```

### 4. Run Locally

Start the full-stack development environment (Vite frontend + Hono edge API):

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 🧪 Running Tests

Daymark includes automated test coverage validating Zod schemas, date math, Groq parsing accuracy, streak calculations, and Android widget layouts:

```bash
# Run Master Phase 2 Test Suite (27 test cases including live Groq parsing)
npm test

# Run Feature Refinement Verification Suite (Streak, 3-Format Share, Widget)
npx tsx tests/final_refinements.test.ts

# Run ESLint & TypeScript build check
npm run lint && npm run build
```

---

## 📱 Building the Android App

> [!NOTE]
> Pre-compiled APK binaries are not currently hosted in GitHub Releases. You can easily build the Android package locally using standard Capacitor tooling:

<details>
<summary><strong>Click to view Android Build Steps</strong></summary>
<br />

### Prerequisites for Android
- [Android Studio](https://developer.android.com/studio) installed with Android SDK (API 34+) and Java 17/21.

### 1. Build the Production Bundle
```bash
npm run build
```

### 2. Synchronize Web Assets with Android Project
```bash
npx cap sync android
```

### 3. Open in Android Studio or Build APK Directly
Open Android Studio:
```bash
npx cap open android
```

Or build a debug APK from the command line:
```bash
cd android
./gradlew assembleDebug
```

The resulting APK will be generated at:
```text
android/app/build/outputs/apk/debug/app-debug.apk
```

</details>

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
