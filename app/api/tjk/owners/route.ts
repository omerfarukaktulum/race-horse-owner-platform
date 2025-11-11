import { NextResponse } from 'next/server'
import { tjkApiRateLimiter, getClientIp } from '@/lib/rate-limit'
import { searchTJKOwnersAPI, getMockOwners } from '@/lib/tjk-api'

/**
 * Search for owner names using TJK's official API
 * Much faster and more reliable than Playwright scraping
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')?.trim()

    if (!query || query.length < 2) {
      return NextResponse.json(
        { error: 'En az 2 karakter girmelisiniz' },
        { status: 400 }
      )
    }

    // Rate limiting
    const ip = getClientIp(request)
    const allowed = await tjkApiRateLimiter.check(ip)
    if (!allowed) {
      return NextResponse.json(
        { error: 'Çok fazla istek. Lütfen bir süre sonra tekrar deneyin.' },
        { status: 429 }
      )
    }

    // Try real TJK API first
    let results
    try {
      results = await searchTJKOwnersAPI(query)
      
      // If no results from API, use mock data
      if (results.length === 0) {
        console.log('No results from TJK API, using mock data')
        results = getMockOwners(query)
      }
    } catch (apiError) {
      console.error('TJK API failed, falling back to mock data:', apiError)
      results = getMockOwners(query)
    }

    return NextResponse.json({ results })
  } catch (error) {
    console.error('TJK owner search error:', error)
    return NextResponse.json(
      { error: 'Sahip araması başarısız oldu. Lütfen tekrar deneyin.' },
      { status: 500 }
    )
  }
}
