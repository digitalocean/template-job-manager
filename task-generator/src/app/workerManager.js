import { Mutex } from 'async-mutex';

export const WorkerStatus = {
    STARTED: 'STARTED',
    STOPPED: 'STOPPED',
    RUNNING: 'RUNNING',
};

export const WorkerMessages = {
    ALREADY_RUNNING: 'Worker is already running.',
    NOT_RUNNING: 'Worker is not running.',
    STARTED: 'Worker started.',
    STOPPED: 'Worker stopped.',
    ERROR: 'Worker encountered an error:',
};

export default class WorkerManager {
    #mutex;
    #status;
    #workerFunction;
    #interval;
    #intervalId;

    static instance = new WorkerManager();

    constructor() {
        this.#mutex = new Mutex();
        this.#status = {
            isRunning: false,
            status: WorkerStatus.STOPPED,
            message: WorkerMessages.NOT_RUNNING,
        };
        this.#workerFunction = null;
        this.#interval = 5000;
        this.#intervalId = null;
    }

    async getStatus() {
        return this.#mutex.runExclusive(() => ({ ...this.#status }));
    }

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
                            await this.#workerFunction();
                        } catch (error) {
                            console.error(WorkerMessages.ERROR, error);
                        }
                    });

                    // Transition to RUNNING after the first execution
                    this.#setStatus(true, WorkerStatus.RUNNING, WorkerMessages.STARTED);
                } catch (error) {
                    console.error(WorkerMessages.ERROR, error);
                }
            }, this.#interval);

            return { ...this.#status };
        });
    }

    async stop() {
        return this.#mutex.runExclusive(() => {
            if (!this.#status.isRunning) {
                console.log(WorkerMessages.NOT_RUNNING);
                return { ...this.#status, message: WorkerMessages.NOT_RUNNING };
            }

            if (this.#intervalId) {
                clearInterval(this.#intervalId);
                this.#intervalId = null;
            }

            this.#setStatus(false, WorkerStatus.STOPPED, WorkerMessages.STOPPED);
            console.log(WorkerMessages.STOPPED);

            return { ...this.#status };
        });
    }

    static async startWorker(workerFunction, interval) {
        return WorkerManager.instance.start(workerFunction, interval);
    }

    static async stopWorker() {
        return WorkerManager.instance.stop();
    }

    static async getStatus() {
        return WorkerManager.instance.getStatus();
    }

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
