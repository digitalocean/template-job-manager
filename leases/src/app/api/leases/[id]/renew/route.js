import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client';
import { stringifyError } from 'next/dist/shared/lib/utils';

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
            return NextResponse.json({ error: 'Lease not found or already expired.' }, { status: 404 });
        }

        return NextResponse.json(result.rows[0], { status: 200 });
    } catch (error) {
        console.error('Error fetching expired leases:', stringifyError(error));
        return NextResponse.json({ error: 'Failed to renew lease.' }, { status: 500 });
    } finally {
        client.release();
    }
}
