import { useState } from 'react';
import type { PomodoroSettings } from '../types';

interface Props {
    settings: PomodoroSettings;
    onSave: (s: PomodoroSettings) => void;
}

export function Settings({ settings, onSave }: Props) {
    const [draft, setDraft] = useState(settings);

    const field = (
        label: string,
        key: keyof PomodoroSettings,
        min: number,
        max: number,
        hint: string
    ) => (
        <div className="settings-field">
            <div className="settings-field-info">
                <label className="settings-label">{label}</label>
                <span className="settings-hint">{hint}</span>
            </div>
            <div className="settings-input-row">
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
        </div>
    );

    return (
        <div className="settings-panel-inline">
            <h3 className="panel-section-title">Session Durations</h3>
            <div className="settings-grid">
                {field('Focus', 'workDuration', 1, 90, 'Default 25 min')}
                {field('Short Break', 'shortBreakDuration', 1, 30, 'Default 5 min')}
                {field('Long Break', 'longBreakDuration', 1, 60, 'Default 10 min')}
                {field('Long Break Every', 'longBreakInterval', 2, 8, 'Sessions before long break')}
            </div>
            <button className="btn btn--primary settings-save" onClick={() => onSave(draft)}>
                Save and Close
            </button>
        </div>
    );
}