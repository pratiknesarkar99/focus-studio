import { usePomodoro } from './hooks/usePomodoro';
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
          onStart={start}
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
      </main>
    </div>
  );
}