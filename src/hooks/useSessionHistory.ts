import { useCallback } from 'react';
import { db, type Session } from '../db/schema';

export interface SaveSessionParams {
    taskTag: string;
    sessionType: Session['sessionType'];
    durationSecs: number;
    wasCompleted: boolean;
}

export function useSessionHistory() {
    const saveSession = useCallback(async (params: SaveSessionParams) => {
        await db.sessions.add({
            ...params,
            completedAt: Date.now(),
        });
    }, []);

    const getRecentSessions = useCallback(async (days = 7): Promise<Session[]> => {
        const since = Date.now() - days * 24 * 60 * 60 * 1000;
        return db.sessions
            .where('completedAt')
            .above(since)
            .reverse()
            .sortBy('completedAt');
    }, []);

    const clearAll = useCallback(async () => {
        await db.sessions.clear();
    }, []);

    return { saveSession, getRecentSessions, clearAll };
}