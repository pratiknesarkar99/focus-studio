import type { TimerStatus } from '../types';

interface Props {
    status: TimerStatus;
    onStart: () => void;
    onPause: () => void;
    onReset: () => void;
    onSkip: () => void;
}

export function Controls({ status, onStart, onPause, onReset, onSkip }: Props) {
    return (
        <div className="controls">
            <button className="btn btn--ghost" onClick={onReset} title="Reset">
                Reset
            </button>

            {status === 'running' ? (
                <button className="btn btn--primary" onClick={onPause}>
                    Pause
                </button>
            ) : (
                <button className="btn btn--primary" onClick={onStart}>
                    {status === 'paused' ? 'Resume' : 'Start'}
                </button>
            )}

            <button className="btn btn--ghost" onClick={onSkip} title="Skip to next session">
                Skip
            </button>
        </div>
    );
}