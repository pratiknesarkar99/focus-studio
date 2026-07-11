interface Props {
    drift: number;   // seconds behind wall clock
    show: boolean;
}

export function DriftIndicator({ drift, show }: Props) {
    if (!show) return null;

    const isSignificant = drift >= 1;

    return (
        <div className={`drift-indicator ${isSignificant ? 'drift-indicator--warn' : ''}`}>
            <span className="drift-label">Timer drift</span>
            <span className="drift-value">
                {drift < 0.1 ? '~0.0s' : `+${drift.toFixed(1)}s`}
            </span>
            {isSignificant && (
                <span className="drift-note">Tab throttling detected</span>
            )}
        </div>
    );
}