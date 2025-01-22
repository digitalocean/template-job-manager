import { NextResponse } from 'next/server'
import { stringifyError } from 'next/dist/shared/lib/utils';
import { prisma } from '@/app/lib/prisma-client';

// Handle GET request to get the status of the worker and list of leases
export async function GET(req) {
    try {
        const leases = await prisma.lease.findMany();
        return NextResponse.json({ leases }, { status: 200 });
    } catch (error) {
        console.error('Error fetching leases:', stringifyError(error));
        return NextResponse.json({ error: 'Failed to fetch leases.' }, { status: 500 });
    }
}

// Handle POST request to create a new lease
export async function POST(req) {
    try {
        const { resource, holder } = await req.json();

        const result = await prisma.$queryRaw`
            INSERT INTO leases (resource, holder, expires_at)
                VALUES (${resource}, ${holder}, NOW() + INTERVAL '30 seconds')
            ON CONFLICT (resource) 
            DO UPDATE 
                SET 
                    holder = ${holder},
                    created_at = NOW(),
                    renewed_at = null,
                    released_at = null,
                    expires_at = NOW() + INTERVAL '30 seconds'
            WHERE leases.expires_at <= NOW()
            RETURNING *;
        `;

        if (result.length === 0) {
            return NextResponse.json({ error: 'Resource already has an active lease.' }, { status: 409 });
        }

        return NextResponse.json(result[0], { status: 201 });
    } catch (error) {
        console.error('Error creating lease:', stringifyError(error));
        return NextResponse.json({ error: 'Failed to create lease.' }, { status: 500 });
    }
}
