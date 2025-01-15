import WorkerManager, { WorkerStatus } from '@/app/workerManager';
import { generatorFunction } from '@/app/generator';
import { NextResponse } from 'next/server'
import { stringifyError } from 'next/dist/shared/lib/utils';

// Handle POST request to start the worker
export async function POST(req) {
    try {
        // Generate a task every second.
        const status = await WorkerManager.startWorker(generatorFunction, 1000);
        return NextResponse.json(status, { status: status.status === WorkerStatus.STARTED ? 200 : 409 });
    } catch (error) {
        console.error('Error starting worker:', stringifyError(error));
        return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 });
    }
}
