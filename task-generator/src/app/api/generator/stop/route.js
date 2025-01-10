import { stopWorker, WorkerStatus } from '@/app/workerManager';

// Handle DELETE request to stop the worker
export async function DELETE(req) {
    try {
        const status = await stopWorker();
        return new Response(JSON.stringify(status), { status: status.status === WorkerStatus.STOPPED ? 200 : 409 });
    } catch (error) {
        return new Response(JSON.stringify({ error: 'Something went wrong.' }), { status: 500 });
    }
}
