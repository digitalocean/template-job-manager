import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Handle GET request to get the list of active leases
export async function GET(req) {
    try {
        const leases = await prisma.lease.findMany({
            where: {
                expiresAt: {
                    gte: new Date()
                },
                releasedAt: null
            }
        });
        return new Response(JSON.stringify({ leases }), { status: 200 });
    } catch (error) {
        console.error('Error fetching active leases:', error);
        return new Response(JSON.stringify({ error: 'Failed to fetch active leases.' }), { status: 500 });
    }
}
