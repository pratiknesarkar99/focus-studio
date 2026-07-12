import { useInsights } from '../hooks/useInsights';
import type { AnalyticsSummary } from '../hooks/useAnalytics';

interface Props {
    summary: AnalyticsSummary | null;
}

export function AIInsights({ summary }: Props) {
    const { state, generate, reset } = useInsights();

    const handleGenerate = () => {
        if (summary) generate(summary);
    };

    return (
        <div className="ai-insights">
            <div className="ai-insights-header">
                <h4 className="chart-label">AI Insights</h4>
                {state.status === 'done' && (
                    <button className="btn btn--ghost btn--small" onClick={reset}>
                        Clear
                    </button>
                )}
                {state.status === 'error' && (
                    <button className="btn btn--ghost btn--small" onClick={reset}>
                        Retry
                    </button>
                )}
            </div>

            {state.status === 'idle' && (
                <div className="ai-idle">
                    <p className="ai-note">
                        Runs a small language model (~670 MB) entirely in your browser.
                        No data leaves your device. Downloads once, then cached.
                    </p>
                    <button
                        className="btn btn--primary btn--small"
                        onClick={handleGenerate}
                        disabled={!summary}
                    >
                        Generate Insights
                    </button>
                </div>
            )}

            {state.status === 'loading-model' && (
                <div className="ai-loading">
                    <div className="ai-progress-track">
                        <div
                            className="ai-progress-fill"
                            style={{ width: `${state.progress}%` }}
                        />
                    </div>
                    <p className="ai-note">
                        Downloading model... {state.progress}%
                    </p>
                </div>
            )}

            {state.status === 'generating' && (
                <p className="ai-note ai-note--pulse">Generating insights...</p>
            )}

            {state.status === 'done' && state.insights.length > 0 && (
                <ul className="ai-insight-list">
                    {state.insights.map((insight, i) => (
                        <li key={i} className="ai-insight-item">
                            <span className="ai-insight-dot" />
                            {insight}
                        </li>
                    ))}
                </ul>
            )}

            {state.status === 'error' && (
                <p className="ai-error">{state.error}</p>
            )}
        </div>
    );
}