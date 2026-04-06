import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

// Food search: local Supabase only (980+ products)
// Fuzzy search: handles typos, accents, spacing, case-insensitive

const CACHE = new Map<string, { data: any; timestamp: number }>()
const CACHE_TTL = 1000 * 60 * 30 // 30 minutes

// ── Fuzzy search helpers ──────────────────────────────────────

/** Strip diacritics/accents: café → cafe, crème → creme */
function stripAccents(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

/** Normalize text for comparison: lowercase, strip accents, collapse whitespace */
function normalize(s: string): string {
  return stripAccents(s).toLowerCase().replace(/[-_]/g, ' ').replace(/\s+/g, ' ').trim()
}

/** Generate search variants for a word to catch common typos/alternates */
function getSearchVariants(word: string): string[] {
  const variants = [word]
  // Dutch common substitutions
  const subs: [string, string][] = [
    ['ei', 'ij'], ['ij', 'ei'],
    ['ou', 'au'], ['au', 'ou'],
    ['c', 'k'], ['k', 'c'],
    ['ph', 'f'], ['f', 'ph'],
    ['th', 't'], ['t', 'th'],
    ['oe', 'u'], ['u', 'oe'],
    ['ie', 'i'], ['i', 'ie'],
    ['dt', 't'], ['t', 'dt'],
    ['sch', 'sh'], ['sh', 'sch'],
  ]
  for (const [from, to] of subs) {
    if (word.includes(from)) {
      variants.push(word.replace(from, to))
    }
  }
  return [...new Set(variants)]
}

/** Simple trigram similarity (0-1) between two strings */
function trigramSimilarity(a: string, b: string): number {
  if (a === b) return 1
  if (a.length < 2 || b.length < 2) return 0

  const trigramsOf = (s: string) => {
    const t = new Set<string>()
    const padded = ` ${s} `
    for (let i = 0; i < padded.length - 2; i++) {
      t.add(padded.slice(i, i + 3))
    }
    return t
  }

  const tA = trigramsOf(a)
  const tB = trigramsOf(b)
  let intersection = 0
  Array.from(tA).forEach(t => {
    if (tB.has(t)) intersection++
  })
  return intersection / Math.max(tA.size, tB.size)
}

/** Score how well a product matches the search query (0-100) */
function fuzzyScore(product: { name: string; brand?: string | null }, queryWords: string[]): number {
  const searchable = normalize(`${product.name} ${product.brand || ''}`)
  const searchableWords = searchable.split(/\s+/)
  let totalScore = 0

  for (const qWord of queryWords) {
    let bestWordScore = 0

    // Exact substring match = best
    if (searchable.includes(qWord)) {
      bestWordScore = 100
    } else {
      // Check each word in the product for trigram similarity
      for (const sWord of searchableWords) {
        // Starts-with match
        if (sWord.startsWith(qWord) || qWord.startsWith(sWord)) {
          bestWordScore = Math.max(bestWordScore, 85)
          continue
        }
        // Trigram similarity for typo tolerance
        const sim = trigramSimilarity(qWord, sWord)
        if (sim > 0.25) {
          bestWordScore = Math.max(bestWordScore, sim * 80)
        }
      }
    }

    totalScore += bestWordScore
  }

  // Average across all query words
  const avgScore = totalScore / queryWords.length

  // Bonus for exact name start match
  if (searchable.startsWith(queryWords[0])) {
    return Math.min(100, avgScore + 10)
  }

  return avgScore
}

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
      const response = NextResponse.json({ products: (data || []).map(mapLocalProduct), count: data?.length || 0 })
      response.headers.set('Cache-Control', 'public, max-age=3600, stale-while-revalidate=86400')
      return response
    } catch (err) {
      console.error('Popular products error:', err)
      return NextResponse.json({ products: [] })
    }
  }

  const cacheKey = `${barcode || ''}:${normalize(query || '')}:${category || ''}`
  const cached = CACHE.get(cacheKey)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    const response = NextResponse.json(cached.data)
    response.headers.set('Cache-Control', 'public, max-age=3600, stale-while-revalidate=86400')
    return response
  }

  try {
    const supabase = await createServerSupabaseClient()
    const products = await searchLocalProducts(supabase, query, barcode, category)

    const result = {
      products,
      count: products.length,
    }

    CACHE.set(cacheKey, { data: result, timestamp: Date.now() })
    const response = NextResponse.json(result)
    response.headers.set('Cache-Control', 'public, max-age=3600, stale-while-revalidate=86400')
    return response
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

  // Text search with fuzzy matching
  if (query) {
    const normalizedQuery = normalize(query)
    const words = normalizedQuery.split(/\s+/).filter(w => w.length >= 2)
    if (words.length === 0) return []

    // Generate search variants for each word (handles common Dutch substitutions)
    const allVariants = words.flatMap(w => getSearchVariants(w))
    const uniqueVariants = Array.from(new Set(allVariants))

    // Build broad OR query to cast a wide net — we'll score & filter client-side
    let q = supabase
      .from('food_products')
      .select('*')

    if (category) {
      q = q.eq('category', category)
    }

    // Search with all variants across name, name_nl, and brand
    const conditions = uniqueVariants.map(v =>
      `name.ilike.%${v}%,name_nl.ilike.%${v}%,brand.ilike.%${v}%`
    ).join(',')
    q = q.or(conditions)

    // Fetch more results for client-side fuzzy ranking
    q = q.limit(80)

    const { data, error } = await q

    if (error) {
      console.error('Text search error:', error)
      return []
    }

    // Score and rank results client-side with fuzzy matching
    const scored = (data || []).map((p: any) => {
      const mapped = mapLocalProduct(p)
      const score = fuzzyScore(
        { name: p.name || '', brand: p.brand },
        words
      )
      return { ...mapped, _score: score, _popular: p.is_popular }
    })

    // Filter: require minimum score (allows typos but not garbage)
    const MIN_SCORE = 30
    const filtered = scored.filter((p: any) => p._score >= MIN_SCORE)

    // Sort: popular items get a boost, then by score
    filtered.sort((a: any, b: any) => {
      const aBoost = a._popular ? 10 : 0
      const bBoost = b._popular ? 10 : 0
      return (b._score + bBoost) - (a._score + aBoost)
    })

    // Return top 30, strip internal scoring fields
    return filtered.slice(0, 30).map(({ _score, _popular, ...rest }: any) => rest)
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
  // serving_size MUST be string — UI calls .match() on it
  const servingSize = p.serving_size_g
    ? `${p.serving_size_g}g`
    : (typeof p.serving_size === 'string' ? p.serving_size : null)

  return {
    source: 'local' as const,
    barcode: p.barcode || null,
    name: p.name || 'Onbekend',
    brand: p.brand || null,
    image_small: p.image_url || null,
    image: p.image_url || null,
    serving_size: servingSize,
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
