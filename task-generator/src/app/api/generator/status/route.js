import WorkerManager from '@/app/workerManager';

// Handle GET request to get the status of the worker
export async function GET(req) {
    try {
        const status = await WorkerManager.getStatus();
        return new Response(JSON.stringify(status), { status: 200 });
    } catch (error) {
        console.error('Error fetching status:', error);
        return new Response(JSON.stringify({ error: 'Failed to fetch status.' }), { status: 500 });
    }
}
