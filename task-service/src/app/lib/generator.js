import { WorkerManager } from '@/app/lib/worker-manager';

const { PrismaClient } = require('@prisma/client')

// Initialize Prisma Client
const prisma = new PrismaClient()

/**
 * Sample worker function to be used with the worker manager.
 * This function creates a new task with a random sleep duration.
 */
export const generatorFunction = async () => {
    try {
        // Generate a random sleep duration between 1 and 90 seconds
        const sleepDuration = Math.floor(Math.random() * 60) + 1;

        // Create a new task with the generated sleep duration
        const result = await prisma.task.create({
            data: {
                taskData: {
                    sleep_duration_seconds: sleepDuration,
                },
            }
        });

        // Log the generated sleep duration
        console.log(`Generated Task Id ${result.id} with payload: ${JSON.stringify(result.taskData)}`);
    } catch (error) {
        // Log any errors that occur during task creation
        console.error('Error creating task:', error);
    }
};

const generatorService = {
    wm: new WorkerManager({
        interval: 2000,
        workerFunction: generatorFunction,
        leaseClientOptions: {
            renewConfig: {
                interval: 15000,
                autoRenew: true,
                onError: (error) => {
                    console.error('Error renewing lease:', error);
                },

            },
            serviceUrl: process.env.SERVICE_LEASES_URL,
            resource: `urn:task-generator:${process.env.NEXT_PUBLIC_URL}`,
            holder: process.env.HOSTNAME,
        },
    }) // Make a singleton instance of WorkerManager  for the generator
};


export const GeneratorService = generatorService.wm;