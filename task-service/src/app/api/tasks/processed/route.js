import { NextResponse } from 'next/server'
import { stringifyError } from 'next/dist/shared/lib/utils';
import { prisma } from '@/app/lib/prisma-client';

// Handle GET request to get the status of the worker and list of tasks
export async function GET(req) {
    try {
        const tasks = await prisma.task.findMany({
            where: {
                processedAt: {
                    not: null
                }
            }
        });
        return NextResponse.json({ tasks }, { status: 200 });
    } catch (error) {
        console.error('Error fetching tasks:', stringifyError(error));
        return NextResponse.json({ error: 'Failed to fetch tasks.' }, { status: 500 });
    }
}