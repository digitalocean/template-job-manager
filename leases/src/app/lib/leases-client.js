import { Lease } from '@prisma/client';
import Lease from '../components/Lease';

/**
 * @typedef {Object} RenewConfig
 * @property {boolean} autoRenew - Whether to automatically renew the lease.
 * @property {number} interval - The interval in milliseconds for auto-renewal.
 * @property {function(Error):void} [onError] - Callback function to handle errors during auto-renewal.
 */
export const RenewConfig = { interval: 15000 };

/**
 * @typedef {Object} LeaseOptions
 * @property {string} serviceUrl - The URL of the service.
 * @property {string} resource - The resource to lease.
 * @property {string} holder - The holder of the lease.
 * @property {RenewConfig} [renewConfig] - Configuration for auto-renewal.
 */
export const LeaseOptions = {
    serviceUrl: '/api/leases',
};

export class LeaseReference {
    /**
     * Creates an instance of Lease.
     * @param {LeaseOptions} options - The options for the lease.
     */
    constructor(options) {
        /** @type {string} */
        this.resource = options.resource;
        /** @type {string} */
        this.holder = options.holder;
        // * @type {string} */
        this.url = options.serviceUrl;
        /** @type {RenewConfig} */
        this.renewConfig = options.renewConfig || {
            autoRenew: true,
            interval: RenewConfig.interval
        };
        /** @type {number | null} */
        this.id = null;
    }

    /**
     * Acquires a lease for the resource.
     * @returns {Promise<Lease>}
     */
    async acquire() {
        const response = await fetch(`${this.url}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ resource: this.resource, holder: this.holder }),
        });

        const result = await response.json();
        if (!response.ok) {
            if (response.status === 409) {
                throw new Error(result?.message | { message: 'Resource is already leased.' });
            }

            throw new Error(result?.message | 'Failed to acquire lease.');
        }

        this.id = result.id;

        if (this.renewConfig?.autoRenew) {
            this.startAutoRenew();
        }

        return result;
    }

    /**
     * Releases the current lease.
     * @returns {Promise<void>}
     */
    async release() {
        if (!this.id) {
            throw new Error('No lease to release.');
        }

        const response = await fetch(`${this.url}/${this.id.id}`, {
            method: 'DELETE',
        });

        const result = await response.json();
        if (!response.ok) {
            if (response.status === 409) {
                throw new Error(result?.message | { message: `Lease either doesn't exist or has expired.` });
            }

            throw new Error(result.message || 'Failed to release lease.');
        }

        this.stopAutoRenew();
    }

    /**
     * Renews the current lease.
     * @returns {Promise<void>}
     */
    async renew() {
        try {
            const response = await fetch(`${this.url}/renew`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ resource: this.resource, holder: this.holder }),
            });

            const result = await response.json();
            if (!response.ok) {
                if (response.status === 409) {
                    this.stopAutoRenew();
                    throw new Error(result?.message | { message: `Lease either doesn't exist or has expired.` });
                }
                throw new Error(result.message || 'Failed to renew lease.');
            }

            this.id = result;
        } catch (error) {
            if (this.renewConfig?.onError) {
                this.renewConfig.onError(error);
            } else {
                console.error('Auto-renewal error:', error);
            }
        }
    }

    /**
     * Starts the auto-renewal process.
     */
    startAutoRenew() {
        if (this.renewConfig?.interval) {
            this.autoRenewInterval = setInterval(() => this.renew(), this.renewConfig.interval);
        }
    }

    /**
     * Stops the auto-renewal process.
     */
    stopAutoRenew() {
        if (this.autoRenewInterval) {
            clearInterval(this.autoRenewInterval);
            this.autoRenewInterval = null;
        }
    }
}

// // Example usage:
// (async () => {
//     const myLease = new LeaseReference({
//         resource: "ABC",
//         holder: "server-123",
//         renewConfig: {
//             autoRenew: true,
//             interval: 20000,
//             onError: (error) => {
//                 console.error('Failed to auto-renew lease:', error);
//             }
//         }
//     });

//     await myLease.acquire();
//     // do stuff with ABC resource.
//     await myLease.release();
// })();


module.exports = {
    ...module.exports,
    LeaseReference,
    LeaseOptions,
    RenewConfig,
    Lease
};
