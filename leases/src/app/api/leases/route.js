import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Handle GET request to get the status of the worker and list of leases
export async function GET(req) {
    try {
        const leases = await prisma.lease.findMany();
        return new Response(JSON.stringify({ leases }), { status: 200 });
    } catch (error) {
        console.error('Error fetching leases:', error);
        return new Response(JSON.stringify({ error: 'Failed to fetch leases.' }), { status: 500 });
    }
}

// Handle POST request to create a new lease
export async function POST(req) {
    const client = await pool.connect();
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
            return new Response(JSON.stringify({ error: 'Resource already has an active lease.' }), { status: 409 });
        }

        return new Response(JSON.stringify(result.rows[0]), { status: 201 });
    } catch (error) {
        console.error('Error creating lease:', error);
        return new Response(JSON.stringify({ error: 'Failed to create lease.' }), { status: 500 });
    } finally {
        client.release();
    }
}
