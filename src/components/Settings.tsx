import { useState } from 'react';
import type { PomodoroSettings } from '../types';

interface Props {
    settings: PomodoroSettings;
    onSave: (s: PomodoroSettings) => void;
}

export function Settings({ settings, onSave }: Props) {
    const [open, setOpen] = useState(false);
    const [draft, setDraft] = useState(settings);

    const handleSave = () => {
        onSave(draft);
        setOpen(false);
    };

    const field = (
        label: string,
        key: keyof PomodoroSettings,
        min: number,
        max: number
    ) => (
        <div className="settings-field">
            <label className="settings-label">{label}</label>
            <input
                className="settings-input"
                type="number"
                min={min}
                max={max}
                value={draft[key]}
                onChange={e => setDraft(prev => ({ ...prev, [key]: Number(e.target.value) }))}
            />
            <span className="settings-unit">min</span>
        </div>
    );

    return (
        <div className="settings-wrapper">
            <button className="btn btn--ghost btn--small" onClick={() => setOpen(o => !o)}>
                {open ? 'Close' : 'Settings'}
            </button>

            {open && (
                <div className="settings-panel">
                    <h3 className="settings-title">Customize Durations</h3>
                    {field('Focus', 'workDuration', 1, 90)}
                    {field('Short Break', 'shortBreakDuration', 1, 30)}
                    {field('Long Break', 'longBreakDuration', 1, 60)}
                    {field('Long Break Every', 'longBreakInterval', 2, 8)}
                    <button className="btn btn--primary btn--full" onClick={handleSave}>
                        Save
                    </button>
                </div>
            )}
        </div>
    );
}