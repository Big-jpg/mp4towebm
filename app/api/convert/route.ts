import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const file = formData.get('file') as File;
        const targetFormat = formData.get('targetFormat') as string;

        if (!file || !targetFormat) {
            return NextResponse.json(
                { error: 'File and target format are required' },
                { status: 400 }
            );
        }

        return NextResponse.json(
            { message: 'Server-side conversion is not implemented yet' },
            { status: 501 }
        );
    } catch (error) {
        console.error('Error in conversion API:', error);
        return NextResponse.json(
            { error: 'Server error during conversion' },
            { status: 500 }
        );
    }
}