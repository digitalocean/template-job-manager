import { WorkerManager, WorkerStatus, WorkerMessages } from '@/app/lib/worker-manager';
import { LeaseReference, LeaseOptions } from '@job-manager/leases/LeasesClient';

// Mock the LeaseReference from @job-manager/leases/LeasesClient
jest.mock('@job-manager/leases/LeasesClient', () => ({
    LeaseReference: jest.fn().mockImplementation(() => ({
        acquire: jest.fn(),
        release: jest.fn(),
    })),
}));

describe('WorkerManager', () => {
    let workerFunction;
    let config;
    let workerManagerInstance;
    beforeAll(() => {
        // Switch to Jest’s fake timers. 
        jest.useFakeTimers();
    });

    beforeEach(() => {
        // Reset mocks before each test
        jest.clearAllMocks();

        // Define a default worker function
        workerFunction = jest.fn().mockResolvedValue({});

        // Provide a default valid config
        config = {
            ...LeaseOptions,
            workerFunction,
            interval: 100, // keep it small for tests
        };

        // Create a new instance of WorkerManager for each test
        workerManagerInstance = new WorkerManager(config);
    });

    afterEach(async () => {
        // Make sure the worker is stopped, so no stray setInterval keeps firing
        await workerManagerInstance.stop();

        // If you're using fake timers, reset or clear them:
        jest.clearAllTimers();
    });

    it('should throw a TypeError if workerFunction is not a function', () => {
        expect(() => {
            // Attempt to instantiate WorkerManager with invalid workerFunction
            new WorkerManager({ workerFunction: null });
        }).toThrow(TypeError);
        expect(() => {
            new WorkerManager({ workerFunction: 123 });
        }).toThrow(TypeError);
    });

    it('should create an instance with default status STOPPED and correct internal fields', async () => {
        // Confirm the instance is created
        expect(workerManagerInstance).toBeDefined();
        // getStatus should reflect default STOPPED status
        const status = await workerManagerInstance.getStatus();
        expect(status.isRunning).toBe(false);
        expect(status.status).toBe(WorkerStatus.STOPPED);
        expect(status.message).toBe(WorkerMessages.NOT_RUNNING);
    });

    describe('start', () => {
        it('should acquire the lease and start the worker', async () => {
            const leaseInstance = LeaseReference.mock.results[0].value;

            const statusBefore = await workerManagerInstance.getStatus();
            expect(statusBefore.isRunning).toBe(false);

            const updatedStatus = await workerManagerInstance.start();

            // The lease should have been acquired
            expect(leaseInstance.acquire).toHaveBeenCalledTimes(1);

            // The status should be updated
            expect(updatedStatus.isRunning).toBe(true);
            expect(updatedStatus.status).toBe(WorkerStatus.STARTED);
            expect(updatedStatus.message).toBe(WorkerMessages.STARTED);
        });

        it('should not start the worker if it is already running', async () => {
            await workerManagerInstance.start();

            // The second call should not re-acquire the lease
            const updatedStatus = await workerManagerInstance.start();
            expect(updatedStatus.message).toBe(WorkerMessages.ALREADY_RUNNING);
        });

        it('should transition from STARTED to RUNNING after the first successful execution', async () => {
            // Start the worker
            await workerManagerInstance.start();

            // Advance the clock so the first interval fires
            await jest.advanceTimersByTimeAsync(100);

            // Now retrieve status
            const status = await workerManagerInstance.getStatus();
            expect(status.isRunning).toBe(true);
            expect(status.status).toBe(WorkerStatus.RUNNING);
        });


        it('should handle errors thrown by worker function without stopping entirely', async () => {
            // Make the worker function throw an error on first call
            workerFunction.mockImplementationOnce(() => {
                throw new Error('Test Error');
            });

            await workerManagerInstance.start();

            // Let the first interval run
            await jest.advanceTimersByTimeAsync(100);

            // Worker should still be running, but an error should have been logged.
            const status = await workerManagerInstance.getStatus();
            expect(status.isRunning).toBe(true);
            // The status might still be "STARTED" since it hasn't completed a successful iteration
            expect(status.status).toBe(WorkerStatus.STARTED);
        });

        it('should stop the worker if the worker function returns an object with stop: true', async () => {
            // Configure the worker function to return { stop: true } after first call
            workerFunction.mockResolvedValueOnce({ stop: true });

            await workerManagerInstance.start();

            // Move past first interval invocation
            await jest.advanceTimersByTimeAsync(100);

            const statusAfter = await workerManagerInstance.getStatus();
            expect(statusAfter.isRunning).toBe(false);
            expect(statusAfter.status).toBe(WorkerStatus.STOPPED);
            expect(statusAfter.message).toBe(WorkerMessages.STOPPED);
        });

        it('should update the message in status if the worker function returns a message', async () => {
            // For instance, if the worker function returns { message: "Doing work" }
            const customMessage = 'Doing some heavy work...';
            workerFunction.mockResolvedValueOnce({ message: customMessage });

            await workerManagerInstance.start();

            // Advance timers
            await jest.advanceTimersByTimeAsync(100);

            const status = await workerManagerInstance.getStatus();
            expect(status.message).toBe(customMessage);
        });
    });

    describe('stop', () => {
        it('should release the lease and stop the worker', async () => {
            const leaseInstance = LeaseReference.mock.results[0].value;

            await workerManagerInstance.start();

            const statusAfterStart = await workerManagerInstance.getStatus();
            expect(statusAfterStart.isRunning).toBe(true);

            const updatedStatus = await workerManagerInstance.stop();

            // The lease should have been released
            expect(leaseInstance.release).toHaveBeenCalledTimes(1);
            // Explanation for "2": 
            // 1) The internal #internalStop also calls release. 
            // Or you can check exactly where you expect releases.

            expect(updatedStatus.isRunning).toBe(false);
            expect(updatedStatus.status).toBe(WorkerStatus.STOPPED);
            expect(updatedStatus.message).toBe(WorkerMessages.STOPPED);
        });

        it('should return NOT_RUNNING message if the worker is already stopped', async () => {
            // Stop without ever starting
            const updatedStatus = await workerManagerInstance.stop();
            expect(updatedStatus.message).toBe(WorkerMessages.NOT_RUNNING);
        });
    });
});
