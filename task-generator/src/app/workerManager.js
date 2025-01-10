import { Mutex } from 'async-mutex';

// Enum for worker statuses
export const WorkerStatus = {
    STARTED: 'STARTED',
    STOPPED: 'STOPPED',
    RUNNING: 'RUNNING',
};

// Messages used for worker status updates and logs
export const WorkerMessages = {
    ALREADY_RUNNING: 'Worker is already running.',
    NOT_RUNNING: 'Worker is not running.',
    STARTED: 'Worker started.',
    STOPPED: 'Worker stopped.',
    ERROR: 'Worker encountered an error:',
};

/**
 * WorkerManager handles the execution of periodic tasks using a mutex to
 * ensure safe state transitions and prevent race conditions.
 */
export default class WorkerManager {
    #mutex; // Mutex for thread-safe operations
    #status; // Current status of the worker
    #workerFunction; // Function executed periodically by the worker
    #interval; // Interval in milliseconds between executions
    #intervalId; // ID of the interval timer

    // Singleton instance of WorkerManager
    static instance = new WorkerManager();

    constructor() {
        this.#mutex = new Mutex();
        this.#status = {
            isRunning: false,
            status: WorkerStatus.STOPPED,
            message: WorkerMessages.NOT_RUNNING,
        };
        this.#workerFunction = null;
        this.#interval = 5000; // Default interval of 5 seconds
        this.#intervalId = null;
    }

    /**
     * Retrieves the current status of the worker.
     * @returns {Promise<object>} The current worker status.
     */
    async getStatus() {
        return this.#mutex.runExclusive(() => ({ ...this.#status }));
    }

    /**
     * Starts the worker with the specified function and interval.
     * @param {function} workerFunction - The function to execute periodically. It can optionally return an object with:
     *   - `stop` (boolean): If true, the worker stops execution.
     *   - `message` (string): A custom message to update the worker status.
     * @param {number} interval - The interval in milliseconds between executions.
     * @returns {Promise<object>} The updated worker status.
     */
    async start(workerFunction, interval = 5000) {
        return this.#mutex.runExclusive(() => {
            if (this.#status.isRunning) {
                console.log(WorkerMessages.ALREADY_RUNNING);
                return { ...this.#status, message: WorkerMessages.ALREADY_RUNNING };
            }

            if (typeof workerFunction !== 'function') {
                throw new TypeError('workerFunction must be a function');
            }

            this.#workerFunction = workerFunction;
            this.#interval = interval;

            this.#setStatus(true, WorkerStatus.STARTED, WorkerMessages.STARTED);

            console.log(WorkerMessages.STARTED);

            // Schedule the worker function to run on an interval
            this.#intervalId = setInterval(async () => {
                try {
                    await this.#mutex.runExclusive(async () => {
                        if (!this.#status.isRunning) return;

                        try {
                            // Execute the worker function and handle its result
                            const result = await this.#workerFunction();

                            if (result?.stop) {
                                await this.#internalStop();
                                return;
                            }

                            if (result?.message) {
                                this.#setStatus(true, this.#status.status, result.message);
                            }
                        } catch (error) {
                            console.error(WorkerMessages.ERROR, error);
                        }
                    });

                    // Transition to RUNNING after the first execution if no message override
                    if (this.#status.status === WorkerStatus.STARTED) {
                        this.#setStatus(true, WorkerStatus.RUNNING, WorkerMessages.STARTED);
                    }
                } catch (error) {
                    console.error(WorkerMessages.ERROR, error);
                }
            }, this.#interval);

            return { ...this.#status };
        });
    }

    /**
     * Stops the worker and clears the interval.
     * @returns {Promise<object>} The updated worker status.
     */
    async stop() {
        return this.#mutex.runExclusive(() => {
            if (!this.#status.isRunning) {
                console.log(WorkerMessages.NOT_RUNNING);
                return { ...this.#status, message: WorkerMessages.NOT_RUNNING };
            }

            return this.#internalStop();
        });
    }

    /**
     * Internal method to stop the worker without acquiring the mutex.
     */
    async #internalStop() {
        if (this.#intervalId) {
            clearInterval(this.#intervalId);
            this.#intervalId = null;
        }

        this.#setStatus(false, WorkerStatus.STOPPED, WorkerMessages.STOPPED);
        console.log(WorkerMessages.STOPPED);

        return { ...this.#status };
    }

    /**
     * Static method to start the worker via the singleton instance.
     * @param {function} workerFunction - The function to execute periodically.
     * @param {number} interval - The interval in milliseconds between executions.
     * @returns {Promise<object>} The updated worker status.
     */
    static async startWorker(workerFunction, interval) {
        return WorkerManager.instance.start(workerFunction, interval);
    }

    /**
     * Static method to stop the worker via the singleton instance.
     * @returns {Promise<object>} The updated worker status.
     */
    static async stopWorker() {
        return WorkerManager.instance.stop();
    }

    /**
     * Static method to get the current status via the singleton instance.
     * @returns {Promise<object>} The current worker status.
     */
    static async getStatus() {
        return WorkerManager.instance.getStatus();
    }

    /**
     * Updates the internal worker status.
     * @param {boolean} isRunning - Indicates whether the worker is running.
     * @param {WorkerStatus} status - The current worker status.
     * @param {string} message - A message describing the status.
     */
    #setStatus(isRunning, status, message) {
        if (!Object.values(WorkerStatus).includes(status)) {
            throw new Error(`Invalid status: ${status}`);
        }

        this.#status = {
            isRunning,
            status,
            message,
        };
    }
}
