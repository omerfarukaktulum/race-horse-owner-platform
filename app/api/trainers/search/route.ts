import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')
    const page = searchParams.get('page') || '1'

    if (!query || query.length < 2) {
      return NextResponse.json(
        { error: 'Arama metni en az 2 karakter olmalı' },
        { status: 400 }
      )
    }

    const upstreamUrl = `https://www.tjk.org/TR/YarisSever/Query/ParameterQuery?parameterName=AntronorId&filter=${encodeURIComponent(
      query
    )}&page=${encodeURIComponent(page)}&parentParameterName=`

    const response = await fetch(upstreamUrl, {
      cache: 'no-store',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'application/json,text/plain,*/*',
      },
    })

    if (!response.ok) {
      return NextResponse.json(
        { error: 'TJK arama servisine ulaşılamadı' },
        { status: 502 }
      )
    }

    const raw = await response.text()
    let parsed: unknown
    try {
      parsed = JSON.parse(raw)
    } catch {
      parsed = raw
    }

    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      Array.isArray((parsed as any).entities)
    ) {
      const normalized = (parsed as any).entities.map((entity: any) => ({
        id: String(entity.id ?? entity.value ?? ''),
        name: entity.text ?? entity.name ?? '',
      }))

      return NextResponse.json({
        results: normalized,
        totalCount: (parsed as any).totalCount ?? normalized.length,
      })
    }

    return NextResponse.json({ results: parsed })
  } catch (error) {
    console.error('[Trainer Search] error:', error)
    return NextResponse.json(
      { error: 'Arama yapılırken hata oluştu' },
      { status: 500 }
    )
  }
}

