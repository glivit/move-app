import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

// Food search: local Supabase first, then Open Food Facts fallback
// Local products have source: 'local', OFF products have source: 'openfoodfacts'

const CACHE = new Map<string, { data: any; timestamp: number }>()
const CACHE_TTL = 1000 * 60 * 30 // 30 minutes

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('q')?.trim()
  const barcode = searchParams.get('barcode')?.trim()
  const popular = searchParams.get('popular') === 'true'

  if (!query && !barcode && !popular) {
    return NextResponse.json({ products: [] })
  }

  // Popular products: return only local popular items
  if (popular && !query && !barcode) {
    try {
      const supabase = await createServerSupabaseClient()
      const { data } = await supabase
        .from('food_products')
        .select('*')
        .eq('is_popular', true)
        .order('name')
        .limit(30)
      return NextResponse.json({ products: (data || []).map(mapLocalProduct), count: data?.length || 0 })
    } catch (err) {
      console.error('Popular products error:', err)
      return NextResponse.json({ products: [] })
    }
  }

  const cacheKey = barcode || query || ''
  const cached = CACHE.get(cacheKey)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return NextResponse.json(cached.data)
  }

  try {
    let allProducts: any[] = []

    // 1. Search local food_products table first
    try {
      const supabase = await createServerSupabaseClient()
      const localProducts = await searchLocalProducts(supabase, query, barcode)
      allProducts = localProducts
    } catch (localError) {
      console.warn('Local search failed, will try Open Food Facts:', localError)
    }

    // 2. Search Open Food Facts as fallback
    const offProducts = await searchOpenFoodFacts(query, barcode)

    // 3. Merge results: local first, then OFF (deduplicated by name)
    const localNames = new Set(allProducts.map(p => (p.name || '').toLowerCase()))
    const mergedProducts = [
      ...allProducts,
      ...offProducts.filter(p => !localNames.has((p.name || '').toLowerCase()))
    ]

    const result = {
      products: mergedProducts,
      count: mergedProducts.length,
    }

    CACHE.set(cacheKey, { data: result, timestamp: Date.now() })
    return NextResponse.json(result)
  } catch (error) {
    console.error('Food search error:', error)
    return NextResponse.json({ products: [], error: 'Zoeken mislukt' }, { status: 500 })
  }
}

async function searchLocalProducts(supabase: any, query?: string | null, barcode?: string | null) {
  const products: any[] = []

  if (barcode) {
    // Exact match on barcode
    const { data, error } = await supabase
      .from('food_products')
      .select('*')
      .eq('barcode', barcode)

    if (error) {
      console.error('Local barcode search error:', error)
      return []
    }

    if (data && data.length > 0) {
      return data.map(mapLocalProduct)
    }
  }

  if (query) {
    // Text search using ilike on name column
    const { data, error } = await supabase
      .from('food_products')
      .select('*')
      .or(`name.ilike.%${query}%,name_nl.ilike.%${query}%`)
      .limit(20)

    if (error) {
      console.error('Local text search error:', error)
      return []
    }

    if (data && data.length > 0) {
      return data.map(mapLocalProduct)
    }
  }

  return []
}

async function searchOpenFoodFacts(query?: string | null, barcode?: string | null) {
  try {
    let url: string
    if (barcode) {
      // Lookup by barcode
      url = `https://world.openfoodfacts.org/api/v2/product/${barcode}?fields=product_name,brands,image_front_small_url,image_front_url,nutriments,serving_size,quantity,categories_tags_nl`
    } else if (query) {
      // Search by name — prefer Belgian/Dutch products
      url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=20&fields=code,product_name,brands,image_front_small_url,image_front_url,nutriments,serving_size,quantity,categories_tags_nl,nutriscore_grade`
    } else {
      return []
    }

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'MOVE-CoachingApp/1.0 (glenndelille@gmail.com)',
      },
    })

    if (!response.ok) {
      console.warn(`Open Food Facts API returned ${response.status}`)
      return []
    }

    const data = await response.json()
    const products: any[] = []

    if (barcode) {
      // Single product response
      const p = data.product
      if (p && p.product_name) {
        products.push(mapOpenFoodFactsProduct(p))
      }
    } else {
      // Search results
      const offProducts = (data.products || [])
        .filter((p: any) => p.product_name && p.nutriments)
        .map(mapOpenFoodFactsProduct)

      products.push(...offProducts)
    }

    return products
  } catch (error) {
    console.warn('Open Food Facts search error:', error)
    return []
  }
}

function mapLocalProduct(p: any) {
  return {
    source: 'local',
    barcode: p.barcode || null,
    name: p.name || 'Onbekend',
    brand: p.brand || null,
    image_small: p.image_url || null,
    image: p.image_url || null,
    serving_size: p.serving_size_g || null,
    serving_label: p.serving_label || null,
    quantity: null,
    nutriscore: null,
    per100g: {
      calories: p.calories_per_100g || 0,
      protein: p.protein_per_100g || 0,
      carbs: p.carbs_per_100g || 0,
      fat: p.fat_per_100g || 0,
      fiber: p.fiber_per_100g || 0,
      sugar: p.sugar_per_100g || 0,
      salt: p.salt_per_100g || 0,
    },
  }
}

function mapOpenFoodFactsProduct(p: any) {
  const n = p.nutriments || {}
  return {
    source: 'openfoodfacts',
    barcode: p.code || null,
    name: p.product_name || 'Onbekend',
    brand: p.brands || null,
    image_small: p.image_front_small_url || null,
    image: p.image_front_url || null,
    serving_size: p.serving_size || null,
    serving_label: null,
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
