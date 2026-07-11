import type { SessionType, TimerStatus } from '../types';

interface Props {
    secondsLeft: number;
    status: TimerStatus;
    session: SessionType;
}

function pad(n: number): string {
    return String(n).padStart(2, '0');
}

export function TimerDisplay({ secondsLeft, status, session }: Props) {
    const minutes = Math.floor(secondsLeft / 60);
    const seconds = secondsLeft % 60;

    return (
        <div className={`timer-display timer-display--${session}`}>
            <div className={`timer-digits ${status === 'running' ? 'timer-digits--running' : ''}`}>
                <span className="timer-digits__number">{pad(minutes)}</span>
                <span className="timer-digits__sep">:</span>
                <span className="timer-digits__number">{pad(seconds)}</span>
            </div>
        </div>
    );
}