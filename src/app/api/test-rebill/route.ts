import { NextResponse } from 'next/server'

// TEMPORARY HARDCODE FOR DEBUGGING - REMOVE AFTER TEST
const HARDCODED_KEY = 'sk_7ed9e63a1b8c4f36bfb8f50433b8a396'

export async function GET() {
  const secretKey = process.env.REBILL_SECRET_KEY || HARDCODED_KEY
  
  const debug = {
    REBILL_SECRET_KEY_exists: !!secretKey,
    REBILL_SECRET_KEY_length: secretKey?.length,
    REBILL_SECRET_KEY_prefix: secretKey?.substring(0, 5),
    REBILL_PRO_PLAN_ID: process.env.REBILL_PRO_PLAN_ID,
    REBILL_FRIGO_PLAN_ID: process.env.REBILL_FRIGO_PLAN_ID,
  }
  
  if (!secretKey) {
    return NextResponse.json({ 
      error: 'REBILL_SECRET_KEY not configured',
      debug 
    }, { status: 500 })
  }
  
  // Try to create a test payment link
  try {
    const res = await fetch('https://api.rebill.com/v3/payment-links', {
      method: 'POST',
      headers: {
        'x-api-key': secretKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: [{ language: 'es', text: 'Test Link' }],
        paymentMethods: [{ methods: ['card'], currency: 'ARS' }],
        prices: [{ amount: 100, currency: 'ARS' }],
        metadata: { test: 'true' },
        redirectUrls: { approved: 'https://www.consignatarias.com.ar' },
        isSingleUse: true,
      }),
    })
    
    const text = await res.text()
    
    if (!res.ok) {
      return NextResponse.json({
        error: 'Rebill API failed',
        status: res.status,
        response: text,
        debug
      }, { status: 500 })
    }
    
    const data = JSON.parse(text)
    return NextResponse.json({
      success: true,
      paymentLinkUrl: data.url,
      paymentLinkId: data.id,
      debug
    })
  } catch (err) {
    return NextResponse.json({
      error: 'Exception',
      message: err instanceof Error ? err.message : String(err),
      debug
    }, { status: 500 })
  }
}
