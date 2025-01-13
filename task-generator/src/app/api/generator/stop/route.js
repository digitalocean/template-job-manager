import WorkerManager, { WorkerStatus } from '@/app/workerManager';
import { stringifyError } from 'next/dist/shared/lib/utils';

// Handle DELETE request to stop the worker
export async function DELETE(req) {
    try {
        const status = await WorkerManager.stopWorker();
        return NextResponse.json(JSON.stringify(status), { status: status.status === WorkerStatus.STOPPED ? 200 : 409 });
    } catch (error) {
        console.error('Error stopping worker:', stringifyError(error));
        return NextResponse.json(JSON.stringify({ error: 'Something went wrong.' }), { status: 500 });
    }
}
