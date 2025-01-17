import { LeaseReference, LeaseOptions, RenewConfig } from '@/app/lib/leases-client';

describe('LeaseReference', () => {
    // We will mock the global fetch API
    let globalFetchMock;

    beforeAll(() => {
        // In case other tests or code use fetch, we replace it once in "beforeAll"
        globalFetchMock = jest.fn();
        global.fetch = globalFetchMock;
    });

    afterEach(() => {
        // Reset the mock after each test so calls don't bleed over
        jest.resetAllMocks();
        jest.useRealTimers();
        delete global.fetch; // Clean up the global mock
    });

    describe('constructor', () => {
        it('should construct with the provided options', () => {
            const options = {
                ...LeaseOptions,
                resource: 'test-resource',
                holder: 'test-holder',
            };

            const leaseRef = new LeaseReference(options);
            // "leaseRef.#options" is private; we can't directly inspect it,
            // but we can check that the instance was created and property "id" is null by default.
            expect(leaseRef).toBeInstanceOf(LeaseReference);
            expect(leaseRef.id).toBe(null);
        });
    });

    describe('acquire', () => {
        it('should make a POST request to acquire a lease', async () => {
            const mockLease = { id: 123, resource: 'test-resource', holder: 'test-holder' };
            globalFetchMock.mockResolvedValueOnce({
                ok: true,
                json: async () => mockLease,
            });

            const options = {
                ...LeaseOptions,
                resource: 'test-resource',
                holder: 'test-holder',
            };

            const leaseRef = new LeaseReference(options);
            const result = await leaseRef.acquire();

            expect(globalFetchMock).toHaveBeenCalledTimes(1);
            expect(globalFetchMock).toHaveBeenCalledWith(options.serviceUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    resource: 'test-resource',
                    holder: 'test-holder',
                }),
            });

            expect(result).toEqual(mockLease);
            expect(leaseRef.id).toBe(mockLease.id);
        });

        it('should throw if response is not OK', async () => {
            globalFetchMock.mockResolvedValueOnce({
                ok: false,
                status: 500,
                json: async () => ({ message: 'Failed to acquire lease.' }),
            });

            const leaseRef = new LeaseReference({
                ...LeaseOptions,
                resource: 'test-resource',
                holder: 'test-holder',
            });

            await expect(awaitleaseRef.acquire()).rejects.toThrow('Failed to acquire lease.');
        });

        it('should throw a specific error on 409 status code', async () => {
            globalFetchMock.mockResolvedValueOnce({
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
            jest.useFakeTimers();

            const mockLease = { id: 123, resource: 'test-resource', holder: 'test-holder' };
            globalFetchMock.mockResolvedValue({
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
            // Check that setInterval was called
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
            const mockLease = { id: 123 };
            const mockReleaseResponse = { success: true };

            globalFetchMock
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => mockLease,
                })
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => mockReleaseResponse,
                });

            const leaseRef = new LeaseReference({
                ...LeaseOptions,
                resource: 'test-resource',
                holder: 'test-holder',
            });

            // Acquire first
            await leaseRef.acquire();
            expect(leaseRef.id).toBe(mockLease.id);

            // Release
            const releaseResult = await leaseRef.release();
            expect(globalFetchMock).toHaveBeenLastCalledWith(
                `${LeaseOptions.serviceUrl}/${mockLease.id}`,
                {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        resource: 'test-resource',
                        holder: 'test-holder',
                    }),
                }
            );

            expect(releaseResult).toEqual(mockReleaseResponse);
            // After releasing, we can check if autoRenew was stopped, if it was started.
        });

        it('should throw a specific error on 409 status code when releasing', async () => {
            globalFetchMock
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({ id: 123 }),
                })
                .mockResolvedValueOnce({
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
            const mockRenewedId = 456;

            // Acquire mock
            globalFetchMock
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => mockLease,
                })
                // Renew mock
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => mockRenewedId,
                });

            const leaseRef = new LeaseReference({
                ...LeaseOptions,
                resource: 'test-resource',
                holder: 'test-holder',
            });

            await leaseRef.acquire();
            expect(leaseRef.id).toBe(123);

            const renewResult = await leaseRef.renew();
            expect(globalFetchMock).toHaveBeenLastCalledWith(
                `${LeaseOptions.serviceUrl}/renew`,
                {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        resource: 'test-resource',
                        holder: 'test-holder',
                    }),
                }
            );
            expect(renewResult).toBe(mockRenewedId);
            expect(leaseRef.id).toBe(mockRenewedId);
        });

        it('should stop auto-renew and throw error when status=409 on renew', async () => {
            jest.useFakeTimers();

            const mockLease = { id: 123 };

            globalFetchMock
                // Acquire mock
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => mockLease,
                })
                // Renew mock returns 409
                .mockResolvedValueOnce({
                    ok: false,
                    status: 409,
                    json: async () => ({ message: 'Lease either does not exist or has expired.' }),
                });

            const onErrorMock = jest.fn();

            const leaseRef = new LeaseReference({
                ...LeaseOptions,
                resource: 'test-resource',
                holder: 'test-holder',
                renewConfig: {
                    autoRenew: true,
                    interval: 5000,
                    onError: onErrorMock,
                },
            });

            await leaseRef.acquire(); // starts auto-renew
            expect(leaseRef.id).toBe(mockLease.id);

            // We manually call `renew` to see what happens on a 409
            await expect(leaseRef.renew()).rejects.toThrow(
                'Lease either does not exist or has expired.'
            );

            // The autoRenewInterval should be cleared
            expect(clearInterval).toHaveBeenCalledTimes(1);
        });

        it('should call onError callback if provided when renew fails', async () => {
            jest.useFakeTimers();

            const mockLease = { id: 123 };
            const testError = new Error('Test renew error');

            globalFetchMock
                // Acquire success
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => mockLease,
                })
                // Renew throws
                .mockRejectedValueOnce(testError);

            const onErrorMock = jest.fn();

            const leaseRef = new LeaseReference({
                ...LeaseOptions,
                resource: 'test-resource',
                holder: 'test-holder',
                renewConfig: {
                    autoRenew: true,
                    interval: 1000,
                    onError: onErrorMock,
                },
            });

            await leaseRef.acquire();
            // Manually call renew to trigger the error
            await leaseRef.renew();

            // The error should be handled by onError, not thrown
            expect(onErrorMock).toHaveBeenCalledWith(testError);
        });
    });

    describe('auto-renew', () => {
        it('startAutoRenew should set an interval', () => {
            jest.useFakeTimers();
            const leaseRef = new LeaseReference({
                ...LeaseOptions,
                resource: 'test-resource',
                holder: 'test-holder',
                renewConfig: { autoRenew: true, interval: 2000 },
            });

            // calling startAutoRenew() directly
            leaseRef.startAutoRenew();
            expect(setInterval).toHaveBeenCalledWith(expect.any(Function), 2000);
        });

        it('stopAutoRenew should clear the interval', () => {
            jest.useFakeTimers();
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
});
