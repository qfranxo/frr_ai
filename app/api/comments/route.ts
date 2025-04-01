import { db } from '@/lib/db'
import { comments } from '@/db/migrations/schema'
import { eq } from 'drizzle-orm'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const imageId = searchParams.get('imageId')

    if (!imageId) {
      return NextResponse.json({ success: false, error: 'imageId is required' }, { status: 400 })
    }

    const data = await db
      .select()
      .from(comments)
      .where(eq(comments.postId, imageId))

    return NextResponse.json({ success: true, data })
  } catch (err) {
    console.error('[GET_COMMENTS_ERROR]', err)
    return NextResponse.json({ success: false, error: 'Failed to load comments' }, { status: 500 })
  }
} 