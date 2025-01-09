import { stopGenerator } from '@/generatorManager';

export async function GET(req, res) {
    try {
        const result = await stopGenerator();
        return new Response(JSON.stringify(result), { status: 200 });
    } catch (error) {
        return new Response(JSON.stringify({ status: 'Failed to stop generator.', error }), { status: 500 });
    }
}