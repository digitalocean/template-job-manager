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
});
