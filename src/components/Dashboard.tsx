import { useEffect, useState } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, Tooltip,
    ResponsiveContainer, Cell,
} from 'recharts';
import { useAnalytics, type AnalyticsSummary } from '../hooks/useAnalytics';

interface Props {
    refreshKey: number;
}

const ACCENT = '#7c6af7';
const BREAK_COLOR = '#4aaed9';
const MUTED = '#2e2e3e';
const TEXT_MUTED = '#6b6b80';

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
    return (
        <div className="stat-card">
            <span className="stat-value">{value}</span>
            <span className="stat-label">{label}</span>
            {sub && <span className="stat-sub">{sub}</span>}
        </div>
    );
}

export function Dashboard({ refreshKey }: Props) {
    const [open, setOpen] = useState(false);
    const [data, setData] = useState<AnalyticsSummary | null>(null);
    const [loading, setLoading] = useState(false);
    const { computeSummary } = useAnalytics();

    useEffect(() => {
        if (!open) return;
        setLoading(true);
        computeSummary(14).then(s => {
            setData(s);
            setLoading(false);
        });
    }, [open, refreshKey, computeSummary]);

    return (
        <div className="dashboard-wrapper">
            <button className="btn btn--ghost btn--small" onClick={() => setOpen(o => !o)}>
                {open ? 'Hide Stats' : 'Stats'}
            </button>

            {open && (
                <div className="dashboard">
                    <h3 className="dashboard-title">Last 14 Days</h3>

                    {loading && <p className="dashboard-loading">Computing...</p>}

                    {!loading && data && (
                        <>
                            {/* Stat row */}
                            <div className="stat-row">
                                <StatCard
                                    label="Focus sessions"
                                    value={data.totalSessions}
                                />
                                <StatCard
                                    label="Focus time"
                                    value={`${data.totalFocusMins}m`}
                                />
                                <StatCard
                                    label="Completion"
                                    value={`${data.completionRate}%`}
                                />
                                <StatCard
                                    label="Streak"
                                    value={`${data.currentStreak}d`}
                                    sub={data.currentStreak >= 3 ? 'Keep going' : ''}
                                />
                            </div>

                            {/* Daily focus bar chart */}
                            <div className="chart-section">
                                <h4 className="chart-label">Daily focus (minutes)</h4>
                                <ResponsiveContainer width="100%" height={140}>
                                    <BarChart data={data.dailyFocus} barSize={14}>
                                        <XAxis
                                            dataKey="date"
                                            tick={{ fill: TEXT_MUTED, fontSize: 10 }}
                                            axisLine={false}
                                            tickLine={false}
                                            interval={1}
                                        />
                                        <YAxis hide />
                                        <Tooltip
                                            contentStyle={{
                                                background: '#1a1a22',
                                                border: '1px solid #2e2e3e',
                                                borderRadius: 8,
                                                fontSize: 12,
                                                color: '#e8e8f0',
                                            }}
                                            formatter={(v: number) => [`${v} min`, 'Focus']}
                                        />
                                        <Bar dataKey="focusMins" radius={[4, 4, 0, 0]}>
                                            {data.dailyFocus.map((entry, i) => (
                                                <Cell
                                                    key={i}
                                                    fill={entry.focusMins > 0 ? ACCENT : MUTED}
                                                />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>

                            {/* Hourly heatmap row */}
                            <div className="chart-section">
                                <h4 className="chart-label">Activity by hour</h4>
                                <div className="hour-grid">
                                    {data.hourlyActivity.map(h => {
                                        const max = Math.max(...data.hourlyActivity.map(x => x.sessions), 1);
                                        const opacity = h.sessions === 0 ? 0.08 : 0.2 + (h.sessions / max) * 0.8;
                                        return (
                                            <div
                                                key={h.hour}
                                                className="hour-cell"
                                                title={`${h.label}: ${h.sessions} session${h.sessions !== 1 ? 's' : ''}`}
                                                style={{ background: `rgba(124, 106, 247, ${opacity})` }}
                                            >
                                                {[6, 9, 12, 15, 18, 21].includes(h.hour) && (
                                                    <span className="hour-cell-label">{h.label}</span>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Tag breakdown */}
                            {data.tagBreakdown.length > 0 && (
                                <div className="chart-section">
                                    <h4 className="chart-label">Sessions by tag</h4>
                                    <ResponsiveContainer width="100%" height={Math.min(data.tagBreakdown.length * 36 + 20, 200)}>
                                        <BarChart
                                            data={data.tagBreakdown}
                                            layout="vertical"
                                            barSize={12}
                                            margin={{ left: 8 }}
                                        >
                                            <XAxis type="number" hide />
                                            <YAxis
                                                type="category"
                                                dataKey="tag"
                                                width={90}
                                                tick={{ fill: TEXT_MUTED, fontSize: 11 }}
                                                axisLine={false}
                                                tickLine={false}
                                            />
                                            <Tooltip
                                                contentStyle={{
                                                    background: '#1a1a22',
                                                    border: '1px solid #2e2e3e',
                                                    borderRadius: 8,
                                                    fontSize: 12,
                                                    color: '#e8e8f0',
                                                }}
                                                formatter={(v: number) => [`${v} sessions`, '']}
                                            />
                                            <Bar dataKey="sessions" fill={BREAK_COLOR} radius={[0, 4, 4, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            )}

                            {data.totalSessions === 0 && (
                                <p className="dashboard-empty">
                                    Complete a few focus sessions to see your patterns here.
                                </p>
                            )}
                        </>
                    )}
                </div>
            )}
        </div>
    );
}