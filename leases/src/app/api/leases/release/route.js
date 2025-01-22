import { NextResponse } from 'next/server'
import { stringifyError } from 'next/dist/shared/lib/utils';
import { prisma } from '@/app/lib/prisma-client';

// Handle DELETE request to renew a lease.
export async function DELETE(req) {
    try {
        const { holder, resource } = await req.json();
        if (!holder || holder.length === 0) {
            return NextResponse.json({ error: 'Missing holder.' }, { status: 400 });
        }
        if (!resource || resource.length === 0) {
            return NextResponse.json({ error: 'Missing resource.' }, { status: 400 });
        }

        const updatedRows = await prisma.$queryRaw`
            UPDATE leases
            SET 
                released_at = NOW(),
                expires_at = NOW()
            WHERE
                holder = ${holder} 
                AND resource = ${resource}
                AND expires_at > NOW()
                AND released_at is null
            RETURNING *;`;

        if (updatedRows.length === 0) {
            return NextResponse.json({ error: 'No eligible lease exists for that resource and holder.' }, { status: 404 });
        }

        return NextResponse.json(updatedRows[0], { status: 201 });
    } catch (error) {
        console.error('Error releasing lease:', stringifyError(error));
        return NextResponse.json({ error: 'Failed to release lease.' }, { status: 500 });
    }
}
