import { useCallback, useEffect, useRef, useState } from 'react';
import { DEFAULT_SETTINGS, type PomodoroSettings, type PomodoroState, type SessionType, type TimerStatus } from '../types';
import { playSessionEndBeep } from '../utils/audio';
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

                saveSession({
                    taskTag: taskTagRef.current,
                    sessionType: currentSession,
                    durationSecs: getSessionDuration(currentSession, settingsRef.current),
                    wasCompleted: true,
                }).then(bumpLogKey);

                clearTimer();
                playSessionEndBeep();

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

    const start = useCallback(() => {
        if (workerRef.current) return;
        startedAtWallRef.current = Date.now();
        secondsAtStartRef.current = secondsLeftRef.current;
        setDrift(0);
        setStatus('running');

        const worker = new TimerWorker();
        worker.addEventListener('message', (e: MessageEvent<{ type: string }>) => {
            if (e.data.type === 'TICK') tick();
        });
        worker.postMessage({ type: 'START' });
        workerRef.current = worker;
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

        // Only save if at least 10 seconds elapsed (avoids accidental skips)
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