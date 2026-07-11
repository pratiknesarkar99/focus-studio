import { usePomodoro } from './hooks/usePomodoro';
import { Controls } from './components/Controls';
import { TimerDisplay } from './components/TimerDisplay';
import { Settings } from './components/Settings';
import { SessionBadge } from './components/SessionBadge';
import './App.css';

export default function App() {
  const { state, start, pause, reset, skip, updateSettings } = usePomodoro();

  return (
    <div className="app">
      <header className="app-header">
        <h1 className="app-title">Focus Studio</h1>
        <Settings settings={state.settings} onSave={updateSettings} />
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
      </main>
    </div>
  );
}