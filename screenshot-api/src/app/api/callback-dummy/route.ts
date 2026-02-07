import { NextRequest, NextResponse } from 'next/server';

/**
 * Dummy callback endpoint for testing
 * This endpoint accepts webhook callbacks but does nothing with them
 * Used by the test UI when callbackUrl is required
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Log the callback for debugging (optional)
    console.log('📥 Dummy callback received:', {
      jobId: body.jobId,
      status: body.status,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      message: 'Callback received',
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Invalid callback payload',
      },
      { status: 400 }
    );
  }
}
