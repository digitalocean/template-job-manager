import '@testing-library/jest-dom'
import { startWorker, stopWorker, getStatus, WorkerStatus } from '@/app/workerManager';


describe('Worker Manager', () => {
    let workerFunction;

    beforeEach(() => {
        workerFunction = jest.fn().mockResolvedValue();
    });

    afterEach(async () => {
        await stopWorker();
    });

    it('should start the worker if not already running', async () => {
        const status = await startWorker(workerFunction);

        expect(status.isRunning).toBe(true);
        expect(status.status).toBe(WorkerStatus.STARTED);
        expect(status.message).toBe('Worker started.');
    });

    it('should not start the worker if already running', async () => {
        await startWorker(workerFunction);
        const status = await startWorker(workerFunction);

        expect(status.isRunning).toBe(true);
        expect(status.status).toBe(WorkerStatus.STARTED);
        expect(status.message).toBe('Worker is already running.');
    });

    it('should stop the worker if it is running', async () => {
        await startWorker(workerFunction);
        const status = await stopWorker();

        expect(status.isRunning).toBe(false);
        expect(status.status).toBe(WorkerStatus.STOPPED);
        expect(status.message).toBe('Worker stopped.');
    });

    it('should not stop the worker if it is not running', async () => {
        const status = await stopWorker();

        expect(status.isRunning).toBe(false);
        expect(status.status).toBe(WorkerStatus.STOPPED);
        expect(status.message).toBe('Worker is not running.');
    });

    it('should get the current status of the worker', async () => {
        let status = getStatus();

        expect(status.isRunning).toBe(false);
        expect(status.status).toBe(WorkerStatus.STOPPED);
        expect(status.message).toBe('Worker is not running.');

        await startWorker(workerFunction);
        status = getStatus();

        expect(status.isRunning).toBe(true);
        expect(status.status).toBe(WorkerStatus.STARTED);
        expect(status.message).toBe('Worker started.');
    });

    it('should handle race conditions when starting the worker', async () => {
        const startPromises = [startWorker(workerFunction), startWorker(workerFunction)];
        const statuses = await Promise.all(startPromises);

        expect(statuses[0].isRunning).toBe(true);
        expect(statuses[0].status).toBe(WorkerStatus.STARTED);
        expect(statuses[1].isRunning).toBe(true);
        expect(statuses[1].status).toBe(WorkerStatus.STARTED);
        expect(statuses[1].message).toBe('Worker is already running.');
    });

    it('should handle race conditions when stopping the worker', async () => {
        await startWorker(workerFunction);
        const stopPromises = [stopWorker(), stopWorker()];
        const statuses = await Promise.all(stopPromises);

        expect(statuses[0].isRunning).toBe(false);
        expect(statuses[0].status).toBe(WorkerStatus.STOPPED);
        expect(statuses[1].isRunning).toBe(false);
        expect(statuses[1].status).toBe(WorkerStatus.STOPPED);
        expect(statuses[1].message).toBe('Worker is not running.');
    });

    it('should handle race conditions with conflicting start/stops', async () => {
        const startStopPromises = [startWorker(workerFunction), stopWorker()];
        const statuses = await Promise.all(startStopPromises);

        const startStatus = statuses.find(status => status.status === WorkerStatus.STARTED);
        const stopStatus = statuses.find(status => status.status === WorkerStatus.STOPPED);

        expect(startStatus.isRunning).toBe(true);
        expect(startStatus.status).toBe(WorkerStatus.STARTED);
        expect(startStatus.message).toBe('Worker started.');

        expect(stopStatus.isRunning).toBe(false);
        expect(stopStatus.status).toBe(WorkerStatus.STOPPED);
        expect(stopStatus.message).toBe('Worker stopped.');
    });

    it('should start the worker and stop it ', async () => {


        const status = await getStatus(workerFunction);

        expect(status.status).toBe(WorkerStatus.STOPPED);
        expect(status.message).toBe('Worker is not running.');
        expect(status.isRunning).toBe(false);

        const statusStarted = await startWorker(workerFunction);

        expect(statusStarted.status).toBe(WorkerStatus.STARTED);
        expect(statusStarted.message).toBe('Worker started.');
        expect(statusStarted.isRunning).toBe(true);


        const statusStopped = await stopWorker(workerFunction);
        expect(statusStopped.status).toBe(WorkerStatus.STOPPED);
        expect(statusStopped.message).toBe('Worker stopped.');
        expect(statusStopped.isRunning).toBe(false);
    });
});
