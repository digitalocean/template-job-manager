import { Lease } from '@prisma/client';

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
    /** @type {LeaseOptions} */
    #options;

    id = null;
    /**
     * Creates an instance of Lease.
     * @param {LeaseOptions} options - The options for the lease.
     */
    constructor(options) {
        console.log(options)
        /** @type {string} */
        this.#options = options;
        /** @type {number | null} */
        this.id = null;
    }

    /**
     * Acquires a lease for the resource.
     * @returns {Promise<Lease>}
     */
    async acquire() {
        console.log(this.#options.serviceUrl)
        const response = await fetch(this.#options.serviceUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                resource: this.#options.resource,
                holder: this.#options.holder
            }),
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

        const response = await fetch(`${this.#options.serviceUrl}/${this.id}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                resource: this.#options.resource,
                holder: this.#options.holder
            }),
        });

        const result = await response.json();
        if (!response.ok) {
            if (response.status === 409) {
                throw new Error(result?.message | { message: `Lease either doesn't exist or has expired.` });
            }

            throw new Error(result.message || 'Failed to release lease.');
        }

        this.stopAutoRenew();
        return result;
    }

    /**
     * Renews the current lease.
     * @returns {Promise<void>}
     */
    async renew() {
        try {
            const response = await fetch(`${this.#options.serviceUrl}/renew`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    resource: this.#options.resource,
                    holder: this.#options.holder
                }),
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
            return result;
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
