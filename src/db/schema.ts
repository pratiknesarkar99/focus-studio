import Dexie, { type Table } from 'dexie';

export interface Session {
    id?: number;
    taskTag: string;         // user-provided label, empty string if untagged
    sessionType: 'work' | 'shortBreak' | 'longBreak';
    durationSecs: number;         // planned duration
    completedAt: number;         // Date.now() timestamp
    wasCompleted: boolean;        // false if skipped before end
}

export class FocusStudioDB extends Dexie {
    sessions!: Table<Session, number>;

    constructor() {
        super('focus-studio');
        this.version(1).stores({
            sessions: '++id, taskTag, sessionType, completedAt, wasCompleted',
        });
    }
}

export const db = new FocusStudioDB();