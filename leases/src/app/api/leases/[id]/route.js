import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

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
            return new Response(JSON.stringify({ error: 'Lease not found.' }), { status: 404 });
        }

        return new Response(JSON.stringify({ lease }), { status: 200 });
    } catch (error) {
        console.error('Error fetching lease:', error);
        return new Response(JSON.stringify({ error: 'Failed to fetch lease.' }), { status: 500 });
    }
}

// Handle DELETE request to release (delete) a lease by ID 
export async function DELETE(req, { params }) {
    const client = await pool.connect();
    try {
        const id = parseInt((await params).id, 10);
        const query = `
            DELETE FROM leases
            WHERE id = $1
            RETURNING *;
        `;
        const values = [id];
        const result = await client.query(query, values);

        if (result.rows.length === 0) {
            return new Response(JSON.stringify({ error: 'Lease not found.' }), { status: 404 });
        }

        return new Response(JSON.stringify({ message: 'Lease released successfully.' }), { status: 200 });
    } catch (error) {
        console.error('Error releasing lease:', error);
        return new Response(JSON.stringify({ error: 'Failed to release lease.' }), { status: 500 });
    } finally {
        client.release();
    }
}
