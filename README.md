# Focus Studio

A Pomodoro-based productivity tracker with session analytics and in-browser AI insights.

## Live Demo

[focus-studio.vercel.app](https://your-url.vercel.app)

## Features

- Pomodoro timer with configurable work, short break, and long break durations
- Every 4th break automatically becomes a long break
- Task tagging before each session
- Session history persisted in IndexedDB via Dexie (no backend, no account required)
- Analytics dashboard: daily focus chart, hourly activity heatmap, tag breakdown, streak tracking
- AI-generated insights running entirely in the browser via Transformers.js
- Keyboard shortcuts: Space (start/pause), R (reset), S (skip)
- Browser notifications when backgrounded
- Live timer in document title

## The Web Worker Bug

Standard `setInterval` in React runs on the main thread. Chrome throttles
timers in inactive tabs to roughly once per second to conserve resources,
causing the countdown to drift behind real time when you switch away.

This was reproducible: setting a 3-minute session and backgrounding the tab
for 2 minutes showed 8-12 seconds of drift on return.

**Fix:** The interval runs inside a Web Worker (`src/workers/timer.worker.ts`),
which operates on a separate thread unaffected by tab visibility throttling.
The worker sends a `TICK` message to the main thread on every second via
`postMessage`. The hook interface is unchanged — no component code was modified.

## AI Insights

The AI insights panel uses `Xenova/TinyLlama-1.1B-Chat-v1.0` via
Transformers.js. The model runs entirely in WebAssembly inside the browser.
No data is sent to any external API. The model downloads once (~670 MB) and
is cached by the browser on subsequent visits.

Aggregated session statistics (total sessions, completion rate, most active
hour, top project tag) are passed as a structured prompt. Raw session records
are never sent anywhere.

## Tech Stack

- React 18 + TypeScript
- Vite (with Web Worker support via `?worker` import)
- Dexie.js (IndexedDB wrapper)
- Recharts (analytics charts)
- Transformers.js (in-browser ML inference)
- Web Audio API (session end beep, no external library)
- Notification API (background tab alerts)

## Local Setup

```bash
npm install
npm run dev
```

## Architecture

```
src/
  workers/
    timer.worker.ts       # Web Worker, owns setInterval
  hooks/
    usePomodoro.ts        # timer state machine, communicates with worker
    useSessionHistory.ts  # Dexie reads and writes
    useAnalytics.ts       # aggregation over raw session records
    useInsights.ts        # Transformers.js model loading and inference
    useKeyboardShortcuts.ts
  db/
    schema.ts             # Dexie schema
  components/
    TimerDisplay.tsx
    Controls.tsx
    Settings.tsx
    SessionBadge.tsx
    TaskSelector.tsx
    DriftIndicator.tsx
    SessionLog.tsx
    Dashboard.tsx
    AIInsights.tsx
  utils/
    audio.ts              # Web Audio API beep
    notifications.ts      # Notification API wrapper
```