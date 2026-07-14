import { useCallback, useEffect, useRef, useState } from 'react';
import { DEFAULT_SETTINGS, type PomodoroSettings, type PomodoroState, type SessionType, type TimerStatus } from '../types';
import { playSessionEndBeep } from '../utils/audio';
import { sendNotification } from '../utils/notifications';
import { useSessionHistory } from './useSessionHistory';
import TimerWorker from '../workers/timer.worker?worker';

function getSessionDuration(session: SessionType, settings: PomodoroSettings): number {
    switch (session) {
        case 'work': return settings.workDuration * 60;
        case 'shortBreak': return settings.shortBreakDuration * 60;
        case 'longBreak': return settings.longBreakDuration * 60;
    }
}

function getNextSession(
    current: SessionType,
    completedPomodoros: number,
    settings: PomodoroSettings
): SessionType {
    if (current !== 'work') return 'work';
    const isLongBreak = completedPomodoros % settings.longBreakInterval === 0;
    return isLongBreak ? 'longBreak' : 'shortBreak';
}

const SESSION_NOTIFICATIONS: Record<SessionType, { title: string; body: string }> = {
    work: { title: 'Focus session complete', body: 'Time for a break. Step away for a few minutes.' },
    shortBreak: { title: 'Break over', body: 'Ready to focus? Start your next session.' },
    longBreak: { title: 'Long break over', body: 'Recharged? Time to get back to it.' },
};

export interface UsePomodoroReturn {
    state: PomodoroState;
    drift: number;
    taskTag: string;
    setTaskTag: (tag: string) => void;
    sessionLogKey: number;
    start: () => void;
    pause: () => void;
    reset: () => void;
    skip: () => void;
    updateSettings: (settings: PomodoroSettings) => void;
}

