import { NextResponse } from 'next/server'
import db from '@/lib/db'

export async function GET() {
  try {
    await db.$queryRaw`SELECT 1`
    return NextResponse.json({ status: 'ok', mode: 'ready', timestamp: new Date().toISOString() })
  } catch {
    return NextResponse.json(
      { status: 'error', mode: 'ready', error: 'Database unreachable' },
      { status: 503 }
    )
  }
}
