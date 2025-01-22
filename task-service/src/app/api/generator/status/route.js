import { GeneratorService } from '@/app/lib/generator';
import { stringifyError } from 'next/dist/shared/lib/utils';
import { NextResponse } from 'next/server'

// Handle GET request to get the status of the worker
export async function GET(req) {
    try {
        const status = await GeneratorService.getStatus();
        return NextResponse.json(status, { status: 200 });
    } catch (error) {
        console.error('Error fetching status:', stringifyError(error));
        return NextResponse.json({ error: 'Failed to fetch status.' }, { status: 500 });
    }
}
