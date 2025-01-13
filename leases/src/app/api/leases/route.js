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
        const query = `
            INSERT INTO leases (resource, holder, expires_at)
            VALUES ($1, $2, NOW() + INTERVAL '30 seconds')
            ON CONFLICT (resource) WHERE expires_at >= NOW()
            DO NOTHING
            RETURNING *;
        `;
        const values = [resource, holder];
        const result = await client.query(query, values);

        if (result.rows.length === 0) {
            return NextResponse.json({ error: 'Resource already has an active lease.' }, { status: 409 });
        }

        return NextResponse.json(result.rows[0], { status: 201 });
    } catch (error) {
        console.error('Error creating lease:', stringifyError(error));
        return NextResponse.json({ error: 'Failed to create lease.' }, { status: 500 });
    }
}
