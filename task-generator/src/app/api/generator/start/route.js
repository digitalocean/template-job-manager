import { startGenerator } from '@/generatorManager';

export async function GET(req, res) {
    try {
        const result = await startGenerator();
        return new Response(JSON.stringify(result), { status: 200 });
    } catch (error) {
        return new Response(JSON.stringify({ status: 'Failed to start generator.', error }), { status: 500 });
    }
}