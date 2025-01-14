import { NextResponse } from 'next/server';
import { stringifyError } from 'next/dist/shared/lib/utils';
import { prisma } from '@/app/lib/prisma-client';


// Handle GET request to get a task by ID
export async function GET(req, { params }) {
    try {
        const id = parseInt((await params).id, 10);
        const task = await prisma.task.findUnique({
            where: {
                id: id
            },
        });

        if (!task) {
            return NextResponse.json({ error: 'task not found.' }, { status: 404 });
        }

        return NextResponse.json({ task }, { status: 200 });
    } catch (error) {
        console.error('Error fetching task:', stringifyError(error));
        return NextResponse.json({ error: 'Failed to fetch task.' }, { status: 500 });
    }
}
