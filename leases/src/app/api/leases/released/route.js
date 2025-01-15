import { NextResponse } from 'next/server'
import { prisma } from '@/app/lib/prisma-client';
import { stringifyError } from 'next/dist/shared/lib/utils';
 
// Handle GET request to get the list of released leases
export async function GET(req) {
    try {
        const leases = await prisma.lease.findMany({
            where: {
                releasedAt: {
                    not: null
                }
            }
        });
        return NextResponse.json({ leases }, { status: 200 });
    } catch (error) {
        console.error('Error fetching released leases:',  stringifyError(error));
        return NextResponse.json({ error: 'Failed to fetch released leases.' }, { status: 500 });
    }
}
