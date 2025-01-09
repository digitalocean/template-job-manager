import { parentPort } from 'worker_threads';

const MESSAGE_START = 'start';
const MESSAGE_STOP = 'stop';

let intervalId = null;

parentPort.on('message', (message) => {
    try {
        if (message === MESSAGE_START) {
            if (!intervalId) {
                intervalId = setInterval(() => {
                    console.log('Background task is running...');
                }, 5000); // Runs every 5 seconds
            }
        } else if (message === MESSAGE_STOP) {
            if (intervalId) {
                clearInterval(intervalId);
                intervalId = null;
            }
            console.log('Stopping generator...');
        }
    } catch (error) {
        console.error('Error handling message:', error);
    }
});