export function usePomodoro(): UsePomodoroReturn {
    const [status, setStatus] = useState<TimerStatus>('idle');
    const [session, setSession] = useState<SessionType>('work');
    const [secondsLeft, setSecondsLeft] = useState(DEFAULT_SETTINGS.workDuration * 60);
    const [completedPomodoros, setCompletedPomodoros] = useState(0);
    const [settings, setSettings] = useState<PomodoroSettings>(DEFAULT_SETTINGS);
    const [drift, setDrift] = useState(0);
    const [taskTag, setTaskTag] = useState('');
    const [sessionLogKey, setSessionLogKey] = useState(0);

    const workerRef = useRef<Worker | null>(null);
    const fallbackIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const workerHealthCheckRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const sessionRef = useRef(session);
    const completedRef = useRef(completedPomodoros);
    const settingsRef = useRef(settings);
    const secondsLeftRef = useRef(secondsLeft);
    const taskTagRef = useRef(taskTag);
    const startedAtWallRef = useRef<number | null>(null);
    const secondsAtStartRef = useRef<number>(0);

    const { saveSession } = useSessionHistory();

    useEffect(() => { sessionRef.current = session; }, [session]);
    useEffect(() => { completedRef.current = completedPomodoros; }, [completedPomodoros]);
    useEffect(() => { settingsRef.current = settings; }, [settings]);
    useEffect(() => { secondsLeftRef.current = secondsLeft; }, [secondsLeft]);
    useEffect(() => { taskTagRef.current = taskTag; }, [taskTag]);

    const clearTimer = () => {
        if (workerRef.current) {
            workerRef.current.postMessage({ type: 'STOP' });
            workerRef.current.terminate();
            workerRef.current = null;
        }
        if (fallbackIntervalRef.current !== null) {
            clearInterval(fallbackIntervalRef.current);
            fallbackIntervalRef.current = null;
        }
        if (workerHealthCheckRef.current !== null) {
            clearTimeout(workerHealthCheckRef.current);
            workerHealthCheckRef.current = null;
        }
        startedAtWallRef.current = null;
    };

    const bumpLogKey = () => setSessionLogKey(k => k + 1);

    const tick = useCallback(() => {
        if (startedAtWallRef.current !== null) {
            const wallElapsed = (Date.now() - startedAtWallRef.current) / 1000;
            const timerElapsed = secondsAtStartRef.current - secondsLeftRef.current;
            setDrift(Math.max(0, wallElapsed - timerElapsed - 1));
        }

        setSecondsLeft(prev => {
            if (prev <= 1) {
                const currentSession = sessionRef.current;
                const notif = SESSION_NOTIFICATIONS[currentSession];

                saveSession({
                    taskTag: taskTagRef.current,
                    sessionType: currentSession,
                    durationSecs: getSessionDuration(currentSession, settingsRef.current),
                    wasCompleted: true,
                }).then(bumpLogKey);

                clearTimer();
                playSessionEndBeep();
                sendNotification(notif.title, notif.body);

                const newCompleted = currentSession === 'work'
                    ? completedRef.current + 1
                    : completedRef.current;

                setCompletedPomodoros(newCompleted);
                setDrift(0);

                const nextSession = getNextSession(currentSession, newCompleted, settingsRef.current);
                setSession(nextSession);
                setStatus('idle');
                setSecondsLeft(getSessionDuration(nextSession, settingsRef.current));
                return 0;
            }
            return prev - 1;
        });
    }, [saveSession]);

    const startFallbackInterval = () => {
        if (fallbackIntervalRef.current !== null) return;
        fallbackIntervalRef.current = setInterval(tick, 1000);
    };

    const start = useCallback(() => {
        if (workerRef.current || fallbackIntervalRef.current) return;
        startedAtWallRef.current = Date.now();
        secondsAtStartRef.current = secondsLeftRef.current;
        setDrift(0);
        setStatus('running');

        let tickReceived = false;

        try {
            const worker = new TimerWorker();
            worker.addEventListener('message', (e: MessageEvent<{ type: string }>) => {
                if (e.data.type === 'TICK') {
                    tickReceived = true;
                    tick();
                }
            });
            worker.addEventListener('error', () => {
                workerRef.current = null;
                startFallbackInterval();
            });
            worker.postMessage({ type: 'START' });
            workerRef.current = worker;

            // Some browsers (e.g. Safari under COEP: require-corp) silently fail
            // to run blob-based module workers instead of throwing — watch for a
            // missed first tick and fall back to an in-thread interval.
            workerHealthCheckRef.current = setTimeout(() => {
                workerHealthCheckRef.current = null;
                if (!tickReceived && workerRef.current) {
                    workerRef.current.terminate();
                    workerRef.current = null;
                    startFallbackInterval();
                }
            }, 1500);
        } catch {
            workerRef.current = null;
            startFallbackInterval();
        }
    }, [tick]);

    const pause = useCallback(() => {
        clearTimer();
        setStatus('paused');
    }, []);

    const reset = useCallback(() => {
        clearTimer();
        setDrift(0);
        setStatus('idle');
        setSecondsLeft(getSessionDuration(sessionRef.current, settingsRef.current));
    }, []);

    const skip = useCallback(() => {
        const currentSession = sessionRef.current;
        const secondsElapsed = secondsAtStartRef.current - secondsLeftRef.current;

        if (secondsElapsed >= 10) {
            saveSession({
                taskTag: taskTagRef.current,
                sessionType: currentSession,
                durationSecs: getSessionDuration(currentSession, settingsRef.current),
                wasCompleted: false,
            }).then(bumpLogKey);
        }

        clearTimer();
        setDrift(0);

        const newCompleted = currentSession === 'work'
            ? completedRef.current + 1
            : completedRef.current;
        setCompletedPomodoros(newCompleted);

        const nextSession = getNextSession(currentSession, newCompleted, settingsRef.current);
        setSession(nextSession);
        setStatus('idle');
        setSecondsLeft(getSessionDuration(nextSession, settingsRef.current));
    }, [saveSession]);

    const updateSettings = useCallback((newSettings: PomodoroSettings) => {
        clearTimer();
        setDrift(0);
        setStatus('idle');
        setSettings(newSettings);
        setSecondsLeft(getSessionDuration(sessionRef.current, newSettings));
    }, []);

    useEffect(() => { return () => clearTimer(); }, []);

    return {
        state: { status, session, secondsLeft, completedPomodoros, settings },
        drift,
        taskTag,
        setTaskTag,
        sessionLogKey,
        start,
        pause,
        reset,
        skip,
        updateSettings,
    };
}