import { NextRequest, NextResponse } from 'next/server';
import { startupService } from '../../../lib/services/startup';

let isInitialized = false;

export async function GET(request: NextRequest) {
  try {
    if (!isInitialized) {
      await startupService.initialize();
      isInitialized = true;
      console.log('✅ Startup services initialized successfully');
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'Startup services initialized',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Failed to initialize startup services:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to initialize startup services',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}