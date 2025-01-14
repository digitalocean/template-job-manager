import { NextResponse } from 'next/server'
import { stringifyError } from 'next/dist/shared/lib/utils';
import { prisma } from '@/app/lib/prisma-client';
import process from 'process';

const { SERVICE_LEASES_URL, NEXT_PUBLIC_URL } = process.env;

// Handle POST request to get the next task to process.
export async function POST(req) {
    try {
        const { processor } = await req.json();
        if (!processor || processor.length === 0) {
            return NextResponse.json({ error: 'Missing processor.' }, { status: 400 });
        }


        return await prisma.$transaction(async (tx) => {
            // we use this to skip over tasks where we failed to acquire a lease.
            let nextTask = null;
            for (let tasksToSkip = 0; tasksToSkip < 10; tasksToSkip++) {
                // Lock and find the next available task
                let result = await tx.$queryRaw`SELECT * 
                                                    FROM tasks 
                                                WHERE 
                                                    processed_at is null
                                                ORDER BY scheduled_at ASC
                                                LIMIT 1
                                                OFFSET ${tasksToSkip}
                                                FOR UPDATE;`;

                if (!result || result.length === 0) {
                    return NextResponse.json({ message: 'No available tasks.' }, { status: 200 });
                }

                nextTask = result[0];

                // Try to take a lease for this task
                const leaseResponse = await fetch(SERVICE_LEASES_URL, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        resource: `${NEXT_PUBLIC_URL}/api/tasks/${nextTask.id}`,
                        holder: processor,
                    }),
                });

                // Check if the lease was created successfully
                if (!leaseResponse.ok && leaseResponse.status !== 409) {
                    return NextResponse.json({ error: 'Failed to create lease.' }, { status: 500 });
                } else if (leaseResponse.status === 409) {
                    // Retry with the next task
                    continue;
                } else {
                    const lease = await leaseResponse.json();

                    // Update the task's row
                    const updatedTask = await tx.task.update({
                        data: {
                            startedAt: lease.created_at,
                            lastHeartBeatAt: lease.created_at,
                            mustHeartBeatBefore: lease.expires_at,
                            processor: processor,
                        },
                        where: {
                            id: nextTask.id,
                        },
                    });

                    return NextResponse.json(updatedTask, { status: 202 });
                }
            }
        }, {
            timeout: 30 * 1000, // 30 seconds
        })
    } catch (error) {
        console.error('Error creating lease:', stringifyError(error));
        return NextResponse.json({ error: 'Failed to create lease.' }, { status: 500 });
    }
}
