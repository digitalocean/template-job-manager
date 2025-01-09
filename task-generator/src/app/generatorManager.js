import { Worker } from 'worker_threads';

let worker = null;

export const startGenerator = async () => {
    if (worker) {
        console.log('Generator is already running.');
        return { status: 'Generator is already running.' };
    }

    try {
        worker = new Worker('./generator.js');
        console.log('Generator started.');

        worker.on('error', (err) => {
            console.error('Generator error:', err);
            worker.terminate();
            worker = null;
        });

        worker.on('exit', (code) => {
            console.log(`Generator stopped with exit code ${code}`);
            worker = null; // Reset Generator instance
        });

        worker.postMessage('start');
        return { status: 'Generator started.' };
    } catch (error) {
        console.error('Failed to start generator:', error);
        worker = null;
        return { status: 'Failed to start generator.', error };
    }
};

export const stopGenerator = async () => {
    if (!worker) {
        console.log('Generator is not running.');
        return { status: 'Generator is not running.' };
    }

    try {
        worker.postMessage('stop');
        await new Promise((resolve) => {
            worker.on('exit', resolve);
        });
        console.log('Generator stopped.');
        return { status: 'Generator stopped.' };
    } catch (error) {
        console.error('Failed to stop generator:', error);
        return { status: 'Failed to stop generator.', error };
    }
};