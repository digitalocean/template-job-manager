import { Mutex, withTimeout } from 'async-mutex';

/**
 * Mutex to handle race conditions with a timeout.
 */
const mutex = withTimeout(new Mutex(), 5000);

export const WorkerStatus = {
    STARTED: 'STARTED',
    STOPPED: 'STOPPED',
    RUNNING: 'RUNNING',
};

const WORKER_ALREADY_RUNNING = 'Worker is already running.';
const WORKER_NOT_RUNNING = 'Worker is not running.';
const WORKER_STARTED = 'Worker started.';
const WORKER_STOPPED = 'Worker stopped.';
const WORKER_ERROR = 'Worker encountered an error:';

export const workerStatus = {
    isRunning: false,
    status: WorkerStatus.STOPPED,
    message: 'Worker is currently stopped.',
};

/**
 * Runs the worker function in a loop while the worker is running.
 * @param {Function} workerFunction - The function to run as the worker.
 */
const runWorker = async (workerFunction) => {
    try {
        while (workerStatus.isRunning) {
            await mutex.runExclusive(async () => {
                if (!workerStatus.isRunning) {
                    return;
                }
                if (typeof workerFunction !== 'function') {
                    throw new TypeError('workerFunction must be a function');
                }
            });

            await workerFunction();
            await new Promise((resolve) => setTimeout(resolve, 5000)); // Wait for 5 seconds
        }
    } catch (error) {
        console.error(WORKER_ERROR, error);
        workerStatus.isRunning = false;
        workerStatus.status = WorkerStatus.STOPPED;
        workerStatus.message = `${WORKER_ERROR} ${error.message}`;
    }
};

/**
 * Starts the worker if it is not already running.
 * @param {Function} workerFunction - The function to run as the worker.
 * @returns {object} - The status object of the worker.
 */
export const startWorker = async (workerFunction) => {
    return mutex.runExclusive(async () => {
        if (workerStatus.isRunning) {
            console.log(WORKER_ALREADY_RUNNING);
            workerStatus.message = WORKER_ALREADY_RUNNING;
            return { ...workerStatus };
        }

        workerStatus.isRunning = true;
        workerStatus.status = WorkerStatus.STARTED;
        workerStatus.message = WORKER_STARTED;

        console.log(WORKER_STARTED);
        runWorker(workerFunction).catch((error) => {
            console.error(WORKER_ERROR, error);
        });

        return { ...workerStatus };
    });
};

/**
 * Stops the worker if it is running.
 * @returns {object} - The status object of the worker.
 */
export const stopWorker = async () => {
    return mutex.runExclusive(async () => {
        if (!workerStatus.isRunning) {
            console.log(WORKER_NOT_RUNNING);
            workerStatus.message = WORKER_NOT_RUNNING;
            return { ...workerStatus };
        }

        workerStatus.isRunning = false;
        workerStatus.status = WorkerStatus.STOPPED;
        workerStatus.message = WORKER_STOPPED;

        console.log(WORKER_STOPPED);
        return { ...workerStatus };
    });
};

/**
 * Gets the current status of the worker.
 * @returns {object} - The status object of the worker.
 */
export const getStatus = () => {
    return { ...workerStatus };
};
