
let timer = null;
let isRunning = false;

self.onmessage = function(e) {
    const { action, currentTime: newTime } = e.data;

    if (action === 'start') {
        if (!isRunning) {
            isRunning = true;
            let currentTime = newTime;
            timer = setInterval(() => {
                currentTime--;
                self.postMessage({ type: 'tick', currentTime });
                if (currentTime <= 0) {
                    clearInterval(timer);
                    timer = null;
                    isRunning = false;
                    self.postMessage({ type: 'completed' });
                }
            }, 1000);
        }
    } else if (action === 'pause') {
        if (isRunning) {
            clearInterval(timer);
            timer = null;
            isRunning = false;
        }
    } else if (action === 'reset') {
        if (timer) {
            clearInterval(timer);
            timer = null;
        }
        isRunning = false;
    }
};
