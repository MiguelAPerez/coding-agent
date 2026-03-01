// Example API Route

import { NextResponse } from 'next/server';

interface PingRequestBody {
    name: string;
}

export async function GET() {
    return NextResponse.json({ message: 'pong' });
}

export async function POST(request: Request) {
    try {
        const body: PingRequestBody = await request.json();
        return NextResponse.json({
            message: 'pong',
            received: body.name
        });
    } catch (error) {
        return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }
}