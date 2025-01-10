
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

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
        return new Response(JSON.stringify({ leases }), { status: 200 });
    } catch (error) {
        console.error('Error fetching released leases:', error);
        return new Response(JSON.stringify({ error: 'Failed to fetch released leases.' }), { status: 500 });
    }
}