import type { SessionType } from '../types';

interface Props {
    session: SessionType;
    completedPomodoros: number;
}

const SESSION_LABELS: Record<SessionType, string> = {
    work: 'Focus',
    shortBreak: 'Short Break',
    longBreak: 'Long Break',
};

export function SessionBadge({ session, completedPomodoros }: Props) {
    return (
        <div className="session-badge-row">
            <span className={`session-badge session-badge--${session}`}>
                {SESSION_LABELS[session]}
            </span>
            <span className="pomodoro-count">
                {completedPomodoros > 0 && `${completedPomodoros} session${completedPomodoros !== 1 ? 's' : ''} completed`}
            </span>
        </div>
    );
}