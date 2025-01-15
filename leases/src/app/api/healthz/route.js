import { NextResponse } from 'next/server'

const STATUS_OK = 'ok';
const CONTENT_TYPE_JSON = 'application/json';

export async function GET(req) {
    // Optionally, check app or service health (e.g., DB connection, cache, etc.)
    const healthStatus = {
        status: STATUS_OK,
        timestamp: new Date().toISOString(),
    };

    return NextResponse.json(healthStatus, {
        status: 200,
        headers: { 'Content-Type': CONTENT_TYPE_JSON },
    });
}
