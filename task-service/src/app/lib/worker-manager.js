import { LeaseOptions, Lease, LeaseReference } from '@job-manager/leases/LeasesClient';

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
 * @property {number} interval - The interval in milliseconds between executions.
 */
export const WorkerManagerConfig = {
    leaseClientOptions: null,
    interval: 5000,
};

/**
 * WorkerManager handles the execution of periodic tasks using a lease to
 * ensure safe state transitions and prevent race conditions.
 */
export class WorkerManager {
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
        if (typeof config.workerFunction !== 'function') {
            throw new TypeError('workerFunction must be a function');
        }

        this.#lease = new LeaseReference(config?.leaseClientOptions);
        this.#status = { ...WorkerStatusType };
        this.#workerFunction = config.workerFunction;
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
     * Starts the worker.
     * @returns {Promise<WorkerStatusType>} The updated worker status.
     */
    async start() {
        if (this.#status.isRunning) {
            console.log(WorkerMessages.ALREADY_RUNNING);
            return { ...this.#status, message: WorkerMessages.ALREADY_RUNNING };
        }


        try {
            const result = await this.#lease.acquire();
            if (result?.error) {
                this.#setStatus(this.#status?.isRunning || false, this.#status?.status || WorkerStatus.STOPPED, result.error);
                return this.#status;
            }

            this.#setStatus(true, WorkerStatus.STARTED, WorkerMessages.STARTED);
            console.log(WorkerMessages.STARTED);

            // Schedule the worker function to run on an interval
            this.#intervalId = setInterval(async () => {
                try {
                    if (!this.#status.isRunning) return;

                    // Execute the worker function and handle its result
                    const result = await this.#workerFunction();

                    if (result?.stop) {
                        await this.#internalStop();
                        return;
                    }

                    if (this.#status.status === WorkerStatus.STARTED) {
                        // carry over the custom message if it exists, otherwise default to 'Worker started.'
                        const newMessage = result?.message || WorkerMessages.STARTED;
                        this.#setStatus(true, WorkerStatus.RUNNING, newMessage);
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

