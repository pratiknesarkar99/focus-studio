let intervalId: ReturnType<typeof setInterval> | null = null;

self.addEventListener('message', (e: MessageEvent<{ type: string }>) => {
    const { type } = e.data;

    if (type === 'START') {
        if (intervalId !== null) return;
        intervalId = setInterval(() => {
            self.postMessage({ type: 'TICK' });
        }, 1000);
    }

    if (type === 'STOP') {
        if (intervalId !== null) {
            clearInterval(intervalId);
            intervalId = null;
        }
    }
});