import { useCallback } from 'react';
import { db } from '../db/schema';

export interface DailyFocus {
    date: string;   // 'Mon 7', 'Tue 8', etc.
    focusMins: number;
    sessions: number;
}

export interface HourlyBucket {
    hour: number;   // 0-23
    label: string;   // '9am', '2pm'
    sessions: number;
}

export interface TagBreakdown {
    tag: string;
    sessions: number;
    focusMins: number;
}

export interface AnalyticsSummary {
    totalSessions: number;
    totalFocusMins: number;
    completionRate: number;   // 0-100
    currentStreak: number;   // days
    dailyFocus: DailyFocus[];
    hourlyActivity: HourlyBucket[];
    tagBreakdown: TagBreakdown[];
}

function formatDay(ts: number): string {
    return new Date(ts).toLocaleDateString([], { weekday: 'short', day: 'numeric' });
}

function hourLabel(h: number): string {
    if (h === 0) return '12am';
    if (h === 12) return '12pm';
    return h < 12 ? `${h}am` : `${h - 12}pm`;
}

function startOfDay(ts: number): number {
    const d = new Date(ts);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
}

export function useAnalytics() {
    const computeSummary = useCallback(async (days = 14): Promise<AnalyticsSummary> => {
        const since = Date.now() - days * 24 * 60 * 60 * 1000;
        const all = await db.sessions.where('completedAt').above(since).toArray();

        const workAll = all.filter(s => s.sessionType === 'work');
        const workCompleted = workAll.filter(s => s.wasCompleted);

        // --- Completion rate ---
        const completionRate = workAll.length === 0
            ? 0
            : Math.round((workCompleted.length / workAll.length) * 100);

        // --- Total focus ---
        const totalFocusMins = Math.round(
            workCompleted.reduce((acc, s) => acc + s.durationSecs, 0) / 60
        );

        // --- Daily focus (last 14 days) ---
        const dayMap = new Map<string, { focusMins: number; sessions: number; ts: number }>();

        for (let i = days - 1; i >= 0; i--) {
            const ts = Date.now() - i * 24 * 60 * 60 * 1000;
            const key = formatDay(ts);
            dayMap.set(key, { focusMins: 0, sessions: 0, ts });
        }

        for (const s of workCompleted) {
            const key = formatDay(s.completedAt);
            if (dayMap.has(key)) {
                const entry = dayMap.get(key)!;
                entry.focusMins += Math.round(s.durationSecs / 60);
                entry.sessions += 1;
            }
        }

        const dailyFocus: DailyFocus[] = Array.from(dayMap.entries()).map(([date, v]) => ({
            date,
            focusMins: v.focusMins,
            sessions: v.sessions,
        }));

        // --- Hourly activity ---
        const hourCounts = new Array(24).fill(0);
        for (const s of workCompleted) {
            const h = new Date(s.completedAt).getHours();
            hourCounts[h] += 1;
        }

        const hourlyActivity: HourlyBucket[] = hourCounts.map((count, h) => ({
            hour: h,
            label: hourLabel(h),
            sessions: count,
        }));

        // --- Streak ---
        const activeDays = new Set(
            workCompleted.map(s => startOfDay(s.completedAt))
        );

        let streak = 0;
        let cursor = startOfDay(Date.now());

        while (activeDays.has(cursor)) {
            streak++;
            cursor -= 24 * 60 * 60 * 1000;
        }

        // --- Tag breakdown ---
        const tagMap = new Map<string, { sessions: number; focusMins: number }>();
        for (const s of workCompleted) {
            const tag = s.taskTag || 'Untagged';
            if (!tagMap.has(tag)) tagMap.set(tag, { sessions: 0, focusMins: 0 });
            const entry = tagMap.get(tag)!;
            entry.sessions += 1;
            entry.focusMins += Math.round(s.durationSecs / 60);
        }

        const tagBreakdown: TagBreakdown[] = Array.from(tagMap.entries())
            .map(([tag, v]) => ({ tag, ...v }))
            .sort((a, b) => b.sessions - a.sessions);

        return {
            totalSessions: workCompleted.length,
            totalFocusMins,
            completionRate,
            currentStreak: streak,
            dailyFocus,
            hourlyActivity,
            tagBreakdown,
        };
    }, []);

    return { computeSummary };
}