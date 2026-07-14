# Focus Studio

A Pomodoro-based productivity tracker with session analytics and in-browser AI insights.

## Live Demo

<img width="978" height="602" alt="image" src="https://github.com/user-attachments/assets/13bef4cd-7b4e-4ae0-83fd-2f8f783868a3" />

<img width="1003" height="669" alt="image" src="https://github.com/user-attachments/assets/d668b4fb-8acf-400f-9c8c-41d4c6ca1664" />

<img width="977" height="568" alt="image" src="https://github.com/user-attachments/assets/03e2d008-681d-4718-9823-3ede0e86570c" />

<img width="704" height="650" alt="image" src="https://github.com/user-attachments/assets/33b63eae-6bd1-4a91-a72c-767a4cfb6b0a" />


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
`postMessage`. The hook interface is unchanged, so no component code was modified.

## AI Insights

The AI insights panel uses `Xenova/TinyLlama-1.1B-Chat-v1.0` loaded via
`@huggingface/transformers` v3. The model runs entirely in WebAssembly inside
the browser. No data is sent to any external API. The model downloads once
(~670 MB) and is cached by the browser on subsequent visits.

### Why @huggingface/transformers instead of @xenova/transformers

The original implementation used `@xenova/transformers`, the predecessor package.
During build verification it threw a `Cannot read properties of undefined (reading
'registerBackend')` error caused by Vite's dependency pre-bundling interfering
with the ONNX backend registration at import time.

`@huggingface/transformers` v3 is the official successor to the Xenova package,
built with Vite compatibility in mind. Switching packages resolved the issue with
no API changes required.

### Cross-Origin Isolation

`SharedArrayBuffer`, which the WASM runtime depends on, requires the page to be
served with two HTTP headers:
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp

These are set in `vite.config.ts` for local development and in `vercel.json`
for the deployed build. Without them, the model fails to initialize and the
browser surfaces a generic load error.

### How the prompt is structured

Aggregated session statistics (total sessions, completion rate, most active hour,
top project tag) are passed as a structured prompt in TinyLlama chat format.
Raw session records are never included. Keeping the input small and structured
produces focused, relevant output from a model this size.

## Tech Stack

- React 18 + TypeScript
- Vite (with Web Worker support via `?worker` import)
- Dexie.js (IndexedDB wrapper)
- Recharts (analytics charts)
- @huggingface/transformers (in-browser ML inference via WebAssembly)
- Web Audio API (session end beep, no external library)
- Notification API (background tab alerts)

## Local Setup

```bash
npm install
npm run dev
```

## Architecture
src/
workers/
timer.worker.ts         # Web Worker, owns setInterval
hooks/
usePomodoro.ts          # timer state machine, communicates with worker
useSessionHistory.ts    # Dexie reads and writes
useAnalytics.ts         # aggregation over raw session records
useInsights.ts          # Transformers.js model loading and inference
useKeyboardShortcuts.ts
db/
schema.ts               # Dexie schema
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
audio.ts                # Web Audio API beep
notifications.ts        # Notification API wrapper

## Known Limitations

- AI insights require a ~670 MB one-time model download. Users on slow connections
  will see a progress bar during the first visit.
- In-browser inference with TinyLlama produces directional insights rather than
  precise analysis. A larger model would improve output quality but is impractical
  for client-side delivery.
- IndexedDB data is local to the browser and device. Clearing browser storage
  removes all session history.
- The drift indicator is intentionally left visible as a diagnostic tool showing
  the Web Worker fix working in real time.
