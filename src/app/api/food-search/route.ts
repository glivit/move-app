import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

// Food search: local Supabase only (750+ products)
// No external API dependency — fast, reliable, offline-capable

const CACHE = new Map<string, { data: any; timestamp: number }>()
const CACHE_TTL = 1000 * 60 * 30 // 30 minutes

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('q')?.trim()
  const barcode = searchParams.get('barcode')?.trim()
  const popular = searchParams.get('popular') === 'true'
  const category = searchParams.get('category')?.trim()

  if (!query && !barcode && !popular) {
    return NextResponse.json({ products: [] })
  }

  // Popular products
  if (popular && !query && !barcode) {
    try {
      const supabase = await createServerSupabaseClient()
      let q = supabase
        .from('food_products')
        .select('*')
        .eq('is_popular', true)
        .order('name')
        .limit(40)

      if (category) {
        q = q.eq('category', category)
      }

      const { data } = await q
      return NextResponse.json({ products: (data || []).map(mapLocalProduct), count: data?.length || 0 })
    } catch (err) {
      console.error('Popular products error:', err)
      return NextResponse.json({ products: [] })
    }
  }

  const cacheKey = `${barcode || ''}:${query || ''}:${category || ''}`
  const cached = CACHE.get(cacheKey)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return NextResponse.json(cached.data)
  }

  try {
    const supabase = await createServerSupabaseClient()
    const products = await searchLocalProducts(supabase, query, barcode, category)

    const result = {
      products,
      count: products.length,
    }

    CACHE.set(cacheKey, { data: result, timestamp: Date.now() })
    return NextResponse.json(result)
  } catch (error) {
    console.error('Food search error:', error)
    return NextResponse.json({ products: [], error: 'Zoeken mislukt' }, { status: 500 })
  }
}

async function searchLocalProducts(
  supabase: any,
  query?: string | null,
  barcode?: string | null,
  category?: string | null
) {
  // Barcode lookup — exact match
  if (barcode) {
    const { data, error } = await supabase
      .from('food_products')
      .select('*')
      .eq('barcode', barcode)

    if (error) {
      console.error('Barcode search error:', error)
      return []
    }

    return (data || []).map(mapLocalProduct)
  }

  // Text search
  if (query) {
    // Split query into words for better matching
    const words = query.toLowerCase().split(/\s+/).filter(w => w.length >= 2)

    let q = supabase
      .from('food_products')
      .select('*')

    if (category) {
      q = q.eq('category', category)
    }

    // Search across name, name_nl, and brand
    if (words.length === 1) {
      q = q.or(`name.ilike.%${words[0]}%,name_nl.ilike.%${words[0]}%,brand.ilike.%${words[0]}%`)
    } else {
      // Multi-word: all words must match somewhere in name or name_nl
      const conditions = words.map(w =>
        `name.ilike.%${w}%,name_nl.ilike.%${w}%,brand.ilike.%${w}%`
      ).join(',')
      q = q.or(conditions)
    }

    // Order: popular first, then by name
    q = q.order('is_popular', { ascending: false })
      .order('name')
      .limit(30)

    const { data, error } = await q

    if (error) {
      console.error('Text search error:', error)
      return []
    }

    // For multi-word queries, filter client-side for better relevance
    let results = (data || []).map(mapLocalProduct)

    if (words.length > 1) {
      results = results.filter((p: any) => {
        const searchable = `${p.name} ${p.brand || ''}`.toLowerCase()
        return words.every(w => searchable.includes(w))
      })
    }

    return results
  }

  return []
}

// POST: Add custom product (client-created)
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })
    }

    const body = await request.json()
    const { name, brand, barcode: productBarcode, category, serving_size_g, serving_label, per100g } = body

    if (!name || !per100g?.calories) {
      return NextResponse.json({ error: 'Naam en calorieën zijn verplicht' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('food_products')
      .insert({
        name,
        name_nl: name,
        brand: brand || null,
        brand_category: 'supermarket',
        source: 'manual',
        barcode: productBarcode || null,
        category: category || 'snack',
        serving_size_g: serving_size_g || 100,
        serving_label: serving_label || '100g',
        calories_per_100g: per100g.calories,
        protein_per_100g: per100g.protein || 0,
        carbs_per_100g: per100g.carbs || 0,
        fat_per_100g: per100g.fat || 0,
        fiber_per_100g: per100g.fiber || 0,
        sugar_per_100g: per100g.sugar || 0,
        is_verified: false,
        is_popular: false,
      })
      .select()
      .single()

    if (error) {
      console.error('Insert product error:', error)
      return NextResponse.json({ error: 'Product opslaan mislukt' }, { status: 500 })
    }

    return NextResponse.json({ product: mapLocalProduct(data) })
  } catch (error) {
    console.error('POST food error:', error)
    return NextResponse.json({ error: 'Server fout' }, { status: 500 })
  }
}

function mapLocalProduct(p: any) {
  return {
    source: 'local' as const,
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
