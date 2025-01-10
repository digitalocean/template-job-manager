import WorkerManager, { WorkerStatus } from '@/app/workerManager';
import { generatorFunction } from '@/app/generator';

// Handle POST request to start the worker
export async function POST(req) {
    try {
        const status = await WorkerManager.startWorker(generatorFunction);
        return new Response(JSON.stringify(status), { status: status.status === WorkerStatus.STARTED ? 200 : 409 });
    } catch (error) {
        console.error('Error starting worker:', error);
        return new Response(JSON.stringify({ error: 'Something went wrong.' }), { status: 500 });
    }
}
