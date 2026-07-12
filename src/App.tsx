import { useEffect, useRef } from 'react';
import { usePomodoro } from './hooks/usePomodoro';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { requestNotificationPermission } from './utils/notifications';
import { Controls } from './components/Controls';
import { TimerDisplay } from './components/TimerDisplay';
import { Settings } from './components/Settings';
import { SessionBadge } from './components/SessionBadge';
import { DriftIndicator } from './components/DriftIndicator';
import { TaskSelector } from './components/TaskSelector';
import { SessionLog } from './components/SessionLog';
import { Dashboard } from './components/Dashboard';
import './App.css';

export default function App() {
  const {
    state, drift,
    taskTag, setTaskTag,
    sessionLogKey,
    start, pause, reset, skip, updateSettings,
  } = usePomodoro();

  const notifRequested = useRef(false);

  // Request notification permission on first start attempt
  const handleStart = () => {
    if (!notifRequested.current) {
      notifRequested.current = true;
      requestNotificationPermission();
    }
    start();
  };

  // Update document title to show timer when running
  useEffect(() => {
    const pad = (n: number) => String(n).padStart(2, '0');
    const mins = Math.floor(state.secondsLeft / 60);
    const secs = state.secondsLeft % 60;

    if (state.status === 'running' || state.status === 'paused') {
      document.title = `${pad(mins)}:${pad(secs)} — Focus Studio`;
    } else {
      document.title = 'Focus Studio';
    }
  }, [state.secondsLeft, state.status]);

  useKeyboardShortcuts({
    status: state.status,
    onStart: handleStart,
    onPause: pause,
    onReset: reset,
    onSkip: skip,
  });

  const isActive = state.status === 'running' || state.status === 'paused';

  return (
    <div className="app">
      <header className="app-header">
        <h1 className="app-title">Focus Studio</h1>
        <div className="header-actions">
          <Dashboard refreshKey={sessionLogKey} />
          <SessionLog refreshKey={sessionLogKey} />
          <Settings settings={state.settings} onSave={updateSettings} />
        </div>
      </header>

      <main className="app-main">
        <SessionBadge
          session={state.session}
          completedPomodoros={state.completedPomodoros}
        />

        <TimerDisplay
          secondsLeft={state.secondsLeft}
          status={state.status}
          session={state.session}
        />

        <Controls
          status={state.status}
          onStart={handleStart}
          onPause={pause}
          onReset={reset}
          onSkip={skip}
        />

        {state.session === 'work' && (
          <TaskSelector
            value={taskTag}
            onChange={setTaskTag}
            disabled={isActive}
          />
        )}

        <DriftIndicator
          drift={drift}
          show={state.status === 'running'}
        />

        <p className="keyboard-hint">
          Space to start/pause · R to reset · S to skip
        </p>
      </main>
    </div>
  );
}