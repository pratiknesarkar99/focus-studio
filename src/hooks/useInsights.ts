import { useState, useCallback } from 'react';
import type { AnalyticsSummary } from './useAnalytics';

export type InsightStatus = 'idle' | 'loading-model' | 'generating' | 'done' | 'error';

export interface InsightState {
    status: InsightStatus;
    progress: number;      // 0-100 during model download
    insights: string[];    // final output sentences
    error: string | null;
}

// Module-level singleton: model downloads once per browser session,
// not once per component mount.
let _pipe: any = null;

function buildPrompt(summary: AnalyticsSummary): string {
    const topHour = [...summary.hourlyActivity]
        .sort((a, b) => b.sessions - a.sessions)[0];

    const topTag = summary.tagBreakdown[0];

    const stats = [
        `Focus sessions completed: ${summary.totalSessions}`,
        `Total focus time: ${summary.totalFocusMins} minutes`,
        `Session completion rate: ${summary.completionRate}%`,
        `Current streak: ${summary.currentStreak} days`,
        topHour?.sessions > 0
            ? `Most active hour: ${topHour.label} (${topHour.sessions} sessions)`
            : null,
        topTag
            ? `Top project: ${topTag.tag} (${topTag.sessions} sessions, ${topTag.focusMins} min)`
            : null,
    ].filter(Boolean).join('\n');

    // TinyLlama chat format
    return [
        '<|system|>',
        'You are a productivity coach. Based on the stats below, write exactly 2 specific',
        'one-sentence insights about this person\'s focus patterns.',
        'Each insight must be under 20 words. Separate them with a newline. No bullet points.',
        '</s>',
        '<|user|>',
        stats,
        '</s>',
        '<|assistant|>',
    ].join('\n');
}

export function useInsights() {
    const [state, setState] = useState<InsightState>({
        status: 'idle',
        progress: 0,
        insights: [],
        error: null,
    });

    const generate = useCallback(async (summary: AnalyticsSummary) => {
        if (summary.totalSessions === 0) {
            setState({
                status: 'done',
                progress: 100,
                insights: ['Complete a few focus sessions to see AI insights about your patterns.'],
                error: null,
            });
            return;
        }

        try {
            if (!_pipe) {
                setState({ status: 'loading-model', progress: 0, insights: [], error: null });

                const { pipeline, env } = await import('@xenova/transformers');

                // Always fetch from Hugging Face CDN, never look for local files
                env.allowLocalModels = false;

                _pipe = await pipeline(
                    'text-generation',
                    'Xenova/TinyLlama-1.1B-Chat-v1.0',
                    {
                        progress_callback: (p: any) => {
                            if (p.status === 'downloading') {
                                const pct = p.total > 0 ? Math.round((p.loaded / p.total) * 100) : 0;
                                setState(s => ({ ...s, progress: pct }));
                            }
                        },
                    }
                );
            }

            setState(s => ({ ...s, status: 'generating', progress: 100 }));

            const prompt = buildPrompt(summary);

            const result = await _pipe(prompt, {
                max_new_tokens: 120,
                temperature: 0.7,
                repetition_penalty: 1.3,
                do_sample: true,
            });

            const raw = (result[0]?.generated_text ?? '') as string;
            const after = raw.split('<|assistant|>').pop() ?? '';
            const sentences = after
                .split('\n')
                .map((s: string) => s.trim())
                .filter((s: string) => s.length > 15 && !s.startsWith('<'));

            setState({
                status: 'done',
                progress: 100,
                insights: sentences.slice(0, 3),
                error: null,
            });
        } catch {
            setState(s => ({
                ...s,
                status: 'error',
                error: 'Model failed to load. Your browser may not support WebAssembly, or the download was interrupted.',
            }));
        }
    }, []);

    const reset = useCallback(() => {
        setState({ status: 'idle', progress: 0, insights: [], error: null });
    }, []);

    return { state, generate, reset };
}