
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Handle PUT request to renew a lease by ID
export async function PUT(req, { params }) {
    try {
        const id = parseInt((await params).id, 10);
        const query = `
            UPDATE leases
            SET renewed_at = NOW(), expires_at = NOW() + INTERVAL '30 seconds'
            WHERE id = $1 AND expires_at >= NOW()
            RETURNING *;
        `;
        const values = [id];
        const result = await client.query(query, values);

        if (result.rows.length === 0) {
            return new Response(JSON.stringify({ error: 'Lease not found or already expired.' }), { status: 404 });
        }

        return new Response(JSON.stringify(result.rows[0]), { status: 200 });
    } catch (error) {
        console.error('Error renewing lease:', error);
        return new Response(JSON.stringify({ error: 'Failed to renew lease.' }), { status: 500 });
    } finally {
        client.release();
    }
}
