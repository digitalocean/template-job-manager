import '@testing-library/jest-dom'
import WorkerManager, { WorkerMessages, WorkerStatus } from '@/app/lib/worker-manager';

const waitForCondition = async (conditionFn, timeout = 10000) => {
    const startTime = Date.now();
    while (!(await conditionFn())) {
        if (Date.now() - startTime > timeout) {
            throw new Error('Timeout waiting for condition');
        }
        await new Promise((resolve) => setTimeout(resolve, 100));
    }
};

describe('WorkerManager', () => {
    let workerManager;
    let consoleErrorSpy;

    beforeEach(() => {
        workerManager = WorkerManager.instance;
        consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => { });
    });

    afterEach(async () => {
        const result = await workerManager.stop();
        await waitForCondition(async () => {
            const status = await workerManager.getStatus();
            return status.status === WorkerStatus.STOPPED;
        });
        consoleErrorSpy.mockRestore();
    });

    test('should start the worker and execute the function periodically', async () => {
        let counter = 0;
        const mockWorkerFunction = jest.fn(() => {
            counter++;
        });

        const result = await workerManager.start(mockWorkerFunction, 1000);
        expect(result.status).toBe(WorkerStatus.STARTED);
        expect(result.message).toBe(WorkerMessages.STARTED);
        expect(result.isRunning).toBe(true);

        await waitForCondition(async () => {
            const status = await workerManager.getStatus();
            return status.status === WorkerStatus.RUNNING;
        });

        const status = await workerManager.getStatus();
        expect(status.isRunning).toBe(true);
        expect(status.status).toBe(WorkerStatus.RUNNING);
        expect(status.message).toBe(WorkerMessages.STARTED);

        await waitForCondition(() => counter >= 3);
        expect(counter).toBe(3);
    });

    test('should not start if already running', async () => {
        let counter = 0;
        const mockWorkerFunction = jest.fn(() => {
            counter++;
        });

        const firstResult = await workerManager.start(mockWorkerFunction, 1000);
        expect(firstResult.status).toBe(WorkerStatus.STARTED);
        expect(firstResult.message).toBe(WorkerMessages.STARTED);
        expect(firstResult.isRunning).toBe(true);

        await waitForCondition(async () => {
            const status = await workerManager.getStatus();
            return status.status === WorkerStatus.RUNNING;
        });

        const result = await workerManager.start(mockWorkerFunction, 1000);
        expect(result.status).toBe(WorkerStatus.RUNNING);
        expect(result.message).toBe(WorkerMessages.ALREADY_RUNNING);
        expect(result.isRunning).toBe(true);

        const status = await workerManager.getStatus();
        expect(status.isRunning).toBe(true);
        expect(status.status).toBe(WorkerStatus.RUNNING);
        expect(status.message).toBe(WorkerMessages.STARTED);

        await waitForCondition(() => counter >= 2);
        expect(counter).toBe(2);
    });

    test('should stop the worker', async () => {
        let counter = 0;
        const mockWorkerFunction = jest.fn(() => {
            counter++;
        });

        const startResult = await workerManager.start(mockWorkerFunction, 1000);
        expect(startResult.status).toBe(WorkerStatus.STARTED);
        expect(startResult.message).toBe(WorkerMessages.STARTED);
        expect(startResult.isRunning).toBe(true);

        await waitForCondition(async () => {
            const status = await workerManager.getStatus();
            return status.status === WorkerStatus.RUNNING;
        });

        await waitForCondition(() => counter >= 2);
        expect(counter).toBe(2);

        const result = await workerManager.stop();
        expect(result.status).toBe(WorkerStatus.STOPPED);
        expect(result.message).toBe(WorkerMessages.STOPPED);
        expect(result.isRunning).toBe(false);

        await waitForCondition(async () => {
            const status = await workerManager.getStatus();
            return !status.isRunning;
        });

        const status = await workerManager.getStatus();
        expect(status.isRunning).toBe(false);
        expect(status.status).toBe(WorkerStatus.STOPPED);
        expect(status.message).toBe(WorkerMessages.STOPPED);

        expect(counter).toBe(2); // No further calls after stop
    });

    test('should handle errors in the worker function gracefully', async () => {
        let counter = 0;
        const errorFunction = jest.fn(() => {
            counter++;
            throw new Error('Test error');
        });

        const result = await workerManager.start(errorFunction, 1000);
        expect(result.status).toBe(WorkerStatus.STARTED);
        expect(result.message).toBe(WorkerMessages.STARTED);
        expect(result.isRunning).toBe(true);

        await waitForCondition(async () => {
            const status = await workerManager.getStatus();
            return status.status === WorkerStatus.RUNNING;
        });

        await waitForCondition(() => counter >= 2);
        expect(counter).toBe(2);
        expect(errorFunction).toHaveBeenCalledTimes(2);

        const status = await workerManager.getStatus();
        expect(status.isRunning).toBe(true); // Worker continues running despite errors
        expect(status.status).toBe(WorkerStatus.RUNNING);
        expect(status.message).toBe(WorkerMessages.STARTED);

        expect(consoleErrorSpy).toHaveBeenCalledWith(
            WorkerMessages.ERROR,
            expect.any(Error)
        );
    });

    test('should respect the mutex and prevent overlapping calls', async () => {
        let concurrentAccesses = 0;
        let counter = 0;
        const longRunningFunction = jest.fn(async () => {
            concurrentAccesses++;
            expect(concurrentAccesses).toBe(1); // Ensure no overlapping calls
            counter++;
            await new Promise((resolve) => setTimeout(resolve, 500));
            concurrentAccesses--;
        });

        const result = await workerManager.start(longRunningFunction, 1000);
        expect(result.status).toBe(WorkerStatus.STARTED);
        expect(result.message).toBe(WorkerMessages.STARTED);
        expect(result.isRunning).toBe(true);

        await waitForCondition(async () => {
            const status = await workerManager.getStatus();
            return status.status === WorkerStatus.RUNNING;
        });

        await waitForCondition(() => counter >= 3);
        expect(counter).toBe(3);

        const status = await workerManager.getStatus();
        expect(status.isRunning).toBe(true);
        expect(status.status).toBe(WorkerStatus.RUNNING);
        expect(status.message).toBe(WorkerMessages.STARTED);
    });

    test('should stop the worker based on workerFunction return value', async () => {
        let counter = 0;
        const mockWorkerFunction = jest.fn(() => {
            counter++;
            if (counter === 3) {
                return { stop: true };
            }
            return {};
        });

        const result = await workerManager.start(mockWorkerFunction, 500);
        expect(result.status).toBe(WorkerStatus.STARTED);
        expect(result.message).toBe(WorkerMessages.STARTED);
        expect(result.isRunning).toBe(true);

        await waitForCondition(() => counter == 3);

        const status = await workerManager.getStatus();
        expect(status.isRunning).toBe(false);
        expect(status.status).toBe(WorkerStatus.STOPPED);
        expect(status.message).toBe(WorkerMessages.STOPPED);

        expect(mockWorkerFunction).toHaveBeenCalledTimes(3);
    });

    test('should update worker status based on workerFunction return value', async () => {
        let counter = 0;
        const mockWorkerFunction = jest.fn(() => {
            counter++;
            if (counter === 2) {
                return { message: "CUSTOM MESSAGE" };
            }
            return {};
        });

        const result = await workerManager.start(mockWorkerFunction, 500);
        expect(result.status).toBe(WorkerStatus.STARTED);
        expect(result.message).toBe(WorkerMessages.STARTED);
        expect(result.isRunning).toBe(true);

        await waitForCondition(() => counter >= 2);

        const status = await workerManager.getStatus();
        expect(status.isRunning).toBe(true);
        expect(status.status).toBe(WorkerStatus.RUNNING);
        expect(status.message).toBe("CUSTOM MESSAGE");

        expect(mockWorkerFunction).toHaveBeenCalledTimes(2);
    });
});
