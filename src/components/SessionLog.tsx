import { useEffect, useState } from 'react';
import type { Session } from '../db/schema';
import { useSessionHistory } from '../hooks/useSessionHistory';

function formatTime(ts: number): string {
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDate(ts: number): string {
    const d = new Date(ts);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    if (d.toDateString() === today.toDateString()) return 'Today';
    if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
}

const TYPE_LABELS: Record<Session['sessionType'], string> = {
    work: 'Focus',
    shortBreak: 'Short Break',
    longBreak: 'Long Break',
};

interface Props {
    refreshKey: number;
}

export function SessionLog({ refreshKey }: Props) {
    const [sessions, setSessions] = useState<Session[]>([]);
    const [loading, setLoading] = useState(true);
    const { getRecentSessions } = useSessionHistory();

    useEffect(() => {
        setLoading(true);
        getRecentSessions(7).then(s => {
            setSessions(s);
            setLoading(false);
        });
    }, [refreshKey, getRecentSessions]);

    if (loading) return <p className="panel-loading">Loading...</p>;

    const workSessions = sessions.filter(s => s.sessionType === 'work' && s.wasCompleted);

    return (
        <div className="log-panel">
            <div className="log-header">
                <h3 className="panel-section-title">Session Log</h3>
                <span className="log-summary">
                    {workSessions.length} focus session{workSessions.length !== 1 ? 's' : ''} this week
                </span>
            </div>

            {sessions.length === 0 ? (
                <p className="panel-empty">No sessions yet. Complete a focus session to see it here.</p>
            ) : (
                <ul className="log-list">
                    {sessions.map(s => (
                        <li key={s.id} className={`log-item ${!s.wasCompleted ? 'log-item--skipped' : ''}`}>
                            <div className="log-item-left">
                                <span className={`log-type log-type--${s.sessionType}`}>
                                    {TYPE_LABELS[s.sessionType]}
                                </span>
                                {s.taskTag && <span className="log-tag">{s.taskTag}</span>}
                            </div>
                            <div className="log-item-right">
                                <span className="log-date">{formatDate(s.completedAt)}</span>
                                <span className="log-time">{formatTime(s.completedAt)}</span>
                                {!s.wasCompleted && <span className="log-skipped">skipped</span>}
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}