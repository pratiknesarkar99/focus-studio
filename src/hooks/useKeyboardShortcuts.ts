import { useEffect } from 'react';
import type { TimerStatus } from '../types';

interface Handlers {
    status: TimerStatus;
    onStart: () => void;
    onPause: () => void;
    onReset: () => void;
    onSkip: () => void;
}

export function useKeyboardShortcuts({ status, onStart, onPause, onReset, onSkip }: Handlers) {
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            // Ignore if user is typing in an input
            const tag = (e.target as HTMLElement).tagName;
            if (tag === 'INPUT' || tag === 'TEXTAREA') return;

            switch (e.key) {
                case ' ':
                    e.preventDefault();
                    status === 'running' ? onPause() : onStart();
                    break;
                case 'r':
                case 'R':
                    onReset();
                    break;
                case 's':
                case 'S':
                    onSkip();
                    break;
            }
        };

        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [status, onStart, onPause, onReset, onSkip]);
}