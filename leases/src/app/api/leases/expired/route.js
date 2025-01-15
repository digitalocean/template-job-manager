import { NextResponse } from 'next/server'
import { prisma } from '@/app/lib/prisma-client';
import { stringifyError } from 'next/dist/shared/lib/utils';

// Handle GET request to get the list of expired leases
export async function GET(req) {
    try {
        const leases = await prisma.lease.findMany({
            where: {
                expiresAt: {
                    lt: new Date()
                },
                releasedAt: null
            }
        });
        return NextResponse.json({ leases }, { status: 200 });
    } catch (error) {
        console.error('Error fetching expired leases:', stringifyError(error));
        return NextResponse.json({ error: 'Failed to fetch expired leases.' }, { status: 500 });
    }
}
