import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

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
        return new Response(JSON.stringify({ leases }), { status: 200 });
    } catch (error) {
        console.error('Error fetching expired leases:', error);
        return new Response(JSON.stringify({ error: 'Failed to fetch expired leases.' }), { status: 500 });
    }
}
