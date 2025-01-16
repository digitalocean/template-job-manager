import { LeaseReference, LeaseOptions, RenewConfig } from '../../../leases/src/app/lib/leases-client.js';


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
 * @typedef {Object} WorkerStatusType
 * @property {boolean} isRunning - Indicates whether the worker is running.
 * @property {string} status - The current worker status.
 * @property {string} message - A message describing the status.
 */
export const WorkerStatusType = {
    isRunning: false,
    status: WorkerStatus.STOPPED,
    message: WorkerMessages.NOT_RUNNING,
};

/**
 * @typedef {Object} WorkerManagerConfig
 * @property {LeaseOptions} leaseClientOptions - The configuration for the underlying leases client.
 * @property {string} resource - The resource to lease.
 * @property {string} holder - The holder of the lease.
 * @property {number} interval - The interval in milliseconds between executions.
 */
export const WorkerManagerConfig = {
    leaseClientOptions: LeaseOptions,
    interval: 5000,
};

/**
 * WorkerManager handles the execution of periodic tasks using a lease to
 * ensure safe state transitions and prevent race conditions.
 */
export default class WorkerManager {
    /** @type {LeaseReference} */
    #lease; // Lease for thread-safe operations
    /** @type {WorkerStatusType} */
    #status; // Current status of the worker
    /** @type {function | null} */
    #workerFunction; // Function executed periodically by the worker
    /** @type {number} */
    #interval; // Interval in milliseconds between executions
    /** @type {NodeJS.Timeout | null} */
    #intervalId; // ID of the interval timer

    /**
     * @param {WorkerManagerConfig} config - The configuration object for the worker manager.
     */
    constructor(config) {
        config = config || { ...WorkerManagerConfig };

        this.#lease = new LeaseReference(config?.leaseClientOptions || { ...LeaseOptions });
        this.#status = { ...WorkerStatusType };
        this.#workerFunction = null;
        this.#interval = config.interval; // Default interval of 5 seconds
        this.#intervalId = null;
    }

    /**
     * Retrieves the current status of the worker.
     * @returns {Promise<WorkerStatusType>} The current worker status.
     */
    async getStatus() {
        return { ...this.#status };
    }

    /**
     * Starts the worker with the specified function and interval.
     * @param {function} workerFunction - The function to execute periodically. It can optionally return an object with:
     *   - `stop` (boolean): If true, the worker stops execution.
     *   - `message` (string): A custom message to update the worker status.
     * @param {number} [interval=5000] - The interval in milliseconds between executions.
     * @returns {Promise<WorkerStatusType>} The updated worker status.
     */
    async start(workerFunction, interval = 5000) {
        if (this.#status.isRunning) {
            console.log(WorkerMessages.ALREADY_RUNNING);
            return { ...this.#status, message: WorkerMessages.ALREADY_RUNNING };
        }

        if (typeof workerFunction !== 'function') {
            throw new TypeError('workerFunction must be a function');
        }

        this.#workerFunction = workerFunction;
        this.#interval = interval;

        try {
            await this.#lease.acquire();
            this.#setStatus(true, WorkerStatus.STARTED, WorkerMessages.STARTED);
            console.log(WorkerMessages.STARTED);

            // Schedule the worker function to run on an interval
            this.#intervalId = setInterval(async () => {
                try {
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

                    // Transition to RUNNING after the first execution if no message override
                    if (this.#status.status === WorkerStatus.STARTED) {
                        this.#setStatus(true, WorkerStatus.RUNNING, WorkerMessages.STARTED);
                    }
                } catch (error) {
                    console.error(WorkerMessages.ERROR, error);
                }
            }, this.#interval);

            return { ...this.#status };
        } catch (error) {
            console.error(WorkerMessages.ERROR, error);
            throw error;
        }
    }

    /**
     * Stops the worker and clears the interval.
     * @returns {Promise<WorkerStatusType>} The updated worker status.
     */
    async stop() {
        if (!this.#status.isRunning) {
            console.log(WorkerMessages.NOT_RUNNING);
            return { ...this.#status, message: WorkerMessages.NOT_RUNNING };
        }

        return this.#internalStop();
    }

    /**
     * Internal method to stop the worker without acquiring the mutex.
     */
    async #internalStop() {
        if (this.#intervalId) {
            clearInterval(this.#intervalId);
            this.#intervalId = null;
        }

        await this.#lease.release();
        this.#setStatus(false, WorkerStatus.STOPPED, WorkerMessages.STOPPED);
        console.log(WorkerMessages.STOPPED);

        return { ...this.#status };
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

