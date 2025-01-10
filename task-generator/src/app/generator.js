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
        const sleepDuration = Math.floor(Math.random() * 90) + 1;

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
