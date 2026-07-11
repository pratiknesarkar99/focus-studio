import { useCallback, useEffect, useRef, useState } from 'react';
import { DEFAULT_SETTINGS, type PomodoroSettings, type PomodoroState, type SessionType, type TimerStatus } from '../types';
import { playSessionEndBeep } from '../utils/audio';

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
    drift: number;           // seconds behind wall clock, for bug demo
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

    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const sessionRef = useRef(session);
    const completedRef = useRef(completedPomodoros);
    const settingsRef = useRef(settings);
    const secondsLeftRef = useRef(secondsLeft);

    // Drift tracking refs
    const startedAtWallRef = useRef<number | null>(null);   // Date.now() when last started
    const secondsAtStartRef = useRef<number>(0);             // secondsLeft when last started

    useEffect(() => { sessionRef.current = session; }, [session]);
    useEffect(() => { completedRef.current = completedPomodoros; }, [completedPomodoros]);
    useEffect(() => { settingsRef.current = settings; }, [settings]);
    useEffect(() => { secondsLeftRef.current = secondsLeft; }, [secondsLeft]);

    const clearTimer = () => {
        if (intervalRef.current !== null) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
        startedAtWallRef.current = null;
    };

    const tick = useCallback(() => {
        // Update drift on every tick: compare wall clock elapsed vs timer elapsed
        if (startedAtWallRef.current !== null) {
            const wallElapsed = (Date.now() - startedAtWallRef.current) / 1000;
            const timerElapsed = secondsAtStartRef.current - secondsLeftRef.current;
            const currentDrift = wallElapsed - timerElapsed;
            setDrift(Math.max(0, currentDrift - 1)); // subtract 1 for current tick
        }

        setSecondsLeft(prev => {
            if (prev <= 1) {
                clearTimer();
                playSessionEndBeep();

                const currentSession = sessionRef.current;
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
    }, []);

    const start = useCallback(() => {
        if (intervalRef.current !== null) return;

        // Record wall clock snapshot for drift tracking
        startedAtWallRef.current = Date.now();
        secondsAtStartRef.current = secondsLeftRef.current;
        setDrift(0);

        setStatus('running');
        intervalRef.current = setInterval(tick, 1000);
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
        clearTimer();
        setDrift(0);
        const currentSession = sessionRef.current;
        const newCompleted = currentSession === 'work'
            ? completedRef.current + 1
            : completedRef.current;
        setCompletedPomodoros(newCompleted);
        const nextSession = getNextSession(currentSession, newCompleted, settingsRef.current);
        setSession(nextSession);
        setStatus('idle');
        setSecondsLeft(getSessionDuration(nextSession, settingsRef.current));
    }, []);

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
        start,
        pause,
        reset,
        skip,
        updateSettings,
    };
}