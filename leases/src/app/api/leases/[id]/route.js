import { NextResponse } from 'next/server';
import { stringifyError } from 'next/dist/shared/lib/utils';
import { prisma } from '@/app/lib/prisma-client';


// Handle GET request to get a lease by ID
export async function GET(req, { params }) {
    try {
        const id = parseInt((await params).id, 10);
        const lease = await prisma.lease.findUnique({
            where: {
                id: id
            },
        });

        if (!lease) {
            return NextResponse.json({ error: 'Lease not found.' }, { status: 404 });
        }

        return NextResponse.json({ lease }, { status: 200 });
    } catch (error) {
        console.error('Error fetching lease:', stringifyError(error));
        return NextResponse.json({ error: 'Failed to fetch lease.' }, { status: 500 });
    }
}

// Handle DELETE request to release (delete) a lease by ID 
export async function DELETE(req, { params }) {
    try {
        const id = parseInt((await params).id, 10);
        const query = `
            UPDATE leases
             SET released_at = NOW(), expires_at = NOW()
            WHERE id = $1 
            RETURNING *;
        `;
        const values = [id];
        const result = await client.query(query, values);

        if (result.rows.length === 0) {
            return NextResponse.json({ error: 'Lease not found.' }, { status: 404 });
        }

        return NextResponse.json({ message: 'Lease released successfully.' }, { status: 200 });
    } catch (error) {
        console.error('Error releasing lease:', stringifyError(error));
        return NextResponse.json({ error: 'Failed to release lease.' }, { status: 500 });
    }
}
