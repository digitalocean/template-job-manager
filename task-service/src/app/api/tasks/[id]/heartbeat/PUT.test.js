import { PUT } from './route';
import { prisma } from '@/app/lib/prisma-client';

jest.mock('next/server', () => ({
    NextResponse: {
        json: jest.fn((data, init) => ({ data, status: init?.status })),
    },
}));

// This is optional, but you can stub out `next/dist/shared/lib/utils` if needed
jest.mock('next/dist/shared/lib/utils', () => ({
    stringifyError: (err) => JSON.stringify(err),
}));

// Mock the prisma client
jest.mock('@/app/lib/prisma-client', () => {
    return {
        prisma: {
            $transaction: jest.fn(),
        },
    };
});

describe('PUT handler', () => {
    const mockParams = { id: '1' };
    let mockRequest;

    beforeEach(() => {
        // Reset mocks before each test
        jest.clearAllMocks();

        // Mock the global fetch function
        global.fetch = jest.fn();

        // A default request object with a valid processor
        mockRequest = {
            json: jest.fn().mockResolvedValue({ processor: 'test-processor' }),
        };

    });

    afterEach(() => {
        delete global.fetch; // Clean up the global mock
    });

    it('should return 400 if processor is missing or empty', async () => {
        // Mock request with no processor
        mockRequest.json.mockResolvedValue({});

        const response = await PUT(mockRequest, { params: mockParams });
        expect(response.status).toBe(400);
        expect(response.data).toEqual({ error: 'Missing processor.' });
    });

    it('should return 200 if the task is not found', async () => {
        // Mock the DB transaction so it returns an empty array for $queryRaw
        prisma.$transaction.mockImplementation(async (cb) => {
            const tx = {
                $queryRaw: jest.fn().mockResolvedValue([]),
            };
            return cb(tx);
        });

        const response = await PUT(mockRequest, { params: mockParams });
        expect(response.status).toBe(200);
        expect(response.data).toEqual({ message: 'Task not found.' });
    });

    it('should return 200 if the task is not assigned to the same processor', async () => {
        // Mock the DB transaction so it returns a task with a different processor
        prisma.$transaction.mockImplementation(async (cb) => {
            const tx = {
                $queryRaw: jest.fn().mockResolvedValue([
                    { id: 1, processor: 'another-processor', processedAt: null },
                ]),
            };
            return cb(tx);
        });

        const response = await PUT(mockRequest, { params: mockParams });
        expect(response.status).toBe(200);
        expect(response.data).toEqual({ message: 'Task is not assigned to you.' });
    });

    it('should return 409 if the task is already processed', async () => {
        // Mock the DB transaction so it returns a processed task
        prisma.$transaction.mockImplementation(async (cb) => {
            const tx = {
                $queryRaw: jest.fn().mockResolvedValue([
                    { id: 1, processor: 'test-processor', processedAt: new Date() },
                ]),
            };
            return cb(tx);
        });

        const response = await PUT(mockRequest, { params: mockParams });
        expect(response.status).toBe(409);
        expect(response.data).toEqual({ message: 'Task already processed.' });
    });

    it('should return 500 if lease renewal call fails (non-404 error)', async () => {
        // Mock the DB transaction for a valid unprocessed task
        prisma.$transaction.mockImplementation(async (cb) => {
            const tx = {
                $queryRaw: jest.fn().mockResolvedValue([
                    { id: 1, processor: 'test-processor', processedAt: null },
                ]),
            };
            return cb(tx);
        });

        // Mock a failing lease call
        fetch.mockResolvedValueOnce({
            ok: false,
            status: 500, // e.g. server error
        });

        const response = await PUT(mockRequest, { params: mockParams });
        expect(response.status).toBe(500);
        expect(response.data).toEqual({ error: 'Failed to renew lease.' });
    });

    it('should return 409 if the lease renewal call returns 404', async () => {
        // Mock the DB transaction for a valid unprocessed task
        prisma.$transaction.mockImplementation(async (cb) => {
            const tx = {
                $queryRaw: jest.fn().mockResolvedValue([
                    { id: 1, processor: 'test-processor', processedAt: null },
                ]),
            };
            return cb(tx);
        });

        // Mock a 404 from lease
        fetch.mockResolvedValueOnce({
            ok: false,
            status: 404,
        });

        const response = await PUT(mockRequest, { params: mockParams });
        expect(response.status).toBe(409);
        expect(response.data).toEqual({ error: 'Task lease has expired.' });
    });

    it('should return 202 and update the task on successful lease renewal', async () => {
        // Mock the DB transaction for a valid unprocessed task
        prisma.$transaction.mockImplementation(async (cb) => {
            const tx = {
                $queryRaw: jest.fn().mockResolvedValue([
                    { id: 1, processor: 'test-processor', processedAt: null },
                ]),
                task: {
                    update: jest.fn().mockResolvedValue({
                        id: 1,
                        processor: 'test-processor',
                        processedAt: null,
                        lastHeartBeatAt: '2025-01-17T12:00:00.000Z',
                        mustHeartBeatBefore: '2025-01-17T12:05:00.000Z',
                    }),
                },
            };
            return cb(tx);
        });

        // Mock a successful lease renewal
        fetch.mockResolvedValueOnce({
            ok: true,
            status: 200,
            json: jest.fn().mockResolvedValue({
                renewed_at: '2025-01-17T12:00:00.000Z',
                expires_at: '2025-01-17T12:05:00.000Z',
            }),
        });

        const response = await PUT(mockRequest, { params: mockParams });
        expect(response.status).toBe(202);
        expect(response.data).toMatchObject({
            id: 1,
            lastHeartBeatAt: '2025-01-17T12:00:00.000Z',
            mustHeartBeatBefore: '2025-01-17T12:05:00.000Z',
        });
    });

    it('should return 500 when an unexpected error is thrown', async () => {
        // Force an exception in the transaction
        prisma.$transaction.mockImplementation(async () => {
            throw new Error('Unexpected error');
        });

        const response = await PUT(mockRequest, { params: mockParams });
        expect(response.status).toBe(500);
        expect(response.data).toEqual({ error: 'Failed to heartbeat' });
    });
});
