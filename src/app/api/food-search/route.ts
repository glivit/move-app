import { NextRequest, NextResponse } from 'next/server'

// Open Food Facts API proxy — avoids CORS issues and adds caching
// Docs: https://openfoodfacts.github.io/openfoodfacts-server/api/

const CACHE = new Map<string, { data: any; timestamp: number }>()
const CACHE_TTL = 1000 * 60 * 30 // 30 minutes

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('q')?.trim()
  const barcode = searchParams.get('barcode')?.trim()

  if (!query && !barcode) {
    return NextResponse.json({ products: [] })
  }

  const cacheKey = barcode || query || ''
  const cached = CACHE.get(cacheKey)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return NextResponse.json(cached.data)
  }

  try {
    let url: string
    if (barcode) {
      // Lookup by barcode
      url = `https://world.openfoodfacts.org/api/v2/product/${barcode}?fields=product_name,brands,image_front_small_url,image_front_url,nutriments,serving_size,quantity,categories_tags_nl`
    } else {
      // Search by name — prefer Belgian/Dutch products
      url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query!)}&search_simple=1&action=process&json=1&page_size=20&fields=code,product_name,brands,image_front_small_url,image_front_url,nutriments,serving_size,quantity,categories_tags_nl,nutriscore_grade`
    }

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'MOVE-CoachingApp/1.0 (glenndelille@gmail.com)',
      },
    })

    if (!response.ok) {
      throw new Error(`Open Food Facts API error: ${response.status}`)
    }

    const data = await response.json()

    let result: any

    if (barcode) {
      // Single product response
      const p = data.product
      if (!p) {
        result = { products: [] }
      } else {
        result = {
          products: [mapProduct(p)],
        }
      }
    } else {
      // Search results
      const products = (data.products || [])
        .filter((p: any) => p.product_name && p.nutriments)
        .map(mapProduct)

      result = { products, count: data.count || 0 }
    }

    CACHE.set(cacheKey, { data: result, timestamp: Date.now() })
    return NextResponse.json(result)
  } catch (error) {
    console.error('Food search error:', error)
    return NextResponse.json({ products: [], error: 'Zoeken mislukt' }, { status: 500 })
  }
}

function mapProduct(p: any) {
  const n = p.nutriments || {}
  return {
    barcode: p.code || null,
    name: p.product_name || 'Onbekend',
    brand: p.brands || null,
    image_small: p.image_front_small_url || null,
    image: p.image_front_url || null,
    serving_size: p.serving_size || null,
    quantity: p.quantity || null,
    nutriscore: p.nutriscore_grade || null,
    per100g: {
      calories: Math.round(n['energy-kcal_100g'] || n['energy-kcal'] || 0),
      protein: Math.round((n.proteins_100g || 0) * 10) / 10,
      carbs: Math.round((n.carbohydrates_100g || 0) * 10) / 10,
      fat: Math.round((n.fat_100g || 0) * 10) / 10,
      fiber: Math.round((n.fiber_100g || 0) * 10) / 10,
      sugar: Math.round((n.sugars_100g || 0) * 10) / 10,
      salt: Math.round((n.salt_100g || 0) * 100) / 100,
    },
  }
}
