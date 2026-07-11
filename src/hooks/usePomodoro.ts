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

    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const clearTimer = () => {
        if (intervalRef.current !== null) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
    };

    // Core tick logic, extracted so it can reference latest state via ref
    const secondsLeftRef = useRef(secondsLeft);
    const sessionRef = useRef(session);
    const completedRef = useRef(completedPomodoros);
    const settingsRef = useRef(settings);

    useEffect(() => { secondsLeftRef.current = secondsLeft; }, [secondsLeft]);
    useEffect(() => { sessionRef.current = session; }, [session]);
    useEffect(() => { completedRef.current = completedPomodoros; }, [completedPomodoros]);
    useEffect(() => { settingsRef.current = settings; }, [settings]);

    const tick = useCallback(() => {
        setSecondsLeft(prev => {
            if (prev <= 1) {
                // Session ended
                clearTimer();
                playSessionEndBeep();

                const currentSession = sessionRef.current;
                const newCompleted = currentSession === 'work'
                    ? completedRef.current + 1
                    : completedRef.current;

                setCompletedPomodoros(newCompleted);

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
        setStatus('running');
        intervalRef.current = setInterval(tick, 1000);
    }, [tick]);

    const pause = useCallback(() => {
        clearTimer();
        setStatus('paused');
    }, []);

    const reset = useCallback(() => {
        clearTimer();
        setStatus('idle');
        setSecondsLeft(getSessionDuration(sessionRef.current, settingsRef.current));
    }, []);

    const skip = useCallback(() => {
        clearTimer();
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
        setStatus('idle');
        setSettings(newSettings);
        setSecondsLeft(getSessionDuration(sessionRef.current, newSettings));
    }, []);

    useEffect(() => {
        return () => clearTimer();
    }, []);

    return {
        state: { status, session, secondsLeft, completedPomodoros, settings },
        start,
        pause,
        reset,
        skip,
        updateSettings,
    };
}