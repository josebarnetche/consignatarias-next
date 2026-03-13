import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const runtime = 'edge'

/**
 * @openapi
 * /api/health:
 *   get:
 *     summary: Quick health check
 *     description: Minimal endpoint for uptime monitoring. No database calls.
 *     responses:
 *       200:
 *         description: Service is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                   example: true
 *                 ts:
 *                   type: number
 *                   description: Unix timestamp
 */
export async function GET() {
  return NextResponse.json({
    ok: true,
    ts: Date.now()
  }, {
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate'
    }
  })
}
