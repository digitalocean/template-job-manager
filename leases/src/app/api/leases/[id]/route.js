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

        return NextResponse.json(lease, { status: 200 });
    } catch (error) {
        console.error('Error fetching lease:', stringifyError(error));
        return NextResponse.json({ error: 'Failed to fetch lease.' }, { status: 500 });
    }
}

// Handle DELETE request to release (delete) a lease by ID 
export async function DELETE(req, { params }) {
    try {
        const { holder, resource } = await req.json();
        if (!holder || holder.length === 0) {
            return NextResponse.json({ error: 'Missing holder.' }, { status: 400 });
        }
        if (!resource || resource.length === 0) {
            return NextResponse.json({ error: 'Missing resource.' }, { status: 400 });
        }
        const id = parseInt((await params).id, 10);

        const result = await prisma.$queryRaw`
            UPDATE leases
             SET released_at = NOW(), 
             expires_at = NOW()
            WHERE 
                id = ${id}
                AND holder = ${holder}
                AND resource = ${resource}
                AND released_at is null
            RETURNING *;
        `;

        if (result.length === 0) {
            return NextResponse.json({ error: 'Lease not found.' }, { status: 404 });
        }

        return NextResponse.json({ message: 'Lease released successfully.' }, { status: 200 });
    } catch (error) {
        console.error('Error releasing lease:', stringifyError(error));
        return NextResponse.json({ error: 'Failed to release lease.' }, { status: 500 });
    }
}
