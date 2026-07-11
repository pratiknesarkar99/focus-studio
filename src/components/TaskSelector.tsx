const SUGGESTED_TAGS = [
    'Deep Work',
    'Job Applications',
    'Portfolio',
    'Learning',
    'Emails',
    'Planning',
];

interface Props {
    value: string;
    onChange: (tag: string) => void;
    disabled: boolean;
}

export function TaskSelector({ value, onChange, disabled }: Props) {
    return (
        <div className="task-selector">
            <label className="task-label">Session tag</label>
            <div className="task-input-row">
                <input
                    className="task-input"
                    type="text"
                    placeholder="What are you working on? (optional)"
                    value={value}
                    onChange={e => onChange(e.target.value)}
                    disabled={disabled}
                    maxLength={40}
                />
            </div>
            {!disabled && (
                <div className="task-suggestions">
                    {SUGGESTED_TAGS.map(tag => (
                        <button
                            key={tag}
                            className={`task-chip ${value === tag ? 'task-chip--active' : ''}`}
                            onClick={() => onChange(value === tag ? '' : tag)}
                        >
                            {tag}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}