import { LeaseReference, LeaseOptions } from './leases-client';

describe('LeaseReference', () => {
    beforeEach(() => {
        // Use modern fake timers or legacy depending on your Jest version
        jest.useFakeTimers();
        // Spy on setInterval / clearInterval
        jest.spyOn(global, 'setInterval');
        jest.spyOn(global, 'clearInterval');

        global.fetch = jest.fn();;
    });

    afterEach(() => {
        jest.runOnlyPendingTimers();

        jest.resetAllMocks();

        delete global.fetch; // Clean up the global mock
    });


    describe('acquire', () => {
        it('should make a POST request to acquire a lease', async () => {
            const mockLease = { id: 123, resource: 'test-resource', holder: 'test-holder' };
            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => mockLease,
            });

            const leaseRef = new LeaseReference({
                ...LeaseOptions,
                resource: 'test-resource',
                holder: 'test-holder',
            });
            const result = await leaseRef.acquire();

            expect(global.fetch).toHaveBeenCalledTimes(1);
            expect(global.fetch).toHaveBeenCalledWith(LeaseOptions.serviceUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ resource: 'test-resource', holder: 'test-holder' }),
            });
            expect(result).toEqual(mockLease);
            expect(leaseRef.id).toBe(123);
        });

        it('should throw if response is not OK', async () => {
            global.fetch.mockResolvedValueOnce({
                ok: false,
                status: 500,
                json: async () => ({ message: 'Failed to acquire lease.' }),
            });

            const leaseRef = new LeaseReference({
                ...LeaseOptions,
                resource: 'test-resource',
                holder: 'test-holder',
            });

            await expect(leaseRef.acquire()).rejects.toThrow('Failed to acquire lease.');
        });

        it('should throw a specific error on 409 status code', async () => {
            global.fetch.mockResolvedValueOnce({
                ok: false,
                status: 409,
                json: async () => ({ message: 'Resource is already leased.' }),
            });

            const leaseRef = new LeaseReference({
                ...LeaseOptions,
                resource: 'test-resource',
                holder: 'test-holder',
            });

            await expect(leaseRef.acquire()).rejects.toThrow('Resource is already leased.');
        });

        it('should start auto-renew if autoRenew is set to true', async () => {
            const mockLease = { id: 123, resource: 'test-resource', holder: 'test-holder' };
            global.fetch.mockResolvedValue({
                ok: true,
                json: async () => mockLease,
            });

            const leaseRef = new LeaseReference({
                ...LeaseOptions,
                resource: 'test-resource',
                holder: 'test-holder',
                renewConfig: {
                    autoRenew: true,
                    interval: 5000,
                },
            });

            await leaseRef.acquire();

            await jest.advanceTimersByTimeAsync(5000);

            // Now we can test setInterval calls
            expect(setInterval).toHaveBeenCalledWith(expect.any(Function), 5000);
        });
    });

    describe('release', () => {
        it('should throw if there is no lease to release', async () => {
            const leaseRef = new LeaseReference({
                ...LeaseOptions,
                resource: 'test-resource',
                holder: 'test-holder',
            });
            await expect(leaseRef.release()).rejects.toThrow('No lease to release.');
        });

        it('should call fetch with DELETE to release lease', async () => {
            global.fetch
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({ id: 123 }),
                })
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({ success: true }),
                });

            const leaseRef = new LeaseReference({
                ...LeaseOptions,
                resource: 'test-resource',
                holder: 'test-holder',
            });

            await leaseRef.acquire();
            await leaseRef.release();

            expect(global.fetch).toHaveBeenLastCalledWith(
                `${LeaseOptions.serviceUrl}/123`,
                {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ resource: 'test-resource', holder: 'test-holder' }),
                }
            );
        });

        it('should throw a specific error on 409 status code when releasing', async () => {
            // Acquire mock
            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ id: 123 }),
            });
            // Release mock
            global.fetch.mockResolvedValueOnce({
                ok: false,
                status: 409,
                json: async () => ({ message: "Lease either doesn't exist or has expired." }),
            });

            const leaseRef = new LeaseReference({
                ...LeaseOptions,
                resource: 'test-resource',
                holder: 'test-holder',
            });

            await leaseRef.acquire();
            await expect(leaseRef.release()).rejects.toThrow("Lease either doesn't exist or has expired.");
        });
    });

    describe('renew', () => {
        it('should send a PUT request to renew the lease', async () => {
            const mockLease = { id: 123 };
            const mockRenewId = 456;
            // Acquire mock
            global.fetch
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => mockLease,
                })
                // Renew mock
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => mockRenewId,
                });

            const leaseRef = new LeaseReference({
                ...LeaseOptions,
                resource: 'test-resource',
                holder: 'test-holder',
            });

            await leaseRef.acquire();
            expect(leaseRef.id).toBe(123);

            const result = await leaseRef.renew();
            expect(global.fetch).toHaveBeenLastCalledWith(
                `${LeaseOptions.serviceUrl}/renew`,
                {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ resource: 'test-resource', holder: 'test-holder' }),
                }
            );
            expect(result).toBe(456);
        });

        it('should stop auto-renew and throw error when status=409 on renew', async () => {
            // Acquire mock
            global.fetch
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({ id: 123 }),
                })
                // Renew mock with 409
                .mockResolvedValueOnce({
                    ok: false,
                    status: 409,
                    json: async () => ({ message: `Lease either doesn't exist or has expired.` }),
                });

            const leaseRef = new LeaseReference({
                ...LeaseOptions,
                resource: 'test-resource',
                holder: 'test-holder',
                renewConfig: {
                    autoRenew: true,
                    interval: 5000,
                },
            });

            await leaseRef.acquire(); // starts auto-renew
            await expect(leaseRef.renew()).rejects.toThrow(`Lease either doesn't exist or has expired.`);
            await jest.advanceTimersByTimeAsync(5000);
            leaseRef.stopAutoRenew();

            // The autoRenewInterval should be cleared
            expect(clearInterval).toHaveBeenCalled();
        });

        it('should call onError callback if provided when renew fails, then re-throw', async () => {
            const mockLease = { id: 123 };
            const testError = new Error('Test renew error');

            global.fetch
                // Acquire success
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => mockLease,
                })
                // Renew fails with an actual thrown error
                .mockRejectedValueOnce(testError);

            const onErrorMock = jest.fn();

            const leaseRef = new LeaseReference({
                ...LeaseOptions,
                resource: 'test-resource',
                holder: 'test-holder',
                renewConfig: {
                    autoRenew: false,
                    interval: 1000,
                    onError: onErrorMock,
                },
            });

            await leaseRef.acquire();

            await expect(leaseRef.renew()).rejects.toThrow('Test renew error');


            // The error should be handled by onError AND re-thrown
            expect(onErrorMock).toHaveBeenCalledWith(testError);
        });
    });
    it('startAutoRenew should set an interval', async () => {
        const leaseRef = new LeaseReference({
            ...LeaseOptions,
            resource: 'test-resource',
            holder: 'test-holder',
            renewConfig: { autoRenew: true, interval: 2000 },
        });
        global.fetch
            // Renew mock
            .mockResolvedValueOnce({
                ok: true,
                json: async () => 465,
            });

        leaseRef.startAutoRenew();

        await jest.advanceTimersByTimeAsync(2000);

        leaseRef.stopAutoRenew();

        expect(setInterval).toHaveBeenCalledWith(expect.any(Function), 2000);
    });

    it('stopAutoRenew should clear the interval', () => {
        const leaseRef = new LeaseReference({
            ...LeaseOptions,
            resource: 'test-resource',
            holder: 'test-holder',
            renewConfig: { autoRenew: true, interval: 2000 },
        });

        leaseRef.startAutoRenew();
        leaseRef.stopAutoRenew();

        expect(clearInterval).toHaveBeenCalled();
    });
});
