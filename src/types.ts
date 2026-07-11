export type SessionType = 'work' | 'shortBreak' | 'longBreak';

export type TimerStatus = 'idle' | 'running' | 'paused';

export interface PomodoroSettings {
    workDuration: number;       // minutes
    shortBreakDuration: number;
    longBreakDuration: number;
    longBreakInterval: number;  // every N completed work sessions
}

export interface PomodoroState {
    status: TimerStatus;
    session: SessionType;
    secondsLeft: number;
    completedPomodoros: number;
    settings: PomodoroSettings;
}

export const DEFAULT_SETTINGS: PomodoroSettings = {
    workDuration: 25,
    shortBreakDuration: 5,
    longBreakDuration: 10,
    longBreakInterval: 4,
};