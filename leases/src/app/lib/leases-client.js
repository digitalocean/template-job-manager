import { Lease } from '@prisma/client';

/**
 * @typedef {Object} RenewConfig
 * @property {boolean} autoRenew - Whether to automatically renew the lease.
 * @property {number} interval - The interval in milliseconds for auto-renewal.
 * @property {function(Error):void} [onError] - Callback function to handle errors during auto-renewal.
 */
export const RenewConfig = {
    interval: 15000,
    autoRenew: false,
    onError: null,
};

/**
 * @typedef {Object} LeaseOptions
 * @property {string} serviceUrl - The URL of the service.
 * @property {string} resource - The resource to lease.
 * @property {string} holder - The holder of the lease.
 * @property {RenewConfig} [renewConfig] - Configuration for auto-renewal.
 */
export const LeaseOptions = {
    serviceUrl: '/api/leases',
    resource: null,
    holder: null,
    renewConfig: {
        ...RenewConfig
    }
};

export class LeaseReference {
    /** @type {LeaseOptions} */
    #options;

    /** @type {number|null} */
    id = null;
    /** @type {number|null} */
    autoRenewInterval = null;

    /**
     * Creates an instance of LeaseReference.
     * @param {LeaseOptions} options - The options for the lease.
     */
    constructor(options) {
        this.#options = options;
    }

    /**
     * Acquires a lease for the resource.
     * @returns {Promise<Lease>}
     */
    async acquire() {
        const response = await fetch(this.#options.serviceUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                resource: this.#options.resource,
                holder: this.#options.holder
            }),
        });

        const result = await response.json();

        if (!response.ok) {
            if (response.status === 409) {
                throw new Error(result?.error || 'Resource is already leased.');
            }
            throw new Error(result?.error || 'Failed to acquire lease.');
        }

        this.id = result.id;

        // If autoRenew is enabled
        if (this.#options.renewConfig.autoRenew) {
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
        try {
            console.log(JSON.stringify(this.id));
            const response = await fetch(`${this.#options.serviceUrl}/${this.id}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    resource: this.#options.resource,
                    holder: this.#options.holder
                }),
            });

            const result = await response.json();
            if (!response.ok) {
                if (response.status === 409) {
                    throw new Error(result?.error || `Lease either doesn't exist or has expired.`);
                }
                throw new Error(result.error || 'Failed to release lease.');
            }

            this.stopAutoRenew();
            return result;
        } catch (error) {
            if (this.#options.renewConfig.onError) {
                this.#options.renewConfig.onError(error);
            }
            throw error;
        }
    }

    /**
     * Renews the current lease.
     * @returns {Promise<number|void>} 
     *    - If success, returns the new lease ID 
     *    - If it fails and there's an onError callback, it won't throw (unless you re-throw).
     */
    async renew() {
        try {
            const response = await fetch(`${this.#options.serviceUrl}/renew`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    resource: this.#options.resource,
                    holder: this.#options.holder
                }),
            });

            const result = await response.json();
            if (!response.ok) {
                if (response.status === 409) {
                    this.stopAutoRenew();
                    throw new Error(result?.error || `Lease either doesn't exist or has expired.`);
                }
                console.error(`Failed to renew lease. Status: ${response.status}, error: ${result?.error || 'Unknown error'}`);
                throw new Error(result.error || 'Failed to renew lease.');
            }

            this.id = result.id;
            return result;
        } catch (error) {
            if (this.#options.renewConfig.onError) {
                this.#options.renewConfig.onError(error);
            }
            throw error;
        }
    }

    /**
     * Starts the auto-renewal process.
     */
    startAutoRenew() {
        console.log('Starting auto-renew with interval:', this.#options.renewConfig?.interval);

        if (this.#options.renewConfig.interval) {
            this.autoRenewInterval = setInterval(async () => {
                try {
                    await this.renew();
                } catch (error) {
                    console.error('Auto-renewal failed:', error);
                }
            }, this.#options.renewConfig.interval);
        }
    }

    /**
     * Stops the auto-renewal process.
     */
    stopAutoRenew() {
        console.log('Stopping auto-renew with interval:', this.#options.renewConfig.interval);

        if (this.autoRenewInterval) {
            clearInterval(this.autoRenewInterval);
            this.autoRenewInterval = null;
        }
    }
}
