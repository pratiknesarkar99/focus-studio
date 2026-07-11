export function playSessionEndBeep(): void {
    try {
        const ctx = new AudioContext();

        const beep = (startTime: number, freq: number, duration: number) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.type = 'sine';
            osc.frequency.value = freq;
            gain.gain.setValueAtTime(0.25, startTime);
            gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
            osc.start(startTime);
            osc.stop(startTime + duration);
        };

        // Three ascending tones for a satisfying end cue
        beep(ctx.currentTime, 660, 0.15);
        beep(ctx.currentTime + 0.2, 880, 0.15);
        beep(ctx.currentTime + 0.4, 1100, 0.3);
    } catch {
        // AudioContext unavailable, fail silently
    }
}