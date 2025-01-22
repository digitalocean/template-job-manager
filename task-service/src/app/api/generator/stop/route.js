import { GeneratorService } from '@/app/lib/generator';
import { stringifyError } from 'next/dist/shared/lib/utils';
import { NextResponse } from 'next/server'
import { WorkerStatus } from '@/app/lib/worker-manager';

// Handle DELETE request to stop the worker
export async function DELETE(req) {
    try {
        const status = await GeneratorService.stop();
        return NextResponse.json(status, { status: status.status === WorkerStatus.STOPPED ? 200 : 409 });
    } catch (error) {
        console.error('Error stopping worker:', stringifyError(error));
        return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 });
    }
}
