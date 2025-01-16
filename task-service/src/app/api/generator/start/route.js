import { WorkerStatus } from '@/app/lib/worker-manager';

import { NextResponse } from 'next/server'
import { stringifyError } from 'next/dist/shared/lib/utils';
import { GeneratorService } from '@/app/lib/generator';

// Handle POST request to start the worker
export async function POST(req) {
    try {
        // Generate a task every second.
        const status = await GeneratorService.start();
        return NextResponse.json(status, { status: status.status === WorkerStatus.STARTED ? 200 : 409 });
    } catch (error) {
        console.error('Error starting worker:', stringifyError(error));
        return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 });
    }
}
