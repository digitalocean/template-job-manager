import { NextResponse } from 'next/server'
import { stringifyError } from 'next/dist/shared/lib/utils';
import { prisma } from '@/app/lib/prisma-client';
import process from 'process';

const { SERVICE_LEASES_URL, NEXT_PUBLIC_URL } = process.env;

// Handle PUT request to get the next task to process.
export async function PUT(req, { params }) {
    try {
        const id = parseInt((await params).id, 10);
        const { processor } = await req.json();
        if (!processor || processor.length === 0) {
            return NextResponse.json({ error: 'Missing processor.' }, { status: 400 });
        }

        return await prisma.$transaction(async (tx) => {
            const taskResult = await tx.$queryRaw`SELECT * FROM tasks 
                                                WHERE
                                                    id = ${id}
                                                LIMIT 1
                                                FOR UPDATE;`;

            if (!taskResult || taskResult.length === 0) {
                return NextResponse.json({ message: 'Task not found.' }, { status: 200 });
            }
            const task = taskResult[0];

            if (task.processor !== processor) {
                return NextResponse.json({ message: 'Task is not assigned to you.' }, { status: 200 });
            }

            if (task.processedAt) {
                return NextResponse.json({ message: 'Task already processed.' }, { status: 409 });
            }

            const leaseResponse = await fetch(`${SERVICE_LEASES_URL}/renew`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    resource: `${NEXT_PUBLIC_URL}/api/tasks/${task.id}`,
                    holder: task.processor,
                }),
            });

            // Check if the lease was created successfully
            if (!leaseResponse.ok && leaseResponse.status !== 404) {
                return NextResponse.json({ error: 'Failed to renew lease.' }, { status: 500 });
            } else if (leaseResponse.status === 404) {
                // Retry with the next tasks
                return NextResponse.json({ error: 'Task lease has expired.' }, { status: 409 });
            } else {
                const lease = await leaseResponse.json();

                // Update the task's row
                const updatedTask = await tx.task.update({
                    data: {
                        lastHeartBeatAt: lease.renewed_at,
                        mustHeartBeatBefore: lease.expires_at,
                    },
                    where: {
                        id: task.id,
                    },
                });

                return NextResponse.json(updatedTask, { status: 202 });
            }
        }, {
            timeout: 30 * 1000, // 30 seconds
        })
    } catch (error) {
        console.error('Error heartbeating: ', stringifyError(error));
        return NextResponse.json({ error: 'Failed to heartbeat' }, { status: 500 });
    }
}
