const STATUS_OK = 'ok';
const CONTENT_TYPE_JSON = 'application/json';

export function GET(req, res) {
    // Optionally, check app or service health (e.g., DB connection, cache, etc.)
    const healthStatus = {
        status: STATUS_OK,
        timestamp: new Date().toISOString(),
    };

    return new Response(JSON.stringify(healthStatus), {
        status: 200,
        headers: { 'Content-Type': CONTENT_TYPE_JSON },
    });
